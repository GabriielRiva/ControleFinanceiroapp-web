import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import Investments from './pages/Investments';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

function FullScreenLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="spinner" />
    </div>
  );
}

// rotas que exigem login
function Protected({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <DataProvider>
      <Layout>{children}</Layout>
    </DataProvider>
  );
}

// rotas de auth: se já logado, manda pro painel
function PublicOnly({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/cadastro" element={<PublicOnly><Register /></PublicOnly>} />
              <Route path="/recuperar" element={<PublicOnly><ForgotPassword /></PublicOnly>} />

              <Route path="/" element={<Protected><Dashboard /></Protected>} />
              <Route path="/receitas" element={<Protected><Income /></Protected>} />
              <Route path="/despesas" element={<Protected><Expenses /></Protected>} />
              <Route path="/investimentos" element={<Protected><Investments /></Protected>} />
              <Route path="/metas" element={<Protected><Goals /></Protected>} />
              <Route path="/relatorios" element={<Protected><Reports /></Protected>} />
              <Route path="/perfil" element={<Protected><Profile /></Protected>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
