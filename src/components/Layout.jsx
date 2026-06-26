import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, TrendingDown, Target,
  PieChart, User, Moon, Sun,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const NAV = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/receitas', label: 'Receitas', icon: TrendingUp },
  { to: '/despesas', label: 'Despesas', icon: TrendingDown },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart },
  { to: '/perfil', label: 'Perfil', icon: User },
];

const TITLES = {
  '/': 'Início',
  '/receitas': 'Receitas',
  '/despesas': 'Despesas',
  '/metas': 'Metas',
  '/relatorios': 'Relatórios',
  '/perfil': 'Perfil',
};

export default function Layout({ children }) {
  const { isDark, toggleTheme } = useTheme();
  const { pathname } = useLocation();

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
            {label}
          </NavLink>
        ))}
      </aside>

      <div className="main">
        <header className="topbar">
          <h1 className="page-title">{TITLES[pathname] || 'FinanceApp'}</h1>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Alternar tema">
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </header>

        <div className="page">{children}</div>
      </div>

      <nav className="bottom-nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="bottom-link">
            <Icon size={21} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
