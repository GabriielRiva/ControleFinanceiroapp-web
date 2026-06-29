import { useState } from 'react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import { useData } from '../contexts/DataContext';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS, categoryIcon } from '../utils/categories';
import { formatCurrency, todayISO } from '../utils/format';

export default function TransactionModal({ type, initial, isEdit, onSave, onClose, saving }) {
  const isIncome = type === 'income';
  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const { cards } = useData();

  const [description, setDescription] = useState(initial?.description || '');
  const [amount, setAmount] = useState(Number(initial?.amount) || 0);
  const [category, setCategory] = useState(initial?.category || cats[0]);
  const [date, setDate] = useState(initial?.date || todayISO());
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || PAYMENT_METHODS[1]);
  const [cardId, setCardId] = useState(initial?.cardId || '');
  const [installments, setInstallments] = useState(1);
  const [applyToGroup, setApplyToGroup] = useState(false);
  const [error, setError] = useState('');

  const isCredit = !isIncome && paymentMethod === 'Cartão de crédito';
  const showInstallments = isCredit && !isEdit; // só ao criar nova despesa
  const isInstallmentEdit = isEdit && initial?.installmentGroup && initial?.installmentTotal > 1;

  const submit = () => {
    const value = amount;
    if (!description.trim()) return setError('Dê uma descrição para o lançamento.');
    if (value <= 0) return setError('Informe um valor maior que zero.');
    setError('');
    onSave({
      type,
      description: description.trim(),
      amount: value,
      category,
      date,
      paymentMethod: isIncome ? null : paymentMethod,
      cardId: isCredit ? (cardId || null) : null,
      installments: showInstallments ? Number(installments) : 1,
      applyToGroup: isInstallmentEdit ? applyToGroup : false,
    });
  };

  const verb = isEdit ? 'Salvar alterações' : isIncome ? 'Adicionar receita' : 'Adicionar despesa';

  return (
    <Modal
      title={isEdit ? 'Editar lançamento' : isIncome ? 'Nova receita' : 'Nova despesa'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : verb}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Descrição</label>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isIncome ? 'Ex: Salário de junho' : 'Ex: Mercado'}
          autoFocus
        />
      </div>

      <div className="field">
        <label className="label">Valor (R$)</label>
        <CurrencyInput value={amount} onChange={setAmount} />
      </div>

      <div className="field">
        <label className="label">Categoria</label>
        <div className="chips">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {categoryIcon(c)} {c}
            </button>
          ))}
        </div>
      </div>

      {!isIncome && (
        <div className="field">
          <label className="label">Forma de pagamento</label>
          <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      {isCredit && (
        <div className="field">
          <label className="label">Cartão</label>
          {cards.length === 0 ? (
            <p className="muted" style={{ fontSize: '0.82rem' }}>
              Nenhum cartão cadastrado. Você pode cadastrar em <strong>Despesas → Cartões</strong> para
              organizar por fatura.
            </p>
          ) : (
            <select className="select" value={cardId} onChange={(e) => setCardId(e.target.value)}>
              <option value="">Sem cartão específico</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {showInstallments && (
        <div className="field">
          <label className="label">Parcelas</label>
          <select
            className="select"
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
          >
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'À vista (1x)' : `${n}x`}
              </option>
            ))}
          </select>
          {installments > 1 && amount > 0 && (
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              {installments}x de {(amount / installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              {' '}· uma despesa por mês até quitar
            </span>
          )}
        </div>
      )}

      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">Data</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {isInstallmentEdit && (
        <label className="check-row" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            checked={applyToGroup}
            onChange={(e) => setApplyToGroup(e.target.checked)}
          />
          <span>
            Aplicar a <strong>todas as {initial.installmentTotal} parcelas</strong> (categoria, forma de
            pagamento e descrição). Valor e datas de cada parcela são mantidos.
          </span>
        </label>
      )}

      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
