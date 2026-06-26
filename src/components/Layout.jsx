import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, TrendingDown, Target,
  LineChart, PieChart, User, Moon, Sun,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Itens que aparecem na barra inferior (mobile) — sem o Perfil para não lotar.
const NAV = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/receitas', label: 'Receitas', icon: TrendingUp },
  { to: '/despesas', label: 'Despesas', icon: TrendingDown },
  { to: '/investimentos', label: 'Investir', icon: LineChart },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart },
];

const TITLES = {
  '/': 'Início',
  '/receitas': 'Receitas',
  '/despesas': 'Despesas',
  '/investimentos': 'Investimentos',
  '/metas': 'Metas',
  '/relatorios': 'Relatórios',
  '/perfil': 'Perfil',
};

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
          <span className="brand-mark">R$</span>
          <span>FinanceApp</span>
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
          <h1 className="page-title">{TITLES[pathname] || 'FinanceApp'}</h1>
          <div className="row gap-sm">
            <button className="icon-btn" onClick={toggleTheme} aria-label="Alternar tema">
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <NavLink to="/perfil" className="avatar-btn" aria-label="Perfil" title="Perfil">
              {initials}
            </NavLink>
          </div>
        </header>

        <div className="page">{children}</div>
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
