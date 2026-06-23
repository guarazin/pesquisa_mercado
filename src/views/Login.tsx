import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMsg('Por favor, informe seu usuário de login.');
      return;
    }
    if (!password) {
      setErrorMsg('Por favor, informe sua senha.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await signIn(cleanUsername, password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('Usuário ou senha incorretos.');
        } else if (error.message.includes('Failed to fetch')) {
          setErrorMsg('Erro de conexão. Verifique sua internet.');
        } else {
          setErrorMsg(`Erro ao acessar: ${error.message}`);
        }
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro inesperado no login.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="app-container flex-grow animate-fade" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        minHeight: '100dvh', 
        paddingBottom: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background blobs for premium depth */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '-10%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Theme Toggle Positioned Top Right */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px', 
        zIndex: 10 
      }}>
        <ThemeToggle />
      </div>
      
      <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Brand Header */}
        <div className="text-center mb-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '130px',
            height: '130px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            transform: 'translateY(0px)',
            animation: 'fadeIn var(--transition-normal) forwards'
          }}>
            <img 
              src="/img/Logo Guaracamp.png" 
              alt="Logo Guaracamp" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain',
                filter: 'drop-shadow(0px 4px 12px rgba(16, 185, 129, 0.4))'
              }} 
            />
          </div>
          <h1 style={{ fontSize: '2.25rem', letterSpacing: '-0.03em', margin: '0 0 4px 0', fontWeight: '800' }}>
            Guara<span style={{ color: 'var(--primary)' }}>camp</span>
          </h1>
          <p className="text-secondary text-sm font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.85 }}>
            Pesquisa de Mercado
          </p>
        </div>

        {/* Login Card with Glassmorphism */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--glass-shadow)', margin: '0 4px' }}>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '22px', textAlign: 'left', fontWeight: '700' }}>
            Acesso à Plataforma
          </h2>
          
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--danger-light)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--border-radius-md)',
              padding: '14px',
              marginBottom: '20px',
              color: 'var(--danger)',
              fontSize: '0.875rem',
              animation: 'fadeIn var(--transition-fast) forwards'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: '500' }}>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Username Field */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="username">Login (Usuário)</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--primary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="username"
                  type="text"
                  className="input-field"
                  placeholder="Ex: vendedor01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  autoCapitalize="none"
                  autoComplete="username"
                  style={{ paddingLeft: '46px' }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group" style={{ marginBottom: 6 }}>
              <label className="form-label" htmlFor="password">Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--primary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="password"
                  type="password"
                  className="input-field"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  style={{ paddingLeft: '46px' }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ 
                marginTop: '10px',
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              {isSubmitting ? (
                <>
                  <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                  </svg>
                  Autenticando...
                </>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-muted" style={{ marginTop: '24px', fontWeight: '600', letterSpacing: '0.02em' }}>
          v2.0.0 · Guaracamp Pesquisa Inteligente
        </div>
      </div>
    </div>
  );
};
