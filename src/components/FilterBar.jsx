import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../utils/categories';
import { MONTH_NAMES } from '../utils/format';

export const emptyFilters = {
  month: 'all', year: 'all', category: 'all', payment: 'all', from: '', to: '',
};

export function isFilterActive(f) {
  return f.month !== 'all' || f.year !== 'all' || f.category !== 'all'
    || f.payment !== 'all' || f.from || f.to;
}

export default function FilterBar({ value, onChange, type, years }) {
  const isIncome = type === 'income';
  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });
  const active = isFilterActive(value);
  const usingRange = value.from || value.to;

  return (
    <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
      <button
        className="between"
        style={{ width: '100%', padding: '13px 16px', background: 'transparent', border: 'none', color: 'var(--text)' }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="row gap-sm" style={{ fontWeight: 600, fontSize: '0.92rem' }}>
          <SlidersHorizontal size={17} /> Filtros {active && <span className="pill" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', border: 'none' }}>ativos</span>}
        </span>
        <span className="muted" style={{ fontSize: '0.85rem' }}>{open ? 'fechar' : 'abrir'}</span>
      </button>

      {open && (
        <div style={{ padding: '4px 16px 18px', borderTop: '1px solid var(--border)' }}>
          {/* mês / ano */}
          {!usingRange && (
            <div className="row gap" style={{ gap: 12, marginTop: 14 }}>
              <div className="field grow" style={{ marginBottom: 0 }}>
                <label className="label">Mês</label>
                <select className="select" value={value.month} onChange={(e) => set({ month: e.target.value })}>
                  <option value="all">Todos</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="field grow" style={{ marginBottom: 0 }}>
                <label className="label">Ano</label>
                <select className="select" value={value.year} onChange={(e) => set({ year: e.target.value })}>
                  <option value="all">Todos</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* forma de pagamento (só despesa) */}
          {!isIncome && (
            <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
              <label className="label">Forma de pagamento</label>
              <select className="select" value={value.payment} onChange={(e) => set({ payment: e.target.value })}>
                <option value="all">Todas</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                <option value="Conta fixa">Conta fixa</option>
              </select>
            </div>
          )}

          {/* categoria */}
          <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
            <label className="label">Categoria</label>
            <div className="chips">
              <button className={`chip ${value.category === 'all' ? 'active' : ''}`} onClick={() => set({ category: 'all' })}>Todas</button>
              {cats.map((c) => (
                <button key={c} className={`chip ${value.category === c ? 'active' : ''}`} onClick={() => set({ category: c })}>{c}</button>
              ))}
            </div>
          </div>

          {/* intervalo de datas */}
          <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
            <label className="label">Intervalo de datas (opcional — ignora mês/ano)</label>
            <div className="row gap" style={{ gap: 10 }}>
              <input className="input" type="date" value={value.from} onChange={(e) => set({ from: e.target.value })} />
              <span className="muted">até</span>
              <input className="input" type="date" value={value.to} onChange={(e) => set({ to: e.target.value })} />
            </div>
          </div>

          {active && (
            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => onChange({ ...emptyFilters })}>
              <X size={16} /> Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
