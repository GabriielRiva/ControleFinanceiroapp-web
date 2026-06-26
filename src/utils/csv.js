// Exportação CSV das transações (download no navegador)
import { formatDate } from './format';

export function exportTransactionsToCsv(transactions) {
  const header = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Forma de pagamento', 'Valor'];

  const rows = [...transactions]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((t) => [
      formatDate(t.date),
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.description || '',
      t.category || '',
      t.paymentMethod || '',
      String(t.amount).replace('.', ','),
    ]);

  const escape = (v) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [header, ...rows]
    .map((line) => line.map(escape).join(';'))
    .join('\r\n');

  // BOM para acentos abrirem certo no Excel
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financeapp-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
