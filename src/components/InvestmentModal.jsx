import { useState } from 'react';
import Modal from './Modal';
import { parseAmount } from '../utils/format';

const SUGGESTIONS = [
  'Renda Fixa', 'Fundos de Investimento', 'Tesouro Direto',
  'Ações', 'FIIs', 'Previdência', 'Cripto', 'Poupança',
];

export default function InvestmentModal({ initial, onSave, onClose, saving }) {
  const [name, setName] = useState(initial?.name || '');
  const [invested, setInvested] = useState(
    initial?.invested != null ? String(initial.invested).replace('.', ',') : ''
  );
  const [currentValue, setCurrentValue] = useState(
    initial?.currentValue != null ? String(initial.currentValue).replace('.', ',') : ''
  );
  const [error, setError] = useState('');

  const submit = () => {
    const inv = parseAmount(invested);
    const cur = parseAmount(currentValue);
    if (!name.trim()) return setError('Dê um nome para o investimento.');
    if (inv <= 0) return setError('Informe quanto você investiu (aportado).');
    setError('');
    onSave({ name: name.trim(), invested: inv, currentValue: cur || inv });
  };

  return (
    <Modal
      title={initial ? 'Editar investimento' : 'Novo investimento'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Tipo / nome</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Renda Fixa"
          autoFocus
          list="invest-suggestions"
        />
        <datalist id="invest-suggestions">
          {SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>

      <div className="field">
        <label className="label">Quanto você investiu (aportado)</label>
        <input
          className="input num"
          inputMode="decimal"
          value={invested}
          onChange={(e) => setInvested(e.target.value)}
          placeholder="0,00"
        />
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">Valor atual na carteira</label>
        <input
          className="input num"
          inputMode="decimal"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder="igual ao aportado, se ainda não rendeu"
        />
        <span className="muted" style={{ fontSize: '0.78rem' }}>
          Veja esse número no app do seu banco. Pode atualizar quando quiser.
        </span>
      </div>

      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
