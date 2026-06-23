import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { ThemeToggle } from '../components/ThemeToggle';
import { 
  Search, ShieldAlert, Trash2, 
  MapPin, CheckCircle2, RefreshCw, ShoppingCart, LogOut, KeyRound
} from 'lucide-react';

interface Cliente {
  id: string;
  codigo_cliente: string;
  nome_cliente: string;
  canal: string;
  subcanal: string;
  ativo: boolean;
}

interface ColetaItem {
  produtoId: string;
  produtoNome: string;
  familiaNome: string;
  marcaNome: string;
  estoque: number;
  unidadeMedida: string;
  precoUnidade: number | null;
  precoCaixaVarejo: number | null;
  precoCaixaAtacado: number | null;
  observacao: string;
}

export const PesquisaFluxo: React.FC = () => {
  const { profile, signOut } = useAuth();
  
  // Operational phase: 'buscar_cliente' | 'pesquisando' | 'sucesso'
  const [phase, setPhase] = useState<'buscar_cliente' | 'pesquisando' | 'sucesso'>('buscar_cliente');
  
  // Step in the product collection: 1 (Family) | 2 (Brand) | 3 (Product & Values)
  const [surveyStep, setSurveyStep] = useState<1 | 2 | 3>(1);

  // Search client state
  const [searchCodigo, setSearchCodigo] = useState('');
  const [clientFound, setClientFound] = useState<Cliente | null>(null);
  const [matchingClients, setMatchingClients] = useState<Cliente[]>([]);
  const [suggestions, setSuggestions] = useState<Cliente[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Tab control
  const [activeSubTab, setActiveSubTab] = useState<'nova' | 'historico' | 'pendentes'>('nova');

  // Offline & Pending State
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [offlineSuccess, setOfflineSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // History state
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedSurveyDetails, setSelectedSurveyDetails] = useState<any | null>(null);

  // Load local pending surveys
  const loadPendingSurveys = () => {
    try {
      const existing = localStorage.getItem('pending_pesquisas');
      const list = existing ? JSON.parse(existing) : [];
      setPendingList(list);
      setPendingCount(list.length);
    } catch (e) {
      console.error('Error loading pending surveys:', e);
    }
  };

  const savePendingSurveyLocally = (surveyData: any) => {
    try {
      const existing = localStorage.getItem('pending_pesquisas');
      const pendingList = existing ? JSON.parse(existing) : [];
      pendingList.push(surveyData);
      localStorage.setItem('pending_pesquisas', JSON.stringify(pendingList));
      setPendingCount(pendingList.length);
      setPendingList(pendingList);
    } catch (err) {
      console.error('Error saving pending survey locally:', err);
    }
  };

  const syncPendingSurveysSilently = async (list: any[]) => {
    if (isSyncingRef.current) return;
    if (list.length === 0) return;
    isSyncingRef.current = true;
    let successCount = 0;
    const remainingList: any[] = [];

    try {
      for (const survey of list) {
        try {
          const { data: pesquisaObj, error: pError } = await supabase
            .from('pesquisas')
            .insert({
              usuario_id: survey.usuario_id,
              cliente_id: survey.cliente_id,
              latitude: survey.latitude,
              longitude: survey.longitude,
              gps_precisao: survey.gps_precisao,
              data_hora: survey.data_hora
            })
            .select()
            .single();

          if (pError) throw pError;

          const itemsToInsert = survey.itens.map((item: any) => ({
            pesquisa_id: pesquisaObj.id,
            produto_id: item.produto_id,
            estoque: item.estoque,
            unidade_medida: item.unidade_medida,
            preco_unidade: item.preco_unidade,
            preco_caixa_varejo: item.preco_caixa_varejo,
            preco_caixa_atacado: item.preco_caixa_atacado,
            observacao: item.observacao
          }));

          const { error: iError } = await supabase
            .from('pesquisa_itens')
            .insert(itemsToInsert);

          if (iError) throw iError;
          successCount++;
        } catch (err) {
          console.error('Silent sync error:', err);
          remainingList.push(survey);
        }
      }

      localStorage.setItem('pending_pesquisas', JSON.stringify(remainingList));
      setPendingList(remainingList);
      setPendingCount(remainingList.length);

      if (successCount > 0) {
        alert(`Sinal restabelecido! Sincronizamos automaticamente ${successCount} pesquisa(s) no servidor.`);
      }
    } finally {
      isSyncingRef.current = false;
    }
  };

  const syncPendingSurveys = async () => {
    if (isSyncingRef.current) return;
    const list = JSON.parse(localStorage.getItem('pending_pesquisas') || '[]');
    if (list.length === 0) return;

    if (!navigator.onLine) {
      alert('Você está offline. Conecte-se à internet para sincronizar.');
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncStatus('Sincronizando pesquisas pendentes...');

    let successCount = 0;
    const remainingList: any[] = [];

    try {
      for (const survey of list) {
        try {
          const { data: pesquisaObj, error: pError } = await supabase
            .from('pesquisas')
            .insert({
              usuario_id: survey.usuario_id,
              cliente_id: survey.cliente_id,
              latitude: survey.latitude,
              longitude: survey.longitude,
              gps_precisao: survey.gps_precisao,
              data_hora: survey.data_hora
            })
            .select()
            .single();

          if (pError) throw pError;

          const itemsToInsert = survey.itens.map((item: any) => ({
            pesquisa_id: pesquisaObj.id,
            produto_id: item.produto_id,
            estoque: item.estoque,
            unidade_medida: item.unidade_medida,
            preco_unidade: item.preco_unidade,
            preco_caixa_varejo: item.preco_caixa_varejo,
            preco_caixa_atacado: item.preco_caixa_atacado,
            observacao: item.observacao
          }));

          const { error: iError } = await supabase
            .from('pesquisa_itens')
            .insert(itemsToInsert);

          if (iError) throw iError;
          successCount++;
        } catch (err) {
          console.error('Error syncing survey:', survey, err);
          remainingList.push(survey);
        }
      }

      localStorage.setItem('pending_pesquisas', JSON.stringify(remainingList));
      setPendingList(remainingList);
      setPendingCount(remainingList.length);

      if (successCount > 0) {
        alert(`Sincronização concluída: ${successCount} pesquisa(s) enviada(s) com sucesso!`);
      }
      if (remainingList.length > 0) {
        alert(`Aviso: ${remainingList.length} pesquisa(s) falharam no envio e permanecem na fila local.`);
      }
    } finally {
      setIsSyncing(false);
      setSyncStatus(null);
      isSyncingRef.current = false;
    }
  };

  // Load static lists on component mount with caching
  useEffect(() => {
    const loadStaticData = async () => {
      // 1. Try to load from localStorage first
      try {
        const cachedFamilias = localStorage.getItem('cached_familias');
        const cachedMarcas = localStorage.getItem('cached_marcas');
        const cachedProdutos = localStorage.getItem('cached_produtos');
        if (cachedFamilias) setFamilias(JSON.parse(cachedFamilias));
        if (cachedMarcas) setMarcas(JSON.parse(cachedMarcas));
        if (cachedProdutos) setProdutos(JSON.parse(cachedProdutos));
      } catch (e) {
        console.error('Error parsing cached static data:', e);
      }

      // Load pending surveys list
      loadPendingSurveys();

      // 2. Fetch fresh online data and save to cache
      try {
        const [fRes, mRes, pRes, cRes] = await Promise.all([
          supabase.from('familias').select('*').order('nome'),
          supabase.from('marcas').select('*').order('nome'),
          supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
          supabase.from('clientes').select('*').eq('ativo', true).order('nome_cliente')
        ]);
        
        if (!fRes.error && fRes.data) {
          setFamilias(fRes.data);
          localStorage.setItem('cached_familias', JSON.stringify(fRes.data));
        }
        if (!mRes.error && mRes.data) {
          setMarcas(mRes.data);
          localStorage.setItem('cached_marcas', JSON.stringify(mRes.data));
        }
        if (!pRes.error && pRes.data) {
          setProdutos(pRes.data);
          localStorage.setItem('cached_produtos', JSON.stringify(pRes.data));
        }
        if (!cRes.error && cRes.data) {
          localStorage.setItem('cached_clientes', JSON.stringify(cRes.data));
        }
      } catch (err) {
        console.error('Error loading fresh static data:', err);
      }
    };
    loadStaticData();

    // Event listener for online status to auto-sync
    const handleOnline = () => {
      const existing = localStorage.getItem('pending_pesquisas');
      if (existing) {
        const list = JSON.parse(existing);
        if (list.length > 0) {
          syncPendingSurveysSilently(list);
        }
      }
    };

    window.addEventListener('online', handleOnline);

    // Polling fallback: check connection and sync every 15 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        const existing = localStorage.getItem('pending_pesquisas');
        if (existing) {
          const list = JSON.parse(existing);
          if (list.length > 0) {
            syncPendingSurveysSilently(list);
          }
        }
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, []);

  // Suggestions search logic with cache fallback
  useEffect(() => {
    const searchVal = searchCodigo.trim();
    if (searchVal.length < 2) {
      setSuggestions([]);
      return;
    }
    if (searchVal.includes('(') && searchVal.includes(')')) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      const searchLocalCache = () => {
        try {
          const cached = localStorage.getItem('cached_clientes');
          if (cached) {
            const list: Cliente[] = JSON.parse(cached);
            const lowerSearch = searchVal.toLowerCase();
            const filtered = list.filter(c => 
              c.ativo && 
              (c.nome_cliente.toLowerCase().includes(lowerSearch) || 
               c.codigo_cliente.toLowerCase().includes(lowerSearch))
            ).slice(0, 10);
            setSuggestions(filtered);
          }
        } catch (e) {
          console.error('Error filtering suggestions offline:', e);
        }
      };

      if (!navigator.onLine) {
        searchLocalCache();
        return;
      }

      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('ativo', true)
          .or(`nome_cliente.ilike.%${searchVal}%,codigo_cliente.ilike.%${searchVal}%`)
          .limit(10);

        if (!error && data) {
          setSuggestions(data as Cliente[]);
        } else {
          searchLocalCache();
        }
      } catch (err) {
        console.error('Error fetching suggestions, using local cache:', err);
        searchLocalCache();
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchCodigo]);

  // Update password in Supabase Auth
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      setPasswordError(err.message || 'Erro ao atualizar a senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Support lists from DB
  const [familias, setFamilias] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);

  // Selected values for current item
  const [selectedFamilia, setSelectedFamilia] = useState<any>(null);
  const [selectedMarca, setSelectedMarca] = useState<any>(null);
  const [selectedProdutoId, setSelectedProdutoId] = useState('');
  
  // Form fields for current product item
  const [estoque, setEstoque] = useState('');
  const [unidadeMedida, setUnidadeMedida] = useState<string>('Caixa');
  const [precoUnidade, setPrecoUnidade] = useState('');
  const [precoCaixaVarejo, setPrecoCaixaVarejo] = useState('');
  const [precoCaixaAtacado, setPrecoCaixaAtacado] = useState('');
  const [observacao, setObservacao] = useState('');

  // Cart of products collected in this visit
  const [basket, setBasket] = useState<ColetaItem[]>([]);
  
  // GPS state
  const [gpsData, setGpsData] = useState<{ latitude: number | null, longitude: number | null, precisao: number | null }>({
    latitude: null,
    longitude: null,
    precisao: null
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);

  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Start survey
  const startSurvey = () => {
    if (!clientFound) return;
    
    // Fetch GPS coordinates eagerly when starting survey
    captureGps();
    setPhase('pesquisando');
    setSurveyStep(1);
    setBasket([]);
  };

  // GPS Capture
  const captureGps = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('GPS não suportado neste navegador.');
      return;
    }

    setGpsLoading(true);
    setGpsStatusMsg('Obtendo localização GPS...');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          precisao: position.coords.accuracy
        });
        setGpsLoading(false);
        setGpsStatusMsg(`GPS OK (Precisão: ${Math.round(position.coords.accuracy)}m)`);
      },
      (error) => {
        console.warn('GPS Error:', error);
        setGpsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsStatusMsg('GPS bloqueado pelo usuário.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsStatusMsg('Sinal de GPS indisponível.');
            break;
          case error.TIMEOUT:
            setGpsStatusMsg('Tempo esgotado ao buscar GPS.');
            break;
          default:
            setGpsStatusMsg('Erro ao obter GPS.');
            break;
        }
      },
      options
    );
  };

  // Client search handler
  const handleSearchClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setClientFound(null);
    setMatchingClients([]);
    
    let term = searchCodigo.trim();
    // Parse out CODE if format is "Name (CODE)"
    const match = term.match(/\(([^)]+)\)$/);
    if (match) {
      term = match[1];
    }
    
    const code = term.toUpperCase();

    if (!code) {
      setSearchError('Digite o código ou nome do cliente.');
      return;
    }

    const searchLocalCache = () => {
      try {
        const cached = localStorage.getItem('cached_clientes');
        if (!cached) {
          setSearchError('Cliente não encontrado e sem cache local disponível.');
          return false;
        }
        const list: Cliente[] = JSON.parse(cached);
        // Try exact code first
        let matches = list.filter(c => c.ativo && c.codigo_cliente.toUpperCase() === code);
        if (matches.length === 0) {
          // Try partial name match
          const lowerTerm = term.toLowerCase();
          matches = list.filter(c => c.ativo && c.nome_cliente.toLowerCase().includes(lowerTerm));
        }

        if (matches.length === 0) {
          setSearchError('Cliente não encontrado (Modo Offline).');
          return false;
        }

        if (matches.length === 1) {
          setClientFound(matches[0]);
          setSuggestions([]);
        } else {
          setMatchingClients(matches);
          setSuggestions([]);
        }
        return true;
      } catch (err) {
        console.error('Error searching local cache:', err);
        setSearchError('Erro ao buscar no cache local.');
        return false;
      }
    };

    if (!navigator.onLine) {
      searchLocalCache();
      return;
    }

    try {
      setIsSearching(true);
      // Try search by exact code first
      let { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('codigo_cliente', code);

      if (error) throw error;

      // Fallback: search by name
      if (!data || data.length === 0) {
        const { data: nameData, error: nameError } = await supabase
          .from('clientes')
          .select('*')
          .ilike('nome_cliente', `%${term}%`);

        if (nameError) throw nameError;
        data = nameData;
      }

      if (!data || data.length === 0) {
        if (!searchLocalCache()) {
          setSearchError('Cliente não encontrado.');
        }
        return;
      }

      // Filter active ones
      const activeMatches = data.filter(c => c.ativo);
      if (activeMatches.length === 0) {
        setSearchError('Os clientes correspondentes encontrados estão inativos.');
        return;
      }

      if (activeMatches.length === 1) {
        setClientFound(activeMatches[0] as Cliente);
        setSuggestions([]);
      } else {
        // Multiple matches found!
        setMatchingClients(activeMatches as Cliente[]);
        setSuggestions([]);
      }
    } catch (err: any) {
      console.warn('Search failed, trying local cache:', err);
      if (!searchLocalCache()) {
        setSearchError(`Erro na busca: ${err.message || err}`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Step 1: Select Family
  const handleSelectFamilia = (fam: any) => {
    setSelectedFamilia(fam);
    setSurveyStep(2);
  };

  // Step 2: Select Brand
  const handleSelectMarca = (mrc: any) => {
    setSelectedMarca(mrc);
    setSurveyStep(3);
  };

  // Dynamic filter for Step 3 products based on Family and Brand selected
  const filteredProducts = produtos.filter(
    (p) => p.familia_id === selectedFamilia?.id && p.marca_id === selectedMarca?.id
  );

  // Dynamic filter for Step 2 brands based on selected Family having at least one active product
  const availableMarcas = marcas.filter(m => 
    produtos.some(p => p.marca_id === m.id && p.familia_id === selectedFamilia?.id)
  );

  // Auto-select first product if any
  useEffect(() => {
    if (surveyStep === 3 && filteredProducts.length > 0) {
      setSelectedProdutoId(filteredProducts[0].id);
    } else {
      setSelectedProdutoId('');
    }
  }, [surveyStep, selectedFamilia, selectedMarca]);

  // Add Item to basket
  const handleAddToBasket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdutoId) {
      alert('Nenhum produto selecionado para esta marca/família.');
      return;
    }

    const targetProd = produtos.find(p => p.id === selectedProdutoId);
    if (!targetProd) return;

    const estNum = parseInt(estoque, 10);
    if (isNaN(estNum) || estNum < 0) {
      alert('Estoque deve ser um número inteiro válido (>= 0).');
      return;
    }

    // Parse price fields, supporting optional inputs (empty string = null)
    let pUni: number | null = null;
    if (precoUnidade.trim()) {
      const parsed = parseFloat(precoUnidade.trim().replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        alert('Preço Unidade inválido.');
        return;
      }
      pUni = parsed;
    }

    let pVarejo: number | null = null;
    if (precoCaixaVarejo.trim()) {
      const parsed = parseFloat(precoCaixaVarejo.trim().replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        alert('Preço Caixa Varejo inválido.');
        return;
      }
      pVarejo = parsed;
    }

    let pAtacado: number | null = null;
    if (precoCaixaAtacado.trim()) {
      const parsed = parseFloat(precoCaixaAtacado.trim().replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        alert('Preço Caixa Atacado inválido.');
        return;
      }
      pAtacado = parsed;
    }

    // Must have at least one price filled
    if (pUni === null && pVarejo === null && pAtacado === null) {
      alert('É necessário preencher pelo menos um dos campos de preço (Unidade, Caixa Varejo ou Caixa Atacado).');
      return;
    }

    const newItem: ColetaItem = {
      produtoId: targetProd.id,
      produtoNome: targetProd.nome,
      familiaNome: selectedFamilia.nome,
      marcaNome: selectedMarca.nome,
      estoque: estNum,
      unidadeMedida,
      precoUnidade: pUni,
      precoCaixaVarejo: pVarejo,
      precoCaixaAtacado: pAtacado,
      observacao: observacao.trim()
    };

    // Push item to basket state
    setBasket([...basket, newItem]);

    // Reset steps and variables for next item
    setSelectedFamilia(null);
    setSelectedMarca(null);
    setSelectedProdutoId('');
    setEstoque('');
    setUnidadeMedida('Caixa');
    setPrecoUnidade('');
    setPrecoCaixaVarejo('');
    setPrecoCaixaAtacado('');
    setObservacao('');
    
    // Go back to step 1 to select next item
    setSurveyStep(1);
  };

  // Remove item from basket
  const handleRemoveFromBasket = (idx: number) => {
    setBasket(basket.filter((_, i) => i !== idx));
  };

  // Finalize survey and push to Supabase (offline-first)
  const handleFinalizeSurvey = async () => {
    if (basket.length === 0) {
      alert('Adicione pelo menos um produto antes de finalizar a pesquisa.');
      return;
    }

    if (!clientFound || !profile) return;

    const localSurveyId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const surveyPayload = {
      id: localSurveyId,
      usuario_id: profile.id,
      cliente_id: clientFound.id,
      cliente_nome: clientFound.nome_cliente,
      cliente_codigo: clientFound.codigo_cliente,
      cliente_canal: clientFound.canal,
      cliente_subcanal: clientFound.subcanal,
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      gps_precisao: gpsData.precisao,
      data_hora: new Date().toISOString(),
      itens: basket.map(item => ({
        produto_id: item.produtoId,
        produto_nome: item.produtoNome,
        estoque: item.estoque,
        unidade_medida: item.unidadeMedida,
        preco_unidade: item.precoUnidade,
        preco_caixa_varejo: item.precoCaixaVarejo,
        preco_caixa_atacado: item.precoCaixaAtacado,
        observacao: item.observacao || null
      }))
    };

    // If offline, save locally
    if (!navigator.onLine) {
      savePendingSurveyLocally(surveyPayload);
      setPhase('sucesso');
      setOfflineSuccess(true);
      return;
    }

    try {
      setLoadingSubmit(true);

      // 1. Create main research header
      const { data: pesquisaObj, error: pError } = await supabase
        .from('pesquisas')
        .insert({
          usuario_id: profile.id,
          cliente_id: clientFound.id,
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          gps_precisao: gpsData.precisao
        })
        .select()
        .single();

      if (pError) throw pError;

      // 2. Map items to relational structure
      const itemsToInsert = basket.map((item) => ({
        pesquisa_id: pesquisaObj.id,
        produto_id: item.produtoId,
        estoque: item.estoque,
        unidade_medida: item.unidadeMedida,
        preco_unidade: item.precoUnidade,
        preco_caixa_varejo: item.precoCaixaVarejo,
        preco_caixa_atacado: item.precoCaixaAtacado,
        observacao: item.observacao || null
      }));

      // 3. Batch insert items
      const { error: iError } = await supabase
        .from('pesquisa_itens')
        .insert(itemsToInsert);

      if (iError) throw iError;

      setOfflineSuccess(false);
      setPhase('sucesso');
    } catch (err: any) {
      console.warn('Falha ao enviar para o servidor, salvando offline como backup:', err);
      savePendingSurveyLocally(surveyPayload);
      setOfflineSuccess(true);
      setPhase('sucesso');
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Reset all states and start again
  const handleReset = () => {
    setSearchCodigo('');
    setClientFound(null);
    setMatchingClients([]);
    setSuggestions([]);
    setSearchError(null);
    setBasket([]);
    setGpsData({ latitude: null, longitude: null, precisao: null });
    setGpsStatusMsg(null);
    setPhase('buscar_cliente');
  };

  // Load History from Supabase
  const loadHistory = async () => {
    if (!profile) return;
    setLoadingHistory(true);
    try {
      const startISO = new Date(startDate + 'T00:00:00').toISOString();
      const endISO = new Date(endDate + 'T23:59:59').toISOString();

      const { data, error } = await supabase
        .from('pesquisas')
        .select(`
          *,
          clientes (id, nome_cliente, codigo_cliente, canal, subcanal),
          pesquisa_itens (
            *,
            produtos (id, nome)
          )
        `)
        .eq('usuario_id', profile.id)
        .gte('data_hora', startISO)
        .lte('data_hora', endISO)
        .order('data_hora', { ascending: false });

      if (error) throw error;
      setHistoryList(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
      alert('Erro ao carregar histórico.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Reload history automatically if date filter changes
  useEffect(() => {
    if (activeSubTab === 'historico') {
      loadHistory();
    }
  }, [startDate, endDate, activeSubTab]);

  return (
    <div className="app-container animate-fade" style={{ position: 'relative', overflowX: 'hidden' }}>
      
      {/* Background decoration blobs */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        left: '-50px',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Premium Glass Mini-Header */}
      <div 
        className="glass-panel" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '20px', 
          padding: '12px 16px',
          borderRadius: 'var(--border-radius-md)',
          position: 'relative',
          zIndex: 5
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            padding: '4px'
          }}>
            <img src="/img/Logo Guaracamp.png" alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <span className="badge badge-vendedor" style={{ marginBottom: '2px', fontSize: '0.65rem', padding: '1px 6px' }}>Campo</span>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '700', lineHeight: 1.2 }}>{profile?.nome}</h2>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ThemeToggle />
          <button 
            onClick={() => setShowPasswordModal(true)} 
            className="btn btn-secondary" 
            style={{ 
              width: '38px', 
              height: '38px', 
              minHeight: 'auto', 
              padding: 0, 
              borderRadius: 'var(--border-radius-full)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'var(--bg-secondary)'
            }}
            title="Alterar Senha"
          >
            <KeyRound size={16} color="var(--primary)" />
          </button>
          <button 
            onClick={signOut} 
            className="btn btn-secondary" 
            style={{ 
              width: '38px', 
              height: '38px', 
              minHeight: 'auto', 
              padding: 0, 
              borderRadius: 'var(--border-radius-full)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'rgba(239, 68, 68, 0.2)'
            }}
            title="Sair"
          >
            <LogOut size={16} className="text-danger" />
          </button>
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div 
        className="glass-panel" 
        style={{ 
          display: 'flex', 
          padding: '4px', 
          marginBottom: '20px',
          borderRadius: 'var(--border-radius-md)',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          zIndex: 5
        }}
      >
        <button
          onClick={() => setActiveSubTab('nova')}
          style={{
            flex: 1,
            padding: '10px 4px',
            borderRadius: 'calc(var(--border-radius-md) - 4px)',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'nova' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'nova' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeSubTab === 'nova' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
            transition: 'all var(--transition-normal)'
          }}
        >
          Nova Pesquisa
        </button>
        <button
          onClick={() => {
            setActiveSubTab('historico');
            loadHistory();
          }}
          style={{
            flex: 1,
            padding: '10px 4px',
            borderRadius: 'calc(var(--border-radius-md) - 4px)',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'historico' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'historico' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeSubTab === 'historico' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
            transition: 'all var(--transition-normal)'
          }}
        >
          Histórico
        </button>
        <button
          onClick={() => {
            setActiveSubTab('pendentes');
            loadPendingSurveys();
          }}
          style={{
            flex: 1,
            padding: '10px 4px',
            borderRadius: 'calc(var(--border-radius-md) - 4px)',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'pendentes' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'pendentes' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeSubTab === 'pendentes' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
            transition: 'all var(--transition-normal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          Pendentes
          {pendingCount > 0 && (
            <span style={{
              backgroundColor: 'var(--danger)',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: '800',
              padding: '2px 6px',
              borderRadius: 'var(--border-radius-full)',
              minWidth: '20px',
              textAlign: 'center',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'nova' && (
        <div style={{ position: 'relative', zIndex: 5 }}>
          {/* PHASE 1: SEARCH CUSTOMER */}
          {phase === 'buscar_cliente' && (
            <div className="animate-fade">
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', fontWeight: '700' }}>Localizar Cliente</h3>
                <form onSubmit={handleSearchClient} style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} color="var(--primary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Nome do cliente ou código..."
                      value={searchCodigo}
                      onChange={(e) => {
                        setSearchCodigo(e.target.value);
                        if (clientFound) setClientFound(null);
                      }}
                      disabled={isSearching}
                      style={{ paddingLeft: '44px', height: '48px' }}
                      autoComplete="off"
                    />

                    {/* Autocomplete Suggestions Dropdown */}
                    {suggestions.length > 0 && (
                      <div 
                        className="glass-panel"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          borderRadius: 'var(--border-radius-md)',
                          boxShadow: 'var(--shadow-lg)',
                          zIndex: 20,
                          maxHeight: '260px',
                          overflowY: 'auto',
                          marginTop: '6px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {suggestions.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setClientFound(c);
                              setSearchCodigo(`${c.nome_cliente} (${c.codigo_cliente})`);
                              setSuggestions([]);
                              setSearchError(null);
                            }}
                            className="suggestion-item"
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid var(--border-color)',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.nome_cliente}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Cód: {c.codigo_cliente}</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <span className="badge badge-admin" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{c.canal}</span>
                                <span className="badge badge-vendedor" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{c.subcanal}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: 'auto', minHeight: '48px', padding: '0 22px' }}
                    disabled={isSearching}
                  >
                    {isSearching ? <RefreshCw className="spin" size={18} /> : 'Buscar'}
                  </button>
                </form>

                {searchError && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'var(--danger)',
                    fontSize: '0.875rem',
                    marginTop: '16px',
                    backgroundColor: 'var(--danger-light)',
                    padding: '12px 14px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid rgba(239, 68, 68, 0.15)'
                  }}>
                    <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: '500' }}>{searchError}</span>
                  </div>
                )}
              </div>

              {/* Multiple Matching Clients */}
              {matchingClients.length > 1 && (
                <div className="card animate-fade" style={{ borderLeft: '5px solid var(--warning)', padding: '20px' }}>
                  <h4 className="text-secondary text-xs font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'left' }}>
                    Clientes Encontrados ({matchingClients.length})
                  </h4>
                  <p className="text-secondary text-xs" style={{ marginBottom: '16px', textAlign: 'left', lineHeight: '1.5' }}>
                    Código associado a múltiplos canais. Escolha o estabelecimento correto abaixo:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {matchingClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          if (!c.ativo) {
                            alert('Este cliente está inativo no sistema.');
                          } else {
                            setClientFound(c);
                            setMatchingClients([]);
                          }
                        }}
                        className="btn btn-secondary"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          padding: '14px 18px',
                          height: 'auto',
                          minHeight: 'auto',
                          opacity: c.ativo ? 1 : 0.55,
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-secondary)',
                          textAlign: 'left'
                        }}
                      >
                        <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{c.nome_cliente}</div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                          <span className="badge badge-admin" style={{ fontSize: '0.65rem' }}>{c.canal}</span>
                          <span className="badge badge-vendedor" style={{ fontSize: '0.65rem' }}>{c.subcanal}</span>
                          {!c.ativo && <span className="badge badge-concorrente" style={{ fontSize: '0.65rem' }}>Inativo</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Details Found */}
              {clientFound && (
                <div className="card animate-fade" style={{ borderLeft: '5px solid var(--success)', padding: '24px' }}>
                  <h4 className="text-secondary text-xs font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Cliente Selecionado
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: '800', lineHeight: 1.25, color: 'var(--text-primary)' }}>{clientFound.nome_cliente}</div>
                    <div className="text-sm text-secondary" style={{ fontWeight: '500' }}>
                      Código: <span className="font-bold text-primary-color" style={{ fontSize: '1rem' }}>{clientFound.codigo_cliente}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <span className="badge badge-admin">{clientFound.canal}</span>
                      <span className="badge badge-vendedor">{clientFound.subcanal}</span>
                    </div>
                  </div>
                  <button 
                    onClick={startSurvey} 
                    className="btn btn-primary" 
                    style={{ 
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                      height: '50px'
                    }} 
                    disabled={loadingSubmit}
                  >
                    {loadingSubmit ? (
                      <>
                        <RefreshCw className="spin" size={18} />
                        Iniciando...
                      </>
                    ) : 'Iniciar Pesquisa de Mercado'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PHASE 2: FILL RESEARCH */}
          {phase === 'pesquisando' && clientFound && (
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Client Header Info Banner */}
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '14px 18px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  borderRadius: 'var(--border-radius-md)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>{clientFound.nome_cliente}</div>
                  <div className="text-xs text-secondary font-semibold">Cód: {clientFound.codigo_cliente}</div>
                </div>
                
                {/* GPS HUD */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: 'var(--border-radius-full)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontWeight: '600'
                  }} 
                  className={gpsLoading ? 'text-secondary' : gpsData.latitude ? 'text-success' : 'text-danger'}
                >
                  <MapPin size={12} className={gpsLoading ? 'spin' : ''} />
                  <span>{gpsStatusMsg || 'Sem GPS'}</span>
                  {!gpsLoading && !gpsData.latitude && (
                    <button 
                      onClick={captureGps} 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        textDecoration: 'underline', 
                        cursor: 'pointer', 
                        marginLeft: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '700' 
                      }}
                    >
                      Recapturar
                    </button>
                  )}
                </div>
              </div>

              {/* WIZARD PROCESS BUBBLES */}
              <div className="step-indicator" style={{ padding: '0 8px' }}>
                <div className={`step-bubble ${surveyStep >= 1 ? (surveyStep > 1 ? 'step-bubble-completed' : 'step-bubble-active') : ''}`}>1</div>
                <div className={`step-bubble ${surveyStep >= 2 ? (surveyStep > 2 ? 'step-bubble-completed' : 'step-bubble-active') : ''}`}>2</div>
                <div className={`step-bubble ${surveyStep >= 3 ? 'step-bubble-active' : ''}`}>3</div>
              </div>

              {/* STEP 1: SELECT FAMILY */}
              {surveyStep === 1 && (
                <div className="animate-fade">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', textAlign: 'center', fontWeight: '700' }}>Passo 1: Escolha a Família</h3>
                  {familias.length === 0 ? (
                    <div className="card text-center py-4 text-secondary">Nenhuma família cadastrada.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {familias.map((fam) => (
                        <button 
                          key={fam.id} 
                          onClick={() => handleSelectFamilia(fam)} 
                          className="btn btn-secondary card-interactive" 
                          style={{ 
                            height: '56px', 
                            justifyContent: 'flex-start', 
                            paddingLeft: '20px',
                            fontWeight: '700',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)'
                          }}
                        >
                          <span style={{ color: 'var(--text-primary)' }}>{fam.nome}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: SELECT BRAND */}
              {surveyStep === 2 && (
                <div className="animate-fade">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', textAlign: 'center', fontWeight: '700' }}>Passo 2: Escolha a Marca</h3>
                  <p className="text-center text-xs text-secondary mb-4" style={{ fontWeight: '500' }}>
                    Família selecionada: <span className="font-bold text-primary-color">{selectedFamilia?.nome}</span>
                  </p>
                  {availableMarcas.length === 0 ? (
                    <div className="card text-center py-4 text-secondary">Não há marcas cadastradas nesta família.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {availableMarcas.map((mrc) => (
                        <button 
                          key={mrc.id} 
                          onClick={() => handleSelectMarca(mrc)} 
                          className="btn btn-secondary card-interactive" 
                          style={{ 
                            height: '56px', 
                            justifyContent: 'space-between', 
                            paddingLeft: '20px', 
                            paddingRight: '20px',
                            fontWeight: '700',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)'
                          }}
                        >
                          <span style={{ color: 'var(--text-primary)' }}>{mrc.nome}</span>
                          <span className={`badge ${mrc.eh_concorrente ? 'badge-concorrente' : 'badge-propria'}`} style={{ fontSize: '0.65rem' }}>
                            {mrc.eh_concorrente ? 'Concorrente' : 'Própria'}
                          </span>
                        </button>
                      ))}
                      <button onClick={() => setSurveyStep(1)} className="btn btn-text text-center mt-4" style={{ fontWeight: '700' }}>
                        Voltar para Famílias
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: SELECT PRODUCT & VALUES */}
              {surveyStep === 3 && (
                <div className="card animate-fade" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '2px', textAlign: 'center', fontWeight: '700' }}>Passo 3: Dados do Produto</h3>
                  <p className="text-center text-xs text-secondary mb-4" style={{ fontWeight: '600' }}>
                    {selectedFamilia?.nome} · <span className="text-primary-color">{selectedMarca?.nome}</span>
                  </p>

                  {filteredProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <p className="text-secondary text-sm mb-4">Nenhum produto cadastrado para esta seleção.</p>
                      <button type="button" onClick={() => setSurveyStep(2)} className="btn btn-secondary">
                        Voltar para Marcas
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleAddToBasket} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      
                      {/* Select Product Dropdown */}
                      <div className="form-group">
                        <label className="form-label">Nome do Produto</label>
                        <select 
                          className="input-field" 
                          value={selectedProdutoId} 
                          onChange={(e) => setSelectedProdutoId(e.target.value)}
                          required
                        >
                          {filteredProducts.map((p) => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                          ))}
                        </select>
                      </div>

                      {/* Estoque Field with Unit Type */}
                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label">Estoque Coletado</label>
                          <input 
                            type="number" 
                            inputMode="numeric" 
                            pattern="[0-9]*"
                            className="input-field" 
                            placeholder="Qtd."
                            value={estoque}
                            onChange={(e) => setEstoque(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Unidade de Medida</label>
                          <div style={{ display: 'flex', gap: '6px', height: '48px' }}>
                            <button
                              type="button"
                              onClick={() => setUnidadeMedida('Caixa')}
                              className="btn"
                              style={{
                                flex: 1,
                                minHeight: 'auto',
                                height: '100%',
                                padding: 0,
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                backgroundColor: unidadeMedida === 'Caixa' ? 'var(--primary)' : 'var(--bg-tertiary)',
                                color: unidadeMedida === 'Caixa' ? '#ffffff' : 'var(--text-secondary)',
                                border: unidadeMedida === 'Caixa' ? 'none' : '1px solid var(--border-color)',
                                boxShadow: unidadeMedida === 'Caixa' ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
                                borderRadius: 'var(--border-radius-md)'
                              }}
                            >
                              Caixa
                            </button>
                            <button
                              type="button"
                              onClick={() => setUnidadeMedida('Palete')}
                              className="btn"
                              style={{
                                flex: 1,
                                minHeight: 'auto',
                                height: '100%',
                                padding: 0,
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                backgroundColor: unidadeMedida === 'Palete' ? 'var(--primary)' : 'var(--bg-tertiary)',
                                color: unidadeMedida === 'Palete' ? '#ffffff' : 'var(--text-secondary)',
                                border: unidadeMedida === 'Palete' ? 'none' : '1px solid var(--border-color)',
                                boxShadow: unidadeMedida === 'Palete' ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
                                borderRadius: 'var(--border-radius-md)'
                              }}
                            >
                              Palete
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Prices Fields */}
                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label">Preço Unitário (R$)</label>
                          <input 
                            type="text" 
                            inputMode="decimal"
                            className="input-field" 
                            placeholder="0,00"
                            value={precoUnidade}
                            onChange={(e) => setPrecoUnidade(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Preço Caixa Varejo (R$)</label>
                          <input 
                            type="text" 
                            inputMode="decimal"
                            className="input-field" 
                            placeholder="0,00"
                            value={precoCaixaVarejo}
                            onChange={(e) => setPrecoCaixaVarejo(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Preço Caixa Atacado (R$)</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          className="input-field" 
                          placeholder="0,00"
                          value={precoCaixaAtacado}
                          onChange={(e) => setPrecoCaixaAtacado(e.target.value)}
                        />
                      </div>

                      {/* Observação Field */}
                      <div className="form-group">
                        <label className="form-label">Observação / Nota</label>
                        <textarea 
                          className="input-field" 
                          placeholder="Ex: Em promoção, ruptura de estoque..."
                          value={observacao}
                          onChange={(e) => setObservacao(e.target.value)}
                          style={{ minHeight: '60px', resize: 'vertical' }}
                        />
                      </div>

                      <div className="grid-2" style={{ marginTop: '10px' }}>
                        <button type="button" onClick={() => setSurveyStep(2)} className="btn btn-secondary">
                          Voltar
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ boxShadow: 'var(--shadow-glow)' }}>
                          Adicionar Item
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* BASKET DISPLAY */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingCart size={18} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Produtos Lançados ({basket.length})</h3>
                  </div>
                </div>
                
                {basket.length === 0 ? (
                  <p className="text-muted text-sm text-center py-4" style={{ fontWeight: '500' }}>Nenhum produto adicionado nesta visita.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', marginBottom: '18px' }}>
                    {basket.map((item, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start', 
                          padding: '12px', 
                          backgroundColor: 'var(--bg-tertiary)', 
                          borderRadius: 'var(--border-radius-md)', 
                          border: '1px solid var(--border-color)', 
                          animation: 'fadeIn var(--transition-fast) forwards' 
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: '8px' }}>
                          <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{item.produtoNome}</div>
                          <div className="text-xs text-secondary" style={{ marginTop: '3px', fontWeight: '500' }}>
                            Est: <span className="font-bold text-primary-color">{item.estoque}</span> {item.unidadeMedida === 'Caixa' ? 'cx' : 'pal'} | 
                            U: {item.precoUnidade !== null ? `R$${item.precoUnidade.toFixed(2)}` : '-'} | 
                            V: {item.precoCaixaVarejo !== null ? `R$${item.precoCaixaVarejo.toFixed(2)}` : '-'} | 
                            A: {item.precoCaixaAtacado !== null ? `R$${item.precoCaixaAtacado.toFixed(2)}` : '-'}
                          </div>
                          {item.observacao && <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: '4px', opacity: 0.8 }}>Obs: {item.observacao}</div>}
                        </div>
                        <button 
                          onClick={() => handleRemoveFromBasket(idx)} 
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                          title="Remover produto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {basket.length > 0 && (
                  <button 
                    type="button" 
                    onClick={handleFinalizeSurvey} 
                    className="btn btn-primary btn-success" 
                    disabled={loadingSubmit}
                    style={{ height: '50px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
                  >
                    {loadingSubmit ? (
                      <>
                        <RefreshCw className="spin" size={18} />
                        Salvando Pesquisa...
                      </>
                    ) : 'Finalizar e Enviar Visita'}
                  </button>
                )}
              </div>

            </div>
          )}

          {/* PHASE 3: SUCCESS BUBBLE */}
          {phase === 'sucesso' && (
            <div 
              className="card text-center animate-fade" 
              style={{ 
                padding: '36px 20px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '24px',
                border: '1px solid var(--border-color)' 
              }}
            >
              <div 
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: offlineSuccess ? 'var(--warning-light)' : 'var(--success-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: offlineSuccess ? 'var(--warning)' : 'var(--success)',
                  boxShadow: offlineSuccess ? '0 0 20px rgba(245, 158, 11, 0.25)' : '0 0 20px rgba(16, 185, 129, 0.25)'
                }}
              >
                <CheckCircle2 size={44} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', fontWeight: '800' }}>
                  {offlineSuccess ? 'Visita Salva Offline!' : 'Visita Finalizada!'}
                </h2>
                <p className="text-secondary text-sm" style={{ lineHeight: '1.5', maxWidth: '320px', margin: '0 auto', fontWeight: '500' }}>
                  {offlineSuccess 
                    ? 'Dados salvos localmente. A pesquisa será enviada automaticamente quando detectar conexão de rede.' 
                    : 'Pesquisa registrada com sucesso no banco de dados Guaracamp.'}
                </p>
              </div>
              
              <button 
                onClick={handleReset} 
                className="btn btn-primary" 
                style={{ width: '80%', height: '48px', marginTop: '8px', boxShadow: 'var(--shadow-glow)' }}
              >
                Nova Pesquisa
              </button>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'historico' && (
        <div style={{ position: 'relative', zIndex: 5 }}>
          {selectedSurveyDetails ? (
            <div className="animate-fade">
              {/* Details Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <button 
                  onClick={() => setSelectedSurveyDetails(null)} 
                  className="btn btn-secondary" 
                  style={{ width: 'auto', minHeight: 'auto', padding: '8px 16px', fontSize: '0.85rem', fontWeight: '700', borderRadius: 'var(--border-radius-full)' }}
                >
                  ← Voltar
                </button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {new Date(selectedSurveyDetails.data_hora).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {/* Client details card */}
              <div className="card" style={{ borderLeft: '5px solid var(--primary)', padding: '20px' }}>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em', fontWeight: '700' }}>
                  Estabelecimento
                </h4>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '6px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {selectedSurveyDetails.clientes?.nome_cliente || 'Cliente Sem Nome'}
                </h3>
                <p className="text-sm text-secondary" style={{ marginBottom: '10px', fontWeight: '500' }}>
                  Código: <span className="font-bold text-primary-color">{selectedSurveyDetails.clientes?.codigo_cliente || 'N/A'}</span>
                </p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <span className="badge badge-admin">{selectedSurveyDetails.clientes?.canal || 'Sem Canal'}</span>
                  <span className="badge badge-vendedor">{selectedSurveyDetails.clientes?.subcanal || 'Sem Subcanal'}</span>
                </div>

                {/* GPS Metadata */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '0.8rem', 
                  color: selectedSurveyDetails.latitude ? 'var(--success)' : 'var(--text-muted)',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '12px',
                  marginTop: '12px',
                  fontWeight: '500'
                }}>
                  <MapPin size={15} />
                  {selectedSurveyDetails.latitude ? (
                    <span>
                      GPS: {selectedSurveyDetails.latitude.toFixed(5)}, {selectedSurveyDetails.longitude.toFixed(5)}{' '}
                      {selectedSurveyDetails.gps_precisao ? `(± ${Math.round(selectedSurveyDetails.gps_precisao)}m)` : ''}
                    </span>
                  ) : (
                    <span>Sem coordenadas geográficas registradas</span>
                  )}
                </div>
              </div>

              {/* Collected Products list */}
              <h3 style={{ fontSize: '1.05rem', marginBottom: '12px', paddingLeft: '4px', fontWeight: '700' }}>
                Produtos Coletados ({selectedSurveyDetails.pesquisa_itens?.length || 0})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(!selectedSurveyDetails.pesquisa_itens || selectedSurveyDetails.pesquisa_itens.length === 0) ? (
                  <div className="card text-center py-4 text-secondary">Nenhum produto registrado.</div>
                ) : (
                  selectedSurveyDetails.pesquisa_itens.map((item: any, idx: number) => (
                    <div key={idx} className="card" style={{ marginBottom: 0, padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {item.produtos?.nome || 'Produto Indefinido'}
                        </h4>
                        <span className="badge badge-vendedor" style={{ fontSize: '0.65rem' }}>
                          {item.unidade_medida || 'Caixa'}
                        </span>
                      </div>

                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '10px 14px', 
                        fontSize: '0.85rem', 
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--bg-tertiary)',
                        padding: '12px 14px',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid var(--border-color)',
                        fontWeight: '500'
                      }}>
                        <div>
                          <strong>Estoque:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{item.estoque}</span>
                        </div>
                        <div>
                          <strong>Preço Uni:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{item.preco_unidade !== null ? `R$ ${item.preco_unidade.toFixed(2)}` : '-'}</span>
                        </div>
                        <div>
                          <strong>Varejo (Cx):</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{item.preco_caixa_varejo !== null ? `R$ ${item.preco_caixa_varejo.toFixed(2)}` : '-'}</span>
                        </div>
                        <div>
                          <strong>Atacado (Cx):</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{item.preco_caixa_atacado !== null ? `R$ ${item.preco_caixa_atacado.toFixed(2)}` : '-'}</span>
                        </div>
                      </div>

                      {item.observacao && (
                        <div style={{ 
                          marginTop: '10px', 
                          fontSize: '0.8rem', 
                          color: 'var(--text-secondary)', 
                          fontStyle: 'italic',
                          backgroundColor: 'var(--bg-tertiary)',
                          padding: '8px 12px',
                          borderRadius: 'var(--border-radius-sm)',
                          borderLeft: '3px solid var(--primary)'
                        }}>
                          Obs: {item.observacao}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="animate-fade">
              {/* Filters Card */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '14px', fontWeight: '700' }}>Filtro de Período</h3>
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Data Inicial</label>
                    <input
                      type="date"
                      className="input-field"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ height: '44px', padding: '8px 12px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Data Final</label>
                    <input
                      type="date"
                      className="input-field"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ height: '44px', padding: '8px 12px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Summary Panels */}
              <div className="grid-2" style={{ marginBottom: '16px' }}>
                <div className="card" style={{ padding: '14px', marginBottom: 0, textAlign: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em' }}>Visitas Feitas</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
                    {historyList.length}
                  </div>
                </div>
                <div className="card" style={{ padding: '14px', marginBottom: 0, textAlign: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em' }}>Itens Coletados</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
                    {historyList.reduce((acc, s) => acc + (s.pesquisa_itens?.length || 0), 0)}
                  </div>
                </div>
              </div>

              {/* Survey List */}
              <h3 style={{ fontSize: '1.05rem', marginBottom: '12px', paddingLeft: '4px', fontWeight: '700' }}>
                Pesquisas Salvas
              </h3>

              {loadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                  <RefreshCw className="spin" size={24} color="var(--primary)" />
                  <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>Carregando histórico...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="card text-center py-5 text-secondary" style={{ color: 'var(--text-muted)', fontWeight: '500' }}>
                  Nenhuma pesquisa encontrada neste período.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {historyList.map((survey) => (
                    <div
                      key={survey.id}
                      onClick={() => setSelectedSurveyDetails(survey)}
                      className="card card-interactive animate-fade"
                      style={{ 
                        marginBottom: 0, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '10px', 
                        padding: '16px', 
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                          {new Date(survey.data_hora).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className="badge badge-vendedor" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            {survey.pesquisa_itens?.length || 0} itens
                          </span>
                          {survey.latitude ? (
                            <MapPin size={13} className="text-success" />
                          ) : (
                            <MapPin size={13} className="text-muted" style={{ opacity: 0.5 }} />
                          )}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {survey.clientes?.nome_cliente || 'Cliente Sem Nome'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '500' }}>
                          Código: {survey.clientes?.codigo_cliente || 'N/A'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                        <span className="badge badge-admin" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                          {survey.clientes?.canal || 'Sem Canal'}
                        </span>
                        <span className="badge badge-gerente" style={{ fontSize: '0.65rem', padding: '1px 6px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                          {survey.clientes?.subcanal || 'Sem Subcanal'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'pendentes' && (
        <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 5 }}>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: '700' }}>Pesquisas Pendentes</h3>
            <p className="text-secondary text-xs" style={{ marginBottom: '18px', lineHeight: '1.5', fontWeight: '500' }}>
              Registros guardados na memória do celular por falta de sinal. Elas sobem automaticamente ao detectar internet, ou clique abaixo para forçar o sincronismo.
            </p>

            {pendingList.length > 0 && (
              <button 
                onClick={syncPendingSurveys} 
                className="btn btn-primary"
                disabled={isSyncing}
                style={{ height: '48px', marginBottom: '4px', boxShadow: 'var(--shadow-glow)' }}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="spin" size={18} />
                    Sincronizando...
                  </>
                ) : (
                  'Sincronizar Todas no Servidor'
                )}
              </button>
            )}
            
            {syncStatus && (
              <div className="text-xs text-secondary font-semibold text-center" style={{ marginTop: '10px' }}>
                {syncStatus}
              </div>
            )}
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
            Fila de Envio ({pendingList.length})
          </h4>

          {pendingList.length === 0 ? (
            <div className="card text-center py-5 text-secondary" style={{ fontWeight: '500' }}>
              Nenhuma pesquisa offline pendente no momento.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingList.map((survey) => (
                <div 
                  key={survey.id} 
                  className="card"
                  style={{ marginBottom: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      {new Date(survey.data_hora).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="badge badge-concorrente" style={{ fontSize: '0.65rem' }}>
                      Aguardando Sinal
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>{survey.cliente_nome}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '500' }}>
                      Cód: {survey.cliente_codigo} | {survey.cliente_canal}
                    </div>
                  </div>

                  <div style={{ 
                    borderTop: '1px solid var(--border-color)', 
                    paddingTop: '10px', 
                    marginTop: '4px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    fontWeight: '500'
                  }}>
                    <strong>Produtos da visita:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {survey.itens.map((item: any, i: number) => (
                        <span 
                          key={i} 
                          className="badge badge-vendedor" 
                          style={{ 
                            fontSize: '0.65rem', 
                            backgroundColor: 'var(--bg-tertiary)', 
                            border: '1px solid var(--border-color)', 
                            color: 'var(--text-primary)',
                            padding: '2px 8px' 
                          }}
                        >
                          {item.produto_nome} ({item.estoque})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PASSWORD UPDATE MODAL */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn var(--transition-fast) forwards'
        }}>
          <div className="card glass-panel" style={{ width: '100%', maxWidth: '380px', margin: 0, padding: '24px', border: '1px solid var(--border-color)', textAlign: 'left', boxShadow: 'var(--glass-shadow)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '18px', color: 'var(--text-primary)', fontWeight: '800' }}>
              Alterar Senha
            </h3>
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nova Senha (Mín. 6 caract.)</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={passwordLoading}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirmar Nova Senha</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Confirme a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={passwordLoading}
                />
              </div>

              {passwordError && (
                <div style={{
                  color: 'var(--danger)',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--danger-light)',
                  padding: '10px 12px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  fontWeight: '500'
                }}>
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div style={{
                  color: 'var(--success)',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--success-light)',
                  padding: '10px 12px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  fontWeight: '500'
                }}>
                  {passwordSuccess}
                </div>
              )}

              <div className="grid-2" style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  disabled={passwordLoading}
                  style={{ minHeight: '42px', padding: 0 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passwordLoading}
                  style={{ minHeight: '42px', padding: 0 }}
                >
                  {passwordLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
