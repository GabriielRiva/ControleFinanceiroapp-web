import { useState } from 'react';
import { Download, LogOut, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { exportTransactionsToCsv } from '../utils/csv';
import { formatCurrency } from '../utils/format';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const { transactions, goals, summary } = useData();
  const { isDark, toggleTheme } = useTheme();
  const { notify } = useToast();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const name = profile?.name || user?.displayName || 'Usuário';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleExport = () => {
    if (transactions.length === 0) {
      notify('Não há lançamentos para exportar.', 'err');
      return;
    }
    exportTransactionsToCsv(transactions);
    notify('CSV gerado. Verifique seus downloads.');
  };

  return (
    <>
      {/* cartão do usuário */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row gap">
          <div
            style={{
              width: 60, height: 60, borderRadius: 18, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--brand), var(--brand-strong))',
              color: 'var(--on-brand)', display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: '1.4rem',
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{name}</div>
            <div className="muted" style={{ fontSize: '0.9rem' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      {/* estatísticas */}
      <div className="stat-grid" style={{ marginBottom: 22 }}>
        <div className="card stat">
          <div className="cap">Lançamentos</div>
          <div className="val">{transactions.length}</div>
        </div>
        <div className="card stat">
          <div className="cap">Metas</div>
          <div className="val">{goals.length}</div>
        </div>
        <div className="card stat">
          <div className="cap">Economizado</div>
          <div className="val" style={{ color: 'var(--brand-strong)' }}>{formatCurrency(summary.savings)}</div>
        </div>
      </div>

      {/* preferências */}
      <h2 className="section-title">Preferências</h2>
      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="setting-row">
          <span className="row gap-sm" style={{ fontWeight: 500 }}>
            <Moon size={18} /> Tema escuro
          </span>
          <button
            className={`switch ${isDark ? 'on' : ''}`}
            onClick={toggleTheme}
            aria-label="Alternar tema escuro"
          />
        </div>
        <div className="setting-row">
          <div>
            <div style={{ fontWeight: 500 }}>Exportar dados</div>
            <div className="muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>
              Baixe todos os seus lançamentos em CSV
            </div>
          </div>
          <button className="btn btn-ghost" onClick={handleExport}>
            <Download size={17} /> CSV
          </button>
        </div>
      </div>

      <button
        className="btn btn-danger btn-block"
        style={{ borderColor: 'var(--border-strong)' }}
        onClick={() => setConfirmLogout(true)}
      >
        <LogOut size={17} /> Sair da conta
      </button>

      <p className="center muted" style={{ marginTop: 20, fontSize: '0.8rem' }}>
        FinanceApp · versão web
      </p>

      {confirmLogout && (
        <ConfirmDialog
          title="Sair da conta"
          message="Você precisará entrar novamente para acessar seus dados."
          confirmLabel="Sair"
          onConfirm={signOut}
          onClose={() => setConfirmLogout(false)}
        />
      )}
    </>
  );
}
