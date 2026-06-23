import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Login } from './views/Login';
import { AdminDashboard } from './views/AdminDashboard';
import { PesquisaFluxo } from './views/PesquisaFluxo';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { profile, loading, signOut } = useAuth();

  // 1. Loading screen premium
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        gap: '20px',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        transition: 'background-color 0.3s ease'
      }}>
        <div style={{
          position: 'relative',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src="/img/Logo Guaracamp.png" 
            alt="Logo Guaracamp" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              filter: 'drop-shadow(0px 0px 12px rgba(16, 185, 129, 0.4))'
            }} 
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw className="spin" size={18} color="var(--primary)" />
          <p className="text-secondary text-sm font-semibold" style={{ margin: 0 }}>Carregando dados da sessão...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Login Screen
  if (!profile) {
    return <Login />;
  }

  // 3. Authenticated -> Role Based Rendering
  if (profile.regra === 'Administrador') {
    return <AdminDashboard />;
  }

  if (profile.regra === 'Vendedor') {
    return <PesquisaFluxo />;
  }

  // Gerente View (Redirects to AdminDashboard in Module 2)
  if (profile.regra === 'Gerente') {
    return <AdminDashboard />;
  }

  // Fallback
  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <p>Perfil sem regra definida. Contate o administrador.</p>
      <button onClick={signOut} className="btn btn-primary mt-4">Sair</button>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
