import ZenoMark from './ZenoMark';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, TrendingDown, Target,
  LineChart, PieChart, User, Moon, Sun, AlertTriangle, Landmark,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

// Itens que aparecem na barra inferior (mobile) — sem o Perfil para não lotar.
const NAV = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/receitas', label: 'Receitas', icon: TrendingUp },
  { to: '/despesas', label: 'Despesas', icon: TrendingDown },
  { to: '/investimentos', label: 'Investir', icon: LineChart },
  { to: '/financiamentos', label: 'Financiar', icon: Landmark },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart },
];

const TITLES = {
  '/': 'Início',
  '/receitas': 'Receitas',
  '/despesas': 'Despesas',
  '/investimentos': 'Investimentos',
  '/financiamentos': 'Financiamentos e Consórcios',
  '/metas': 'Metas',
  '/relatorios': 'Relatórios',
  '/perfil': 'Perfil',
};

// Aviso global caso um índice do Firestore ainda esteja sendo criado
// (ou tenha caído): mostra em qualquer página, não só no Painel.
function IndexErrorBanner() {
  const { indexError } = useData();
  if (!indexError) return null;
  return (
    <div
      className="card card-pad"
      style={{
        marginBottom: 16, borderColor: 'var(--goal)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}
    >
      <AlertTriangle size={18} style={{ color: 'var(--goal)', flexShrink: 0, marginTop: 2 }} />
      <p className="muted" style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
        Alguns dados podem estar carregando de forma incompleta enquanto um índice do banco é criado.
        Isso costuma se resolver em alguns minutos — se persistir, recarregue a página.
      </p>
    </div>
  );
}

export default function Layout({ children }) {
  const { isDark, toggleTheme } = useTheme();
  const { profile, user } = useAuth();
  const { pathname } = useLocation();

  const name = profile?.name || user?.displayName || 'Usuário';
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <ZenoMark />
          <span>Zeno</span>
        </div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-link">
            <Icon size={19} />
            {to === '/investimentos' ? 'Investimentos' : label}
          </NavLink>
        ))}
        <NavLink to="/perfil" className="nav-link">
          <User size={19} /> Perfil
        </NavLink>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1 className="page-title">{TITLES[pathname] || 'Zeno'}</h1>
          <div className="row gap-sm">
            <button className="icon-btn" onClick={toggleTheme} aria-label="Alternar tema">
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <NavLink to="/perfil" className="avatar-btn" aria-label="Perfil" title="Perfil">
              {initials}
            </NavLink>
          </div>
        </header>

        <div className="page">
          <IndexErrorBanner />
          {children}
        </div>
      </div>

      <nav className="bottom-nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="bottom-link">
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
