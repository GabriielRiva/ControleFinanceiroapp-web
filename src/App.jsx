import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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

// Layout das rotas protegidas: monta o DataProvider UMA vez e troca só o
// conteúdo (Outlet) ao navegar, evitando re-inscrever os listeners do
// Firestore a cada clique no menu.
function ProtectedLayout() {
  const { user, initializing } = useAuth();
  if (initializing) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <DataProvider>
      <Layout>
        <Outlet />
      </Layout>
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

              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/receitas" element={<Income />} />
                <Route path="/despesas" element={<Expenses />} />
                <Route path="/investimentos" element={<Investments />} />
                <Route path="/metas" element={<Goals />} />
                <Route path="/relatorios" element={<Reports />} />
                <Route path="/perfil" element={<Profile />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
