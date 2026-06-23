import React, { useState, useEffect } from 'react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import { ThemeToggle } from '../components/ThemeToggle';
import { 
  Users, Building, FolderKanban, Tag, ShoppingBag, 
  Plus, LogOut, Search, Check, AlertCircle, RefreshCw, FileSpreadsheet, Edit2, Trash2,
  MapPin, ChevronLeft, ChevronRight, X, KeyRound
} from 'lucide-react';

type TabType = 'pesquisas' | 'usuarios' | 'clientes' | 'familias' | 'marcas' | 'produtos';

export const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('pesquisas');
  
  // Notification states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Search filters
  const [searchQuery, setSearchQuery] = useState('');

  // --- ENTITY STATES ---
  const [usersList, setUsersList] = useState<any[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [familiasList, setFamiliasList] = useState<any[]>([]);
  const [marcasList, setMarcasList] = useState<any[]>([]);
  const [produtosList, setProdutosList] = useState<any[]>([]);

  // --- FORM STATES ---
  // User Form
  const [userNome, setUserNome] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRegra, setUserRegra] = useState<UserRole>('Vendedor');

  // Cliente Form
  const [cliCodigo, setCliCodigo] = useState('');
  const [cliNome, setCliNome] = useState('');
  const [cliCanal, setCliCanal] = useState('');
  const [cliSubcanal, setCliSubcanal] = useState('');
  const [cliAtivo, setCliAtivo] = useState(true);
  const [importingExcel, setImportingExcel] = useState(false);

  // Família Form
  const [famNome, setFamNome] = useState('');

  // Marca Form
  const [marcaNome, setMarcaNome] = useState('');
  const [marcaConcorrente, setMarcaConcorrente] = useState(false);

  // Produto Form
  const [prodNome, setProdNome] = useState('');
  const [prodFamiliaId, setProdFamiliaId] = useState('');
  const [prodMarcaId, setProdMarcaId] = useState('');
  const [prodAtivo, setProdAtivo] = useState(true);

  // Generic Edit states
  const [editingItem, setEditingItem] = useState<{ type: TabType, data: any } | null>(null);
  const [editName, setEditName] = useState('');
  const [editField2, setEditField2] = useState('');
  const [editField3, setEditField3] = useState('');
  const [editField4, setEditField4] = useState('');
  const [editCheck, setEditCheck] = useState(false);

  // --- MODULO 2: NEW STATES ---
  // Client Details CRM Modal states
  const [selectedClientDetails, setSelectedClientDetails] = useState<any | null>(null);
  const [clientSubTab, setClientSubTab] = useState<'cadastro' | 'historico' | 'precos'>('cadastro');
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [loadingClientHistory, setLoadingClientHistory] = useState(false);
  const [selectedClientProductId, setSelectedClientProductId] = useState('');

  // Modulo 2: Client Edit Details
  const [clientEditNome, setClientEditNome] = useState('');
  const [clientEditCodigo, setClientEditCodigo] = useState('');
  const [clientEditCanal, setClientEditCanal] = useState('');
  const [clientEditSubcanal, setClientEditSubcanal] = useState('');
  const [clientEditAtivo, setClientEditAtivo] = useState(true);

  // Pesquisas tab lists & pagination states
  const [pesquisasList, setPesquisasList] = useState<any[]>([]);
  const [loadingPesquisas, setLoadingPesquisas] = useState(false);
  const [currentPagePesquisas, setCurrentPagePesquisas] = useState(1);
  const itemsPerPagePesquisas = 10;

  // Filters for Pesquisas dashboard
  const [filterStartDate, setFilterStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // default last 30 days
  );
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterVendedor, setFilterVendedor] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterCanal, setFilterCanal] = useState('');
  const [filterSubcanal, setFilterSubcanal] = useState('');
  const [filterFamilia, setFilterFamilia] = useState('');
  const [filterMarca, setFilterMarca] = useState('');
  const [filterProduto, setFilterProduto] = useState('');

  // Selected Survey for Drill-Down details view modal
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

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

  // Show Toast
  const triggerNotification = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      setSuccessMsg(text);
      setErrorMsg(null);
    } else {
      setErrorMsg(text);
      setSuccessMsg(null);
    }
    setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 4000);
  };

  // --- LOAD DATA FUNCTIONS ---
  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('perfis').select('*').order('nome');
    if (!error && data) setUsersList(data);
    setLoading(false);
  };

  const loadClientes = async (searchVal?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('clientes').select('*');
      
      if (searchVal && searchVal.trim() !== '') {
        const term = searchVal.trim();
        query = query.or(`nome_cliente.ilike.%${term}%,codigo_cliente.ilike.%${term}%,canal.ilike.%${term}%`);
      }
      
      const { data, error } = await query.order('nome_cliente').limit(searchVal ? 100 : 1000);
      if (!error && data) {
        setClientesList(data);
      }
    } catch (err: any) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFamilias = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('familias').select('*').order('nome');
    if (!error && data) setFamiliasList(data);
    setLoading(false);
  };

  const loadMarcas = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('marcas').select('*').order('nome');
    if (!error && data) setMarcasList(data);
    setLoading(false);
  };

  const loadProdutos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('produtos')
      .select('*, familias(nome), marcas(nome)')
      .order('nome');
    if (!error && data) setProdutosList(data);
    setLoading(false);
  };

  // Load all pesquisas (Module 2)
  const loadPesquisas = async () => {
    setLoadingPesquisas(true);
    try {
      const { data, error } = await supabase
        .from('pesquisas')
        .select(`
          id, data_hora, latitude, longitude, gps_precisao, usuario_id, cliente_id,
          clientes (id, nome_cliente, codigo_cliente, canal, subcanal),
          perfis:usuario_id (id, nome, username),
          pesquisa_itens (
            id, produto_id, estoque, unidade_medida, preco_unidade, preco_caixa_varejo, preco_caixa_atacado, observacao,
            produtos (id, nome, familia_id, familias:familia_id(nome), marca_id, marcas:marca_id(nome))
          )
        `)
        .order('data_hora', { ascending: false });

      if (error) throw error;
      setPesquisasList(data || []);
    } catch (err: any) {
      console.error('Error loading pesquisas:', err);
      triggerNotification('error', `Erro ao carregar pesquisas: ${err.message || err}`);
    } finally {
      setLoadingPesquisas(false);
    }
  };

  // Load research history for a specific client (Module 2)
  const loadClientHistory = async (clientId: string) => {
    setLoadingClientHistory(true);
    try {
      const { data, error } = await supabase
        .from('pesquisas')
        .select(`
          id, data_hora, latitude, longitude, gps_precisao,
          perfis:usuario_id (nome),
          pesquisa_itens (
            id, produto_id, estoque, unidade_medida, preco_unidade, preco_caixa_varejo, preco_caixa_atacado, observacao,
            produtos (id, nome, familia_id, familias:familia_id(nome), marca_id, marcas:marca_id(nome))
          )
        `)
        .eq('cliente_id', clientId)
        .order('data_hora', { ascending: false });

      if (error) throw error;
      setClientHistory(data || []);
      
      // Auto-select first product ID if items exist
      if (data && data.length > 0) {
        const firstProdId = data[0].pesquisa_itens?.[0]?.produto_id || '';
        setSelectedClientProductId(firstProdId);
      } else {
        setSelectedClientProductId('');
      }
    } catch (err: any) {
      console.error('Error loading client history:', err);
      triggerNotification('error', `Erro ao carregar histórico: ${err.message || err}`);
    } finally {
      setLoadingClientHistory(false);
    }
  };

  const handleOpenClientDetails = (client: any) => {
    setSelectedClientDetails(client);
    setClientSubTab('cadastro');
    setClientEditNome(client.nome_cliente || '');
    setClientEditCodigo(client.codigo_cliente || '');
    setClientEditCanal(client.canal || '');
    setClientEditSubcanal(client.subcanal || '');
    setClientEditAtivo(client.ativo ?? true);
    loadClientHistory(client.id);
  };

  const handleUpdateClientDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientDetails) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const updatedUser = profile?.nome || 'Sistema';
      const { error } = await supabase
        .from('clientes')
        .update({
          nome_cliente: clientEditNome.trim(),
          codigo_cliente: clientEditCodigo.trim().toUpperCase(),
          canal: clientEditCanal.trim(),
          subcanal: clientEditSubcanal.trim(),
          ativo: clientEditAtivo,
          editado_por: updatedUser,
          editado_em: now
        })
        .eq('id', selectedClientDetails.id);

      if (error) throw error;
      
      triggerNotification('success', 'Cadastro do cliente atualizado com sucesso!');
      
      const updatedClient = {
        ...selectedClientDetails,
        nome_cliente: clientEditNome.trim(),
        codigo_cliente: clientEditCodigo.trim().toUpperCase(),
        canal: clientEditCanal.trim(),
        subcanal: clientEditSubcanal.trim(),
        ativo: clientEditAtivo,
        editado_por: updatedUser,
        editado_em: now
      };
      setSelectedClientDetails(updatedClient);
      
      loadClientes();
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', `Erro ao atualizar cliente: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Set wide-layout class on mount for Admin/Gerente view
  useEffect(() => {
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.classList.add('wide-layout');
    }
    return () => {
      if (rootEl) {
        rootEl.classList.remove('wide-layout');
      }
    };
  }, []);

  // Switch tab and load data (Module 2 updated)
  useEffect(() => {
    setSearchQuery('');
    if (activeTab === 'pesquisas') {
      loadPesquisas();
      loadClientes();
      loadUsers();
      loadFamilias();
      loadMarcas();
      loadProdutos();
    } else if (activeTab === 'usuarios') {
      loadUsers();
    } else if (activeTab === 'clientes') {
      loadClientes();
    } else if (activeTab === 'familias') {
      loadFamilias();
    } else if (activeTab === 'marcas') {
      loadMarcas();
    } else if (activeTab === 'produtos') {
      loadFamilias();
      loadMarcas();
      loadProdutos();
    }
  }, [activeTab]);

  // Debounced server-side search for clients in Clientes tab
  useEffect(() => {
    if (activeTab === 'clientes') {
      const delayDebounceFn = setTimeout(() => {
        loadClientes(searchQuery);
      }, 400); // 400ms debounce
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, activeTab]);

  // --- SUBMIT HANDLERS ---
  // Create User (Sign Up in Supabase Auth & insertion in Public Profiles)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNome.trim() || !userUsername.trim() || !userPassword) {
      triggerNotification('error', 'Preencha todos os campos do usuário.');
      return;
    }
    if (userPassword.length < 6) {
      triggerNotification('error', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.rpc('criar_usuario', {
        p_username: userUsername.trim().toLowerCase(),
        p_password: userPassword,
        p_nome: userNome.trim(),
        p_regra: userRegra
      });

      if (error) {
        throw error;
      }

      triggerNotification('success', `Usuário "${userNome}" criado com sucesso!`);
      // Reset form
      setUserNome('');
      setUserUsername('');
      setUserPassword('');
      setUserRegra('Vendedor');
      loadUsers();
    } catch (err: any) {
      triggerNotification('error', `Erro ao criar usuário: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Create Cliente
  const handleCreateCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliCodigo.trim() || !cliNome.trim() || !cliCanal.trim() || !cliSubcanal.trim()) {
      triggerNotification('error', 'Preencha todos os campos do cliente.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('clientes').insert({
        codigo_cliente: cliCodigo.trim().toUpperCase(),
        nome_cliente: cliNome.trim(),
        canal: cliCanal.trim(),
        subcanal: cliSubcanal.trim(),
        ativo: cliAtivo,
        criado_por: profile?.nome || 'Sistema'
      });

      if (error) throw error;

      triggerNotification('success', 'Cliente cadastrado com sucesso!');
      setCliCodigo('');
      setCliNome('');
      setCliCanal('');
      setCliSubcanal('');
      setCliAtivo(true);
      loadClientes();
    } catch (err: any) {
      triggerNotification('error', `Erro ao salvar cliente: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Import Clientes via Excel/CSV
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setImportingExcel(true);
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const ab = evt.target?.result;
          if (!ab) throw new Error('Falha ao ler o arquivo.');
          
          const wb = XLSX.read(ab, { type: 'array' });
          const sheetName = wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          // header: 1 reads sheet as a 2D array, raw: false preserves formatting (like leading zeros)
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][];
          
          if (rows.length <= 1) {
            triggerNotification('error', 'A planilha está vazia.');
            setImportingExcel(false);
            setLoading(false);
            return;
          }

          const batchData: any[] = [];
          // Skip header row (index 0) and iterate starting from row 1
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const rawCanal = row[0];       // Coluna A
            const rawSubcanal = row[1];    // Coluna B
            const rawCodigo = row[2];      // Coluna C
            const rawNome = row[3];        // Coluna D
            const rawAtivo = row[4] !== undefined 
              ? (String(row[4]).toLowerCase() === 'true' || row[4] === 1 || row[4] === 'Sim' || row[4] === 'sim' || row[4] === 'ativo' || row[4] === true) 
              : true;
              
            const codigo = rawCodigo !== undefined ? String(rawCodigo).trim().toUpperCase() : '';
            const nome_cliente = rawNome !== undefined ? String(rawNome).trim() : '';
            
            if (codigo && nome_cliente) {
              batchData.push({
                codigo_cliente: codigo,
                nome_cliente,
                canal: (rawCanal !== undefined ? String(rawCanal).trim() : '') || 'Varejo',
                subcanal: (rawSubcanal !== undefined ? String(rawSubcanal).trim() : '') || 'Outros',
                ativo: rawAtivo
              });
            }
          }

          if (batchData.length === 0) {
            triggerNotification('error', 'Nenhum cliente válido encontrado. Verifique se o arquivo possui dados nas colunas C (Código) e D (Nome).');
            setImportingExcel(false);
            setLoading(false);
            return;
          }

          // Deduplicate the batchData in frontend to prevent database conflict crashes
          const uniqueBatchMap = new Map<string, any>();
          for (const item of batchData) {
            const key = `${item.codigo_cliente}::${item.canal}`;
            uniqueBatchMap.set(key, item);
          }
          const finalBatch = Array.from(uniqueBatchMap.values());

          // Batch upsert to prevent unique key conflict and allow updating
          const { error } = await supabase
            .from('clientes')
            .upsert(finalBatch, { onConflict: 'codigo_cliente,canal' });

          if (error) throw error;

          triggerNotification('success', `Importação concluída! ${batchData.length} clientes adicionados/atualizados.`);
          loadClientes();
        } catch (err: any) {
          console.error(err);
          triggerNotification('error', `Erro ao processar planilha: ${err.message || err}`);
        } finally {
          setImportingExcel(false);
          setLoading(false);
          e.target.value = '';
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', `Erro na leitura do arquivo: ${err.message || err}`);
      setImportingExcel(false);
      setLoading(false);
      e.target.value = '';
    }
  };

  // Helper to open edit modal and bind initial values
  const startEditing = (type: TabType, item: any) => {
    setEditingItem({ type, data: item });
    if (type === 'usuarios') {
      setEditName(item.nome);
      setEditField2(item.regra);
      setEditField3(''); // password remains blank
    } else if (type === 'clientes') {
      setEditName(item.nome_cliente);
      setEditField2(item.codigo_cliente);
      setEditField3(item.canal);
      setEditField4(item.subcanal);
      setEditCheck(item.ativo);
    } else if (type === 'familias') {
      setEditName(item.nome);
    } else if (type === 'marcas') {
      setEditName(item.nome);
      setEditCheck(item.eh_concorrente);
    } else if (type === 'produtos') {
      setEditName(item.nome);
      setEditField2(item.familia_id);
      setEditField3(item.marca_id);
      setEditCheck(item.ativo);
    }
  };

  // Handler to execute update queries
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setLoading(true);

    try {
      if (editingItem.type === 'usuarios') {
        const { error } = await supabase.rpc('editar_usuario', {
          p_user_id: editingItem.data.id,
          p_nome: editName.trim(),
          p_regra: editField2,
          p_password: editField3 || null
        });
        if (error) throw error;
        triggerNotification('success', 'Usuário atualizado com sucesso!');
        loadUsers();
      } 
      else if (editingItem.type === 'clientes') {
        const { error } = await supabase
          .from('clientes')
          .update({
            nome_cliente: editName.trim(),
            codigo_cliente: editField2.trim().toUpperCase(),
            canal: editField3.trim(),
            subcanal: editField4.trim(),
            ativo: editCheck,
            editado_por: profile?.nome || 'Sistema',
            editado_em: new Date().toISOString()
          })
          .eq('id', editingItem.data.id);
        if (error) throw error;
        triggerNotification('success', 'Cliente atualizado com sucesso!');
        loadClientes();
      }
      else if (editingItem.type === 'familias') {
        const { error } = await supabase
          .from('familias')
          .update({ 
            nome: editName.trim(),
            editado_por: profile?.nome || 'Sistema',
            editado_em: new Date().toISOString()
          })
          .eq('id', editingItem.data.id);
        if (error) throw error;
        triggerNotification('success', 'Família atualizada com sucesso!');
        loadFamilias();
      }
      else if (editingItem.type === 'marcas') {
        const { error } = await supabase
          .from('marcas')
          .update({
            nome: editName.trim(),
            eh_concorrente: editCheck,
            editado_por: profile?.nome || 'Sistema',
            editado_em: new Date().toISOString()
          })
          .eq('id', editingItem.data.id);
        if (error) throw error;
        triggerNotification('success', 'Marca atualizada com sucesso!');
        loadMarcas();
      }
      else if (editingItem.type === 'produtos') {
        const { error } = await supabase
          .from('produtos')
          .update({
            nome: editName.trim(),
            familia_id: editField2,
            marca_id: editField3,
            ativo: editCheck,
            editado_por: profile?.nome || 'Sistema',
            editado_em: new Date().toISOString()
          })
          .eq('id', editingItem.data.id);
        if (error) throw error;
        triggerNotification('success', 'Produto atualizado com sucesso!');
        loadProdutos();
      }

      setEditingItem(null);
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', `Erro ao atualizar: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete registration item
  const handleDeleteItem = async (type: TabType, id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir "${name}"?`)) return;
    
    setLoading(true);
    try {
      if (type === 'usuarios') {
        const { error } = await supabase.rpc('deletar_usuario', { p_user_id: id });
        if (error) throw error;
        triggerNotification('success', 'Usuário excluído com sucesso!');
        loadUsers();
      } else if (type === 'clientes') {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) {
          if (error.code === '23503') {
            throw new Error('Não é possível excluir este cliente pois ele já possui pesquisas vinculadas.');
          }
          throw error;
        }
        triggerNotification('success', 'Cliente excluído com sucesso!');
        loadClientes();
      } else if (type === 'familias') {
        const { error } = await supabase.from('familias').delete().eq('id', id);
        if (error) {
          if (error.code === '23503') {
            throw new Error('Não é possível excluir esta família pois ela possui produtos vinculados.');
          }
          throw error;
        }
        triggerNotification('success', 'Família excluída com sucesso!');
        loadFamilias();
      } else if (type === 'marcas') {
        const { error } = await supabase.from('marcas').delete().eq('id', id);
        if (error) {
          if (error.code === '23503') {
            throw new Error('Não é possível excluir esta marca pois ela possui produtos vinculados.');
          }
          throw error;
        }
        triggerNotification('success', 'Marca excluída com sucesso!');
        loadMarcas();
      } else if (type === 'produtos') {
        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) {
          if (error.code === '23503') {
            throw new Error('Não é possível excluir este produto pois ele já foi utilizado em pesquisas.');
          }
          throw error;
        }
        triggerNotification('success', 'Produto excluído com sucesso!');
        loadProdutos();
      }
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', `Erro ao excluir: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Create Família
  const handleCreateFamilia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!famNome.trim()) {
      triggerNotification('error', 'Preencha o nome da família.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('familias').insert({
        nome: famNome.trim(),
        criado_por: profile?.nome || 'Sistema'
      });

      if (error) throw error;

      triggerNotification('success', 'Família cadastrada com sucesso!');
      setFamNome('');
      loadFamilias();
    } catch (err: any) {
      triggerNotification('error', `Erro ao salvar família: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Create Marca
  const handleCreateMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marcaNome.trim()) {
      triggerNotification('error', 'Preencha o nome da marca.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('marcas').insert({
        nome: marcaNome.trim(),
        eh_concorrente: marcaConcorrente,
        criado_por: profile?.nome || 'Sistema'
      });

      if (error) throw error;

      triggerNotification('success', 'Marca cadastrada com sucesso!');
      setMarcaNome('');
      setMarcaConcorrente(false);
      loadMarcas();
    } catch (err: any) {
      triggerNotification('error', `Erro ao salvar marca: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Create Produto
  const handleCreateProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNome.trim() || !prodFamiliaId || !prodMarcaId) {
      triggerNotification('error', 'Preencha todos os campos do produto.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('produtos').insert({
        nome: prodNome.trim(),
        familia_id: prodFamiliaId,
        marca_id: prodMarcaId,
        ativo: prodAtivo,
        criado_por: profile?.nome || 'Sistema'
      });

      if (error) throw error;

      triggerNotification('success', 'Produto cadastrado com sucesso!');
      setProdNome('');
      setProdFamiliaId('');
      setProdMarcaId('');
      setProdAtivo(true);
      loadProdutos();
    } catch (err: any) {
      triggerNotification('error', `Erro ao salvar produto: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter listings
  const filteredPesquisas = pesquisasList.filter(p => {
    // 1. Date filter
    const surveyDate = p.data_hora.split('T')[0];
    if (filterStartDate && surveyDate < filterStartDate) return false;
    if (filterEndDate && surveyDate > filterEndDate) return false;

    // 2. Vendedor filter
    if (filterVendedor && p.usuario_id !== filterVendedor) return false;

    // 3. Cliente filter
    if (filterCliente) {
      const term = filterCliente.toLowerCase().trim();
      const matchName = p.clientes?.nome_cliente?.toLowerCase().includes(term);
      const matchCode = p.clientes?.codigo_cliente?.toLowerCase().includes(term);
      if (!matchName && !matchCode) return false;
    }

    // 4. Canal filter
    if (filterCanal && p.clientes?.canal !== filterCanal) return false;

    // 5. Subcanal filter
    if (filterSubcanal && p.clientes?.subcanal !== filterSubcanal) return false;

    // 6. Familia filter
    if (filterFamilia) {
      const hasFamilia = p.pesquisa_itens?.some((item: any) => item.produtos?.familia_id === filterFamilia);
      if (!hasFamilia) return false;
    }

    // 7. Marca filter
    if (filterMarca) {
      const hasMarca = p.pesquisa_itens?.some((item: any) => item.produtos?.marca_id === filterMarca);
      if (!hasMarca) return false;
    }

    // 8. Produto filter
    if (filterProduto) {
      const hasProd = p.pesquisa_itens?.some((item: any) => item.produto_id === filterProduto);
      if (!hasProd) return false;
    }

    return true;
  });

  const totalPagesPesquisas = Math.ceil(filteredPesquisas.length / itemsPerPagePesquisas);
  const paginatedPesquisas = filteredPesquisas.slice(
    (currentPagePesquisas - 1) * itemsPerPagePesquisas,
    currentPagePesquisas * itemsPerPagePesquisas
  );

  const handleClearFilters = () => {
    setFilterStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFilterEndDate(new Date().toISOString().split('T')[0]);
    setFilterVendedor('');
    setFilterCliente('');
    setFilterCanal('');
    setFilterSubcanal('');
    setFilterFamilia('');
    setFilterMarca('');
    setFilterProduto('');
    setCurrentPagePesquisas(1);
  };

  const handleExportExcel = () => {
    if (filteredPesquisas.length === 0) {
      alert('Nenhum resultado filtrado para exportar.');
      return;
    }

    // 1. Prepare Pesquisas Sheet Data (Visitas)
    const pesquisasData = filteredPesquisas.map(p => ({
      'ID Pesquisa': p.id,
      'Data': new Date(p.data_hora).toLocaleDateString('pt-BR'),
      'Hora': new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      'Vendedor': p.perfis?.nome || 'Desconhecido',
      'Código Cliente': p.clientes?.codigo_cliente || '',
      'Nome Cliente': p.clientes?.nome_cliente || '',
      'Canal': p.clientes?.canal || '',
      'Subcanal': p.clientes?.subcanal || '',
      'Quantidade Itens': p.pesquisa_itens?.length || 0,
      'Latitude': p.latitude || '',
      'Longitude': p.longitude || '',
      'Precisão GPS (m)': p.gps_precisao || '',
    }));

    // 2. Prepare Itens Sheet Data (Completo: Visita + Itens)
    const itensData: any[] = [];
    filteredPesquisas.forEach(p => {
      if (p.pesquisa_itens && p.pesquisa_itens.length > 0) {
        p.pesquisa_itens.forEach((item: any) => {
          itensData.push({
            'ID Pesquisa': p.id,
            'Data': new Date(p.data_hora).toLocaleDateString('pt-BR'),
            'Hora': new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            'Vendedor': p.perfis?.nome || '',
            'Código Cliente': p.clientes?.codigo_cliente || '',
            'Nome Cliente': p.clientes?.nome_cliente || '',
            'Canal': p.clientes?.canal || '',
            'Subcanal': p.clientes?.subcanal || '',
            'Família': item.produtos?.familias?.nome || '',
            'Marca': item.produtos?.marcas?.nome || '',
            'Produto': item.produtos?.nome || '',
            'Estoque': item.estoque,
            'Medida': item.unidade_medida,
            'Preço Unidade (R$)': item.preco_unidade !== null && item.preco_unidade !== undefined ? item.preco_unidade : '',
            'Preço Caixa Varejo (R$)': item.preco_caixa_varejo !== null && item.preco_caixa_varejo !== undefined ? item.preco_caixa_varejo : '',
            'Preço Caixa Atacado (R$)': item.preco_caixa_atacado !== null && item.preco_caixa_atacado !== undefined ? item.preco_caixa_atacado : '',
            'Observação': item.observacao || '',
            'Latitude': p.latitude || '',
            'Longitude': p.longitude || '',
            'Precisão GPS (m)': p.gps_precisao || '',
          });
        });
      }
    });

    // 3. Create Workbook
    const wb = XLSX.utils.book_new();
    
    const wsPesquisas = XLSX.utils.json_to_sheet(pesquisasData);
    const wsItens = XLSX.utils.json_to_sheet(itensData);

    // 4. Formatter helper to apply native cell number formats and widths
    const formatWorksheet = (ws: any, dataList: any[]) => {
      if (!ws['!ref']) return;
      const range = XLSX.utils.decode_range(ws['!ref']);
      
      // Post-process cells to assign types and native formats
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = { c: C, r: R };
          const cellRef = XLSX.utils.encode_cell(cellAddress);
          const cell = ws[cellRef];
          if (!cell) continue;

          // Header Row (Row 0)
          if (R === 0) {
            continue;
          }

          // Get Header Name for this column
          const headerRef = XLSX.utils.encode_cell({ c: C, r: 0 });
          const header = ws[headerRef]?.v;
          if (!header) continue;

          // Check if column is currency or integer metrics and format
          if (
            header.includes('Preço') || 
            header.includes('Valor') || 
            header.includes('(R$)')
          ) {
            if (cell.v !== null && cell.v !== undefined && cell.v !== '') {
              const numVal = Number(cell.v);
              if (!isNaN(numVal)) {
                cell.t = 'n';
                cell.v = numVal;
                cell.z = 'R$ #,##0.00;[Red]-R$ #,##0.00;"-"';
              }
            }
          } else if (
            header === 'Estoque' || 
            header === 'Quantidade Itens' || 
            header.includes('GPS') || 
            header.includes('Precisão')
          ) {
            if (cell.v !== null && cell.v !== undefined && cell.v !== '') {
              const numVal = Number(cell.v);
              if (!isNaN(numVal)) {
                cell.t = 'n';
                cell.v = numVal;
                cell.z = '#,##0';
              }
            }
          }
        }
      }

      // Calculate dynamic col widths (Auto-fit)
      if (dataList.length > 0) {
        const keys = Object.keys(dataList[0]);
        ws['!cols'] = keys.map(key => {
          let maxLen = key.length;
          dataList.forEach(row => {
            const val = row[key];
            if (val !== null && val !== undefined) {
              let valStr = String(val);
              // If it's a price column, mock the formatted string length for spacing
              if (key.includes('Preço') || key.includes('Valor') || key.includes('(R$)')) {
                const numVal = Number(val);
                if (!isNaN(numVal)) {
                  valStr = `R$ ${numVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
              }
              if (valStr.length > maxLen) {
                maxLen = valStr.length;
              }
            }
          });
          return { wch: Math.max(maxLen + 4, 12) }; // Padding of 4, minimum of 12
        });
      }
    };

    formatWorksheet(wsItens, itensData);
    formatWorksheet(wsPesquisas, pesquisasData);

    // Append sheets (main first so it opens by default)
    XLSX.utils.book_append_sheet(wb, wsItens, 'Itens Detalhados');
    XLSX.utils.book_append_sheet(wb, wsPesquisas, 'Resumo de Visitas');

    // 5. Download File
    XLSX.writeFile(wb, `pesquisa_mercado_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredUsers = usersList.filter(u => 
    u.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClientes = clientesList.filter(c => {
    const nome = c.nome_cliente || '';
    const codigo = c.codigo_cliente || '';
    const canal = c.canal || '';
    const query = searchQuery.toLowerCase();
    return (
      nome.toLowerCase().includes(query) ||
      codigo.toLowerCase().includes(query) ||
      canal.toLowerCase().includes(query)
    );
  });

  const filteredFamilias = familiasList.filter(f => 
    f.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMarcas = marcasList.filter(m => 
    m.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProdutos = produtosList.filter(p => 
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.familias && p.familias.nome.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.marcas && p.marcas.nome.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="admin-layout animate-fade">
      {/* Left Sidebar (Desktop side nav) */}
      <aside className="admin-sidebar">
        {/* Logo Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
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
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }}>
              Guara<span style={{ color: 'var(--primary)' }}>camp</span>
            </h1>
            <span className="badge badge-admin" style={{ fontSize: '0.55rem', padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Painel Geral</span>
          </div>
        </div>

        {/* User Card inside Sidebar */}
        <div className="glass-panel" style={{ padding: '14px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Usuário Conectado</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>{profile?.nome}</div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
            <span className={`badge badge-${profile?.regra.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>
              {profile?.regra}
            </span>
          </div>
        </div>

        {/* Navigation Sidebar List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {[
            { id: 'pesquisas', label: 'Pesquisas', icon: <ShoppingBag size={18} />, visible: true },
            { id: 'clientes', label: 'Clientes', icon: <Building size={18} />, visible: true },
            { id: 'usuarios', label: 'Usuários', icon: <Users size={18} />, visible: profile?.regra !== 'Gerente' },
            { id: 'familias', label: 'Famílias', icon: <FolderKanban size={18} />, visible: profile?.regra !== 'Gerente' },
            { id: 'marcas', label: 'Marcas', icon: <Tag size={18} />, visible: profile?.regra !== 'Gerente' },
            { id: 'produtos', label: 'Produtos', icon: <ShoppingBag size={18} />, visible: profile?.regra !== 'Gerente' },
          ].filter(tab => tab.visible).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className="btn btn-secondary"
              style={{
                width: '100%',
                minHeight: '44px',
                height: '44px',
                padding: '0 16px',
                fontSize: '0.9rem',
                fontWeight: '700',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '12px',
                transition: 'all var(--transition-normal)',
                boxShadow: activeTab === tab.id ? '0 4px 10px rgba(16, 185, 129, 0.25)' : 'none',
              }}
            >
              <span style={{ color: activeTab === tab.id ? '#ffffff' : 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer Actions inside Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="btn btn-secondary"
            style={{
              width: '100%',
              minHeight: '40px',
              height: '40px',
              padding: '0 14px',
              fontSize: '0.85rem',
              fontWeight: '600',
              borderRadius: 'var(--border-radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '10px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <KeyRound size={16} color="var(--primary)" />
            <span>Alterar Senha</span>
          </button>
          <button
            onClick={signOut}
            className="btn btn-secondary"
            style={{
              width: '100%',
              minHeight: '40px',
              height: '40px',
              padding: '0 14px',
              fontSize: '0.85rem',
              fontWeight: '600',
              borderRadius: 'var(--border-radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.12)',
              color: 'var(--danger)'
            }}
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Right side content */}
      <main className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', textTransform: 'capitalize', letterSpacing: '-0.015em' }}>
              Painel Geral / {activeTab}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Global Search Bar input in Topbar */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Busca rápida..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '34px', height: '36px', fontSize: '0.85rem', borderRadius: 'var(--border-radius-full)' }}
              />
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Content Container */}
        <div className="admin-content">
          
          {/* Notifications */}
          {successMsg && (
            <div className="toast toast-success" style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', width: '100%', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={18} />
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="toast toast-danger" style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', width: '100%', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* TAB CONTENT */}

          {/* 0. TAB PESQUISAS (Module 2) */}
          {activeTab === 'pesquisas' && (
            <div className="animate-fade">
          
          {/* A. INDICADORES SIMPLES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div className="card" style={{ padding: '14px', marginBottom: 0, textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Total Pesquisas</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>
                {filteredPesquisas.length}
              </div>
            </div>
            <div className="card" style={{ padding: '14px', marginBottom: 0, textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Clientes Visitados</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '4px' }}>
                {new Set(filteredPesquisas.map(p => p.cliente_id)).size}
              </div>
            </div>
            <div className="card" style={{ padding: '14px', marginBottom: 0, textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Prods Pesquisados</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6', marginTop: '4px' }}>
                {new Set(filteredPesquisas.flatMap(p => p.pesquisa_itens?.map((item: any) => item.produto_id) || [])).size}
              </div>
            </div>
          </div>

          {/* B. FILTROS AVANÇADOS CARD */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={16} /> Filtros Combinados
              </h3>
              <button 
                onClick={handleClearFilters}
                className="btn btn-text"
                style={{ fontSize: '0.8rem', padding: '2px 8px', minHeight: 'auto' }}
              >
                Limpar Filtros
              </button>
            </div>

            <div className="filters-grid">
              
              {/* Data Inicial */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label text-xs">Data Inicial</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={filterStartDate} 
                  onChange={e => { setFilterStartDate(e.target.value); setCurrentPagePesquisas(1); }} 
                  style={{ height: '40px', padding: '6px 10px', fontSize: '0.9rem' }}
                />
              </div>

              {/* Data Final */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label text-xs">Data Final</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={filterEndDate} 
                  onChange={e => { setFilterEndDate(e.target.value); setCurrentPagePesquisas(1); }} 
                  style={{ height: '40px', padding: '6px 10px', fontSize: '0.9rem' }}
                />
              </div>

              {/* Vendedor */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label text-xs">Vendedor</label>
                <select 
                  className="input-field" 
                  value={filterVendedor} 
                  onChange={e => { setFilterVendedor(e.target.value); setCurrentPagePesquisas(1); }}
                  style={{ height: '40px', padding: '6px 10px', fontSize: '0.9rem' }}
                >
                  <option value="">Todos</option>
                  {usersList.filter(u => u.regra === 'Vendedor').map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              {/* Cliente */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label text-xs">Cliente (Nome/Código)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Filtrar cliente..."
                  value={filterCliente}
                  onChange={e => { setFilterCliente(e.target.value); setCurrentPagePesquisas(1); }}
                  style={{ height: '40px', padding: '6px 10px', fontSize: '0.9rem' }}
                />
              </div>

              {/* Canal */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label text-xs">Canal</label>
                <select 
                  className="input-field" 
                  value={filterCanal} 
                  onChange={e => { setFilterCanal(e.target.value); setCurrentPagePesquisas(1); }}
                  style={{ height: '40px', padding: '6px 10px', fontSize: '0.9rem' }}
                >
                  <option value="">Todos</option>
                  {Array.from(new Set(clientesList.map(c => c.canal).filter(Boolean))).map(canal => (
                    <option key={canal} value={canal}>{canal}</option>
                  ))}
                </select>
              </div>

              {/* Subcanal */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label text-xs">Subcanal</label>
                <select 
                  className="input-field" 
                  value={filterSubcanal} 
                  onChange={e => { setFilterSubcanal(e.target.value); setCurrentPagePesquisas(1); }}
                  style={{ height: '40px', padding: '6px 10px', fontSize: '0.9rem' }}
                >
                  <option value="">Todos</option>
                  {Array.from(new Set(clientesList.map(c => c.subcanal).filter(Boolean))).map(subcanal => (
                    <option key={subcanal} value={subcanal}>{subcanal}</option>
                  ))}
                </select>
              </div>

              {/* Família */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label text-xs">Família</label>
                <select 
                  className="input-field" 
                  value={filterFamilia} 
                  onChange={e => { setFilterFamilia(e.target.value); setCurrentPagePesquisas(1); }}
                  style={{ height: '40px', padding: '6px 10px', fontSize: '0.9rem' }}
                >
                  <option value="">Todas</option>
                  {familiasList.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>

              {/* Marca */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label text-xs">Marca</label>
                <select 
                  className="input-field" 
                  value={filterMarca} 
                  onChange={e => { setFilterMarca(e.target.value); setCurrentPagePesquisas(1); }}
                  style={{ height: '40px', padding: '6px 10px', fontSize: '0.9rem' }}
                >
                  <option value="">Todas</option>
                  {marcasList.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>

              {/* Produto */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label text-xs">Produto</label>
                <select 
                  className="input-field" 
                  value={filterProduto} 
                  onChange={e => { setFilterProduto(e.target.value); setCurrentPagePesquisas(1); }}
                  style={{ height: '40px', padding: '6px 10px', fontSize: '0.9rem' }}
                >
                  <option value="">Todos</option>
                  {produtosList.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* C. LISTAGEM CARD */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Relação de Pesquisas ({filteredPesquisas.length})</h3>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleExportExcel}
                  className="btn btn-secondary"
                  style={{ width: 'auto', minHeight: '34px', height: '34px', padding: '0 12px', fontSize: '0.8rem', display: 'flex', gap: '6px', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                  title="Exportar para Excel"
                >
                  <FileSpreadsheet size={14} /> Exportar Excel
                </button>
                <button 
                  onClick={loadPesquisas} 
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                >
                  <RefreshCw size={16} className={loadingPesquisas ? 'spin' : ''} />
                </button>
              </div>
            </div>

            {loadingPesquisas ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <RefreshCw className="spin" size={24} color="var(--primary)" />
              </div>
            ) : filteredPesquisas.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">Nenhuma pesquisa correspondente encontrada.</p>
            ) : (
              <>
                <div style={{ overflowX: 'auto', margin: '0 -18px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: '600' }}>Data/Hora</th>
                        <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: '600' }}>Vendedor</th>
                        <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: '600' }}>Cliente</th>
                        <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: '600' }}>Canal/Subcanal</th>
                        <th style={{ padding: '10px 18px', textAlign: 'center', fontWeight: '600' }}>Itens</th>
                        <th style={{ padding: '10px 18px', textAlign: 'center', fontWeight: '600' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPesquisas.map((survey) => (
                        <tr 
                          key={survey.id}
                          onClick={() => setSelectedSurvey(survey)}
                          className="suggestion-item"
                          style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
                        >
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ fontWeight: '500' }}>{new Date(survey.data_hora).toLocaleDateString('pt-BR')}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(survey.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td style={{ padding: '12px 18px', color: 'var(--text-primary)' }}>{survey.perfis?.nome || 'Vendedor'}</td>
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ fontWeight: '600' }}>{survey.clientes?.nome_cliente || 'N/A'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Código: {survey.clientes?.codigo_cliente || 'N/A'}</div>
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <span className="badge badge-admin" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>{survey.clientes?.canal || 'Canal'}</span>
                              <span className="badge badge-vendedor" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>{survey.clientes?.subcanal || 'Subcanal'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 'bold' }}>{survey.pesquisa_itens?.length || 0}</td>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            <span className="badge badge-gerente" style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                              Concluída
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPagesPesquisas > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                    <button 
                      onClick={() => setCurrentPagePesquisas(p => Math.max(p - 1, 1))}
                      disabled={currentPagePesquisas === 1}
                      className="btn btn-secondary"
                      style={{ width: 'auto', minHeight: 'auto', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ChevronLeft size={14} /> Anterior
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Página <strong>{currentPagePesquisas}</strong> de <strong>{totalPagesPesquisas}</strong>
                    </span>
                    <button 
                      onClick={() => setCurrentPagePesquisas(p => Math.min(p + 1, totalPagesPesquisas))}
                      disabled={currentPagePesquisas === totalPagesPesquisas}
                      className="btn btn-secondary"
                      style={{ width: 'auto', minHeight: 'auto', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Próximo <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}

      {/* 1. TAB USUARIOS */}
      {activeTab === 'usuarios' && (
        <div className="animate-fade dashboard-grid">
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Cadastrar Novo Acesso</h3>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Nome do usuário" 
                  value={userNome}
                  onChange={e => setUserNome(e.target.value)}
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Login (Sem espaços)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="vendedor01" 
                    value={userUsername}
                    onChange={e => setUserUsername(e.target.value)}
                    autoCapitalize="none"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha (Min. 6 d.)</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Senha123" 
                    value={userPassword}
                    onChange={e => setUserPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Regra de Acesso (Função)</label>
                <select 
                  className="input-field" 
                  value={userRegra} 
                  onChange={e => setUserRegra(e.target.value as UserRole)}
                >
                  <option value="Vendedor">Vendedor (Realiza Pesquisas)</option>
                  <option value="Gerente">Gerente (Acompanha Equipe)</option>
                  <option value="Administrador">Administrador (Acesso Total)</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Salvar Acesso
              </button>
            </form>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Usuários Cadastrados</h3>
              <button onClick={loadUsers} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Pesquisar usuários..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredUsers.length === 0 ? (
                <p className="text-muted text-sm text-center py-2">Nenhum usuário cadastrado.</p>
              ) : (
                filteredUsers.map((u: any) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div className="font-semibold text-sm">{u.nome}</div>
                      <div className="text-xs text-secondary">Login: @{u.username}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge badge-${u.regra.toLowerCase()}`}>
                        {u.regra}
                      </span>
                      <button 
                        onClick={() => startEditing('usuarios', u)} 
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem('usuarios', u.id, u.nome)} 
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB CLIENTES */}
      {activeTab === 'clientes' && (
        <div className={`animate-fade ${profile?.regra !== 'Gerente' ? 'dashboard-grid' : ''}`}>
          {profile?.regra !== 'Gerente' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Cadastrar Novo Cliente</h3>
                <form onSubmit={handleCreateCliente} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Código Cliente</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="Código" 
                        value={cliCodigo}
                        onChange={e => setCliCodigo(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nome Cliente</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="Nome Fantasia" 
                        value={cliNome}
                        onChange={e => setCliNome(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Canal</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="Ex: Supermercado" 
                        value={cliCanal}
                        onChange={e => setCliCanal(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subcanal</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="Ex: Mercadinho" 
                        value={cliSubcanal}
                        onChange={e => setCliSubcanal(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                    <input 
                      type="checkbox" 
                      id="cliAtivo" 
                      checked={cliAtivo} 
                      onChange={e => setCliAtivo(e.target.checked)} 
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <label htmlFor="cliAtivo" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>Cliente Ativo</label>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    Salvar Cliente
                  </button>
                </form>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FileSpreadsheet size={20} color="var(--success)" />
                  <h3 style={{ fontSize: '1.1rem' }}>Importar via Planilha</h3>
                </div>
                
                <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: '1.4', textAlign: 'left' }}>
                  Suba uma planilha (<strong>.xlsx</strong>, <strong>.xls</strong> ou <strong>.csv</strong>) contendo as colunas: <br />
                  <code style={{ fontSize: '0.8rem', padding: '2px 4px', marginRight: '4px' }}>Código</code> 
                  <code style={{ fontSize: '0.8rem', padding: '2px 4px', marginRight: '4px' }}>Nome</code> 
                  <code style={{ fontSize: '0.8rem', padding: '2px 4px', marginRight: '4px' }}>Canal</code> 
                  <code style={{ fontSize: '0.8rem', padding: '2px 4px' }}>Subcanal</code>.
                </p>

                <div style={{ position: 'relative' }}>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleExcelUpload}
                    disabled={loading}
                    id="excel-file-input"
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="excel-file-input"
                    className="btn btn-secondary"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: '1.5px dashed var(--border-color)',
                      backgroundColor: 'var(--bg-tertiary)',
                      minHeight: '48px'
                    }}
                  >
                    {importingExcel ? (
                      <RefreshCw className="spin" size={18} />
                    ) : (
                      <>
                        <Plus size={18} />
                        Selecionar Planilha Excel
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Clientes Cadastrados</h3>
              <button onClick={() => loadClientes()} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Pesquisar por nome ou código..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredClientes.length === 0 ? (
                <p className="text-muted text-sm text-center py-2">Nenhum cliente cadastrado.</p>
              ) : (
                filteredClientes.map((c: any) => (
                  <div 
                    key={c.id} 
                    onClick={() => handleOpenClientDetails(c)}
                    className="suggestion-item"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
                  >
                    <div>
                      <div className="font-semibold text-sm">{c.nome_cliente}</div>
                      <div className="text-xs text-secondary">
                        Cód: {c.codigo_cliente} | {c.canal} ({c.subcanal})
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <span className={`badge ${c.ativo ? 'badge-gerente' : 'badge-concorrente'}`}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {profile?.regra === 'Administrador' && (
                        <button 
                          onClick={() => handleDeleteItem('clientes', c.id, c.nome_cliente)} 
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB FAMILIAS */}
      {activeTab === 'familias' && (
        <div className="animate-fade dashboard-grid">
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Cadastrar Nova Família</h3>
            <form onSubmit={handleCreateFamilia} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Nome da Família</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Guaraná" 
                  value={famNome}
                  onChange={e => setFamNome(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: 'auto', minHeight: '46px' }} disabled={loading}>
                <Plus size={18} />
              </button>
            </form>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Famílias Cadastradas</h3>
              <button onClick={loadFamilias} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Pesquisar famílias..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredFamilias.length === 0 ? (
                <p className="text-muted text-sm text-center py-2">Nenhuma família cadastrada.</p>
              ) : (
                filteredFamilias.map((f: any) => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontWeight: '500' }}>
                    <span>{f.nome}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => startEditing('familias', f)} 
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem('familias', f.id, f.nome)} 
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB MARCAS */}
      {activeTab === 'marcas' && (
        <div className="animate-fade dashboard-grid">
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Cadastrar Nova Marca</h3>
            <form onSubmit={handleCreateMarca} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nome da Marca</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Coca-Cola ou Guaracamp" 
                  value={marcaNome}
                  onChange={e => setMarcaNome(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="marcaConcorrente" 
                  checked={marcaConcorrente} 
                  onChange={e => setMarcaConcorrente(e.target.checked)} 
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="marcaConcorrente" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                  É Concorrente?
                </label>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Salvar Marca
              </button>
            </form>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Marcas Cadastradas</h3>
              <button onClick={loadMarcas} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Pesquisar marcas..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredMarcas.length === 0 ? (
                <p className="text-muted text-sm text-center py-2">Nenhuma marca cadastrada.</p>
              ) : (
                filteredMarcas.map((m: any) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div className="font-semibold text-sm">{m.nome}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${m.eh_concorrente ? 'badge-concorrente' : 'badge-propria'}`}>
                        {m.eh_concorrente ? 'Concorrente' : 'Própria'}
                      </span>
                      <button 
                        onClick={() => startEditing('marcas', m)} 
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem('marcas', m.id, m.nome)} 
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB PRODUTOS */}
      {activeTab === 'produtos' && (
        <div className="animate-fade dashboard-grid">
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Cadastrar Novo Produto</h3>
            <form onSubmit={handleCreateProduto} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nome do Produto</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Guaracamp 290ml" 
                  value={prodNome}
                  onChange={e => setProdNome(e.target.value)}
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Família</label>
                  <select 
                    className="input-field" 
                    value={prodFamiliaId} 
                    onChange={e => setProdFamiliaId(e.target.value)}
                  >
                    <option value="">Selecionar...</option>
                    {familiasList.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <select 
                    className="input-field" 
                    value={prodMarcaId} 
                    onChange={e => setProdMarcaId(e.target.value)}
                  >
                    <option value="">Selecionar...</option>
                    {marcasList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome} ({m.eh_concorrente ? 'Concorrente' : 'Própria'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="prodAtivo" 
                  checked={prodAtivo} 
                  onChange={e => setProdAtivo(e.target.checked)} 
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="prodAtivo" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                  Produto Ativo
                </label>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Salvar Produto
              </button>
            </form>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Produtos Cadastrados</h3>
              <button onClick={loadProdutos} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Pesquisar por produto, família ou marca..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredProdutos.length === 0 ? (
                <p className="text-muted text-sm text-center py-2">Nenhum produto cadastrado.</p>
              ) : (
                filteredProdutos.map((p: any) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div className="font-semibold text-sm">{p.nome}</div>
                      <div className="text-xs text-secondary">
                        Família: {p.familias?.nome || 'N/A'} | Marca: {p.marcas?.nome || 'N/A'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${p.ativo ? 'badge-gerente' : 'badge-concorrente'}`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <button 
                        onClick={() => startEditing('produtos', p)} 
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem('produtos', p.id, p.nome)} 
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

        </div>
      </main>

      {/* EDITING GENERIC MODAL */}
      {editingItem && (
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
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '400px', margin: 0, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--primary)', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Editar {editingItem.type === 'usuarios' ? 'Usuário' : editingItem.type === 'clientes' ? 'Cliente' : editingItem.type === 'familias' ? 'Família' : editingItem.type === 'marcas' ? 'Marca' : 'Produto'}
            </h3>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* FIELDS DYNAMIC RENDERING */}
              {editingItem.type === 'usuarios' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Nome Completo</label>
                    <input type="text" className="input-field" value={editName} onChange={e => setEditName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Login (Não alterável)</label>
                    <input type="text" className="input-field" value={editingItem.data.username} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Função</label>
                    <select className="input-field" value={editField2} onChange={e => setEditField2(e.target.value)}>
                      <option value="Vendedor">Vendedor</option>
                      <option value="Gerente">Gerente</option>
                      <option value="Administrador">Administrador</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nova Senha (Opcional)</label>
                    <input type="password" className="input-field" placeholder="Deixe em branco para manter" value={editField3} onChange={e => setEditField3(e.target.value)} />
                  </div>
                </>
              )}

              {editingItem.type === 'clientes' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Nome Cliente</label>
                    <input type="text" className="input-field" value={editName} onChange={e => setEditName(e.target.value)} required />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Código Cliente</label>
                      <input type="text" className="input-field" value={editField2} onChange={e => setEditField2(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Canal</label>
                      <input type="text" className="input-field" value={editField3} onChange={e => setEditField3(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subcanal</label>
                    <input type="text" className="input-field" value={editField4} onChange={e => setEditField4(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" id="editCheck" checked={editCheck} onChange={e => setEditCheck(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                    <label htmlFor="editCheck" className="form-label" style={{ marginBottom: 0 }}>Cliente Ativo</label>
                  </div>
                </>
              )}

              {editingItem.type === 'familias' && (
                <div className="form-group">
                  <label className="form-label">Nome da Família</label>
                  <input type="text" className="input-field" value={editName} onChange={e => setEditName(e.target.value)} required />
                </div>
              )}

              {editingItem.type === 'marcas' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Nome da Marca</label>
                    <input type="text" className="input-field" value={editName} onChange={e => setEditName(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" id="editCheck" checked={editCheck} onChange={e => setEditCheck(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                    <label htmlFor="editCheck" className="form-label" style={{ marginBottom: 0 }}>É Concorrente?</label>
                  </div>
                </>
              )}

              {editingItem.type === 'produtos' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Nome do Produto</label>
                    <input type="text" className="input-field" value={editName} onChange={e => setEditName(e.target.value)} required />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Família</label>
                      <select className="input-field" value={editField2} onChange={e => setEditField2(e.target.value)} required>
                        {familiasList.map(f => (
                          <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Marca</label>
                      <select className="input-field" value={editField3} onChange={e => setEditField3(e.target.value)} required>
                        {marcasList.map(m => (
                          <option key={m.id} value={m.id}>{m.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" id="editCheck" checked={editCheck} onChange={e => setEditCheck(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                    <label htmlFor="editCheck" className="form-label" style={{ marginBottom: 0 }}>Produto Ativo</label>
                  </div>
                </>
              )}

              {/* Audit logs display */}
              {editingItem.data.criado_por && (
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)', 
                  marginTop: '12px', 
                  borderTop: '1px solid var(--border-color)', 
                  paddingTop: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div><strong>Criado por:</strong> {editingItem.data.criado_por} {editingItem.data.criado_em && `em ${new Date(editingItem.data.criado_em).toLocaleString('pt-BR')}`}</div>
                  {editingItem.data.editado_por && (
                    <div><strong>Editado por:</strong> {editingItem.data.editado_por} {editingItem.data.editado_em && `em ${new Date(editingItem.data.editado_em).toLocaleString('pt-BR')}`}</div>
                  )}
                </div>
              )}

              <div className="grid-2" style={{ marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETALHAMENTO DA PESQUISA MODAL */}
      {selectedSurvey && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px',
          backdropFilter: 'blur(6px)'
        }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '720px', margin: 0, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--primary)', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                Detalhes da Pesquisa
              </h3>
              <button 
                onClick={() => setSelectedSurvey(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="grid-2-desktop">
                {/* Informações Gerais */}
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', height: '100%' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Informações Gerais</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                    <div><strong>Cliente:</strong> {selectedSurvey.clientes?.nome_cliente} <span className="text-secondary">(Cód: {selectedSurvey.clientes?.codigo_cliente})</span></div>
                    <div><strong>Canal / Subcanal:</strong> {selectedSurvey.clientes?.canal} / {selectedSurvey.clientes?.subcanal}</div>
                    <div><strong>Vendedor:</strong> {selectedSurvey.perfis?.nome} <span className="text-secondary">(@{selectedSurvey.perfis?.username})</span></div>
                    <div><strong>Data/Hora:</strong> {new Date(selectedSurvey.data_hora).toLocaleString('pt-BR')}</div>
                    {selectedSurvey.latitude && selectedSurvey.longitude ? (
                      <div>
                        <strong>GPS:</strong> {Number(selectedSurvey.latitude).toFixed(6)}, {Number(selectedSurvey.longitude).toFixed(6)}{' '}
                        <span className="text-secondary">({selectedSurvey.gps_precisao ? `Precisão: ${selectedSurvey.gps_precisao}m` : 'Sem precisão'})</span>
                      </div>
                    ) : (
                      <div><strong>GPS:</strong> Não registrado</div>
                    )}
                  </div>
                </div>

                {/* Mapa da Visita */}
                {selectedSurvey.latitude && selectedSurvey.longitude ? (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={16} /> Mapa da Visita
                    </h4>
                    <div style={{ width: '100%', height: '150px', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', position: 'relative' }}>
                      <iframe
                        title="Localização da Pesquisa"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(selectedSurvey.longitude)-0.003}%2C${Number(selectedSurvey.latitude)-0.003}%2C${Number(selectedSurvey.longitude)+0.003}%2C${Number(selectedSurvey.latitude)+0.003}&layer=mapnik&marker=${Number(selectedSurvey.latitude)}%2C${Number(selectedSurvey.longitude)}`}
                      />
                    </div>
                    <div style={{ marginTop: '4px', textAlign: 'right' }}>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedSurvey.latitude},${selectedSurvey.longitude}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}
                      >
                        Abrir no Google Maps ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', height: '150px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Sem geolocalização nesta visita
                  </div>
                )}
              </div>

              {/* Itens Coletados */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Produtos Pesquisados ({selectedSurvey.pesquisa_itens?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {(!selectedSurvey.pesquisa_itens || selectedSurvey.pesquisa_itens.length === 0) ? (
                    <p className="text-muted text-xs">Nenhum produto registrado nesta pesquisa.</p>
                  ) : (
                    selectedSurvey.pesquisa_itens.map((item: any) => (
                      <div key={item.id} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '10px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          <span>{item.produtos?.nome}</span>
                          <span className="badge badge-admin" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                            {item.estoque} {item.unidade_medida}
                          </span>
                        </div>
                        <div className="text-secondary text-xs" style={{ marginBottom: '6px' }}>
                          Família: {item.produtos?.familias?.nome || 'N/A'} | Marca: {item.produtos?.marcas?.nome || 'N/A'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '0.75rem', backgroundColor: 'var(--bg-tertiary)', padding: '6px', borderRadius: '4px' }}>
                          <div>
                            <div className="text-muted">Unidade</div>
                            <div style={{ fontWeight: '600', color: item.preco_unidade ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {item.preco_unidade ? `R$ ${Number(item.preco_unidade).toFixed(2)}` : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted">Cx. Varejo</div>
                            <div style={{ fontWeight: '600', color: item.preco_caixa_varejo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {item.preco_caixa_varejo ? `R$ ${Number(item.preco_caixa_varejo).toFixed(2)}` : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted">Cx. Atacado</div>
                            <div style={{ fontWeight: '600', color: item.preco_caixa_atacado ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {item.preco_caixa_atacado ? `R$ ${Number(item.preco_caixa_atacado).toFixed(2)}` : 'N/A'}
                            </div>
                          </div>
                        </div>
                        {item.observacao && (
                          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '4px' }}>
                            <strong>Obs:</strong> {item.observacao}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedSurvey(null)} style={{ width: 'auto', minHeight: 'auto', padding: '8px 16px' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHAMENTO DO CLIENTE (CRM) MODAL */}
      {selectedClientDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(6px)'
        }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '720px', margin: 0, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--primary)', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <span className="badge badge-gerente" style={{ marginBottom: '4px' }}>CRM Cliente</span>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  {selectedClientDetails.nome_cliente}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedClientDetails(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              {(['cadastro', 'historico', 'precos'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setClientSubTab(tab)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: clientSubTab === tab ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                    color: clientSubTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                    padding: '8px 0',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {tab === 'cadastro' ? 'Cadastro' : tab === 'historico' ? 'Histórico' : 'Preços'}
                </button>
              ))}
            </div>

            {/* Tab: Cadastro */}
            {clientSubTab === 'cadastro' && (
              <form onSubmit={handleUpdateClientDetails} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-xs">Nome Fantasia</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={clientEditNome} 
                    onChange={e => setClientEditNome(e.target.value)} 
                    disabled={profile?.regra !== 'Administrador'}
                    required 
                    style={{ height: '40px', padding: '8px 12px', fontSize: '0.9rem' }}
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label text-xs">Código Cliente</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={clientEditCodigo} 
                      onChange={e => setClientEditCodigo(e.target.value)} 
                      disabled={profile?.regra !== 'Administrador'}
                      required 
                      style={{ height: '40px', padding: '8px 12px', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label text-xs">Canal</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={clientEditCanal} 
                      onChange={e => setClientEditCanal(e.target.value)} 
                      disabled={profile?.regra !== 'Administrador'}
                      required 
                      style={{ height: '40px', padding: '8px 12px', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-xs">Subcanal</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={clientEditSubcanal} 
                    onChange={e => setClientEditSubcanal(e.target.value)} 
                    disabled={profile?.regra !== 'Administrador'}
                    required 
                    style={{ height: '40px', padding: '8px 12px', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                  <input 
                    type="checkbox" 
                    id="clientEditAtivo" 
                    checked={clientEditAtivo} 
                    onChange={e => setClientEditAtivo(e.target.checked)} 
                    disabled={profile?.regra !== 'Administrador'}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} 
                  />
                  <label htmlFor="clientEditAtivo" className="form-label" style={{ marginBottom: 0, cursor: profile?.regra === 'Administrador' ? 'pointer' : 'default' }}>
                    Cliente Ativo
                  </label>
                </div>

                {/* Audit footer */}
                {selectedClientDetails.criado_por && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)', 
                    marginTop: '8px', 
                    borderTop: '1px solid var(--border-color)', 
                    paddingTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div><strong>Criado por:</strong> {selectedClientDetails.criado_por} {selectedClientDetails.criado_em && `em ${new Date(selectedClientDetails.criado_em).toLocaleString('pt-BR')}`}</div>
                    {selectedClientDetails.editado_por && (
                      <div><strong>Editado por:</strong> {selectedClientDetails.editado_por} {selectedClientDetails.editado_em && `em ${new Date(selectedClientDetails.editado_em).toLocaleString('pt-BR')}`}</div>
                    )}
                  </div>
                )}

                {profile?.regra === 'Administrador' && (
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px', minHeight: '40px' }}>
                    Salvar Alterações
                  </button>
                )}
              </form>
            )}

            {/* Tab: Histórico de Pesquisas */}
            {clientSubTab === 'historico' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {loadingClientHistory ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                    <RefreshCw className="spin" size={20} color="var(--primary)" />
                  </div>
                ) : clientHistory.length === 0 ? (
                  <p className="text-muted text-sm text-center py-4">Nenhuma pesquisa realizada para este cliente.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                    {clientHistory.map(survey => (
                      <div
                        key={survey.id}
                        onClick={() => setSelectedSurvey(survey)}
                        className="suggestion-item"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius-sm)',
                          padding: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600' }}>
                            {new Date(survey.data_hora).toLocaleDateString('pt-BR')} às {new Date(survey.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-secondary text-xs">Vendedor: {survey.perfis?.nome || 'N/A'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge badge-admin" style={{ fontSize: '0.7rem' }}>
                            {survey.pesquisa_itens?.length || 0} itens
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Evolução de Preços */}
            {clientSubTab === 'precos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-xs">Produto para Análise</label>
                  <select
                    className="input-field"
                    value={selectedClientProductId}
                    onChange={e => setSelectedClientProductId(e.target.value)}
                    style={{ height: '40px', padding: '6px 10px', fontSize: '0.9rem' }}
                  >
                    <option value="">Selecionar produto...</option>
                    {produtosList.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                {selectedClientProductId ? (() => {
                  const history = clientHistory
                    .flatMap(survey => {
                      const item = survey.pesquisa_itens?.find((i: any) => i.produto_id === selectedClientProductId);
                      if (!item) return [];
                      return [{
                        id: survey.id,
                        data_hora: survey.data_hora,
                        vendedor: survey.perfis?.nome || 'Desconhecido',
                        preco_unidade: item.preco_unidade,
                        preco_caixa_varejo: item.preco_caixa_varejo,
                        preco_caixa_atacado: item.preco_caixa_atacado
                      }];
                    })
                    .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());

                  if (history.length === 0) {
                    return <p className="text-muted text-sm text-center py-4">Sem registros de preço para este produto neste cliente.</p>;
                  }

                  return (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '6px 10px', fontWeight: '600' }}>Data</th>
                            <th style={{ padding: '6px 10px', fontWeight: '600' }}>Vendedor</th>
                            <th style={{ padding: '6px 10px', fontWeight: '600', textAlign: 'right' }}>Un.</th>
                            <th style={{ padding: '6px 10px', fontWeight: '600', textAlign: 'right' }}>Cx. Var</th>
                            <th style={{ padding: '6px 10px', fontWeight: '600', textAlign: 'right' }}>Cx. Atac</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((record, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px 10px', fontWeight: '500' }}>
                                {new Date(record.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </td>
                              <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.vendedor}>
                                {record.vendedor}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                {record.preco_unidade ? `R$ ${Number(record.preco_unidade).toFixed(2)}` : '-'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                {record.preco_caixa_varejo ? `R$ ${Number(record.preco_caixa_varejo).toFixed(2)}` : '-'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                {record.preco_caixa_atacado ? `R$ ${Number(record.preco_caixa_atacado).toFixed(2)}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })() : (
                  <p className="text-muted text-xs text-center py-4">Selecione um produto para visualizar a variação dos preços.</p>
                )}
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedClientDetails(null)} style={{ width: 'auto', minHeight: 'auto', padding: '8px 16px' }}>
                Fechar
              </button>
            </div>
          </div>
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
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '16px',
          backdropFilter: 'blur(6px)'
        }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '400px', margin: 0, border: '1px solid var(--primary)', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Alterar Senha
            </h3>
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nova Senha (Mín. 6 d.)</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Sua nova senha"
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
                  placeholder="Confirme a nova senha"
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
                  padding: '8px 10px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid rgba(239, 68, 68, 0.1)'
                }}>
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div style={{
                  color: 'var(--success)',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--success-light)',
                  padding: '8px 10px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid rgba(16, 185, 129, 0.1)'
                }}>
                  {passwordSuccess}
                </div>
              )}

              <div className="grid-2" style={{ marginTop: '8px' }}>
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
                  style={{ minHeight: '40px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passwordLoading}
                  style={{ minHeight: '40px' }}
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
