// Parser de fatura de cartão exportada em CSV (formato usado pelo Nubank:
// colunas "date,title,amount"). Separa compras de pagamentos recebidos e
// identifica compras parceladas pelo sufixo "- Parcela N/M" no título.

const PARCELA_RE = /\s*-\s*Parcela\s+(\d+)\s*\/\s*(\d+)\s*$/i;

function parseCsvLine(line) {
  // split respeitando campos entre aspas (o valor vem como "119,90")
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { result.push(cur); cur = ''; continue; }
    cur += c;
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

function toAmount(raw) {
  const s = (raw || '').trim();
  const neg = s.startsWith('-');
  const digits = s.replace(/-/g, '').trim();
  const value = Number(digits.replace(/\./g, '').replace(',', '.')) || 0;
  return { value, neg };
}

export function parseCardCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { purchases: [], payments: [] };

  const header = lines[0].toLowerCase();
  const startIdx = header.includes('date') && header.includes('amount') ? 1 : 0;

  const purchases = [];
  const payments = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 3) continue;
    const [date, rawTitle, rawAmount] = cols;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const { value, neg } = toAmount(rawAmount);
    const parcelaMatch = rawTitle.match(PARCELA_RE);
    const cleanTitle = rawTitle.replace(PARCELA_RE, '').trim();

    const item = {
      date,
      title: rawTitle,
      // sugestão de nome já pronta pra edição: "Fisia Nfs2107 (1/4)"
      suggestedDescription: parcelaMatch ? `${cleanTitle} (${parcelaMatch[1]}/${parcelaMatch[2]})` : cleanTitle,
      installmentIndex: parcelaMatch ? Number(parcelaMatch[1]) : null,
      installmentTotal: parcelaMatch ? Number(parcelaMatch[2]) : null,
      amount: value,
    };

    if (neg || /pagamento recebido/i.test(rawTitle)) payments.push(item);
    else purchases.push(item);
  }

  return { purchases, payments };
}
