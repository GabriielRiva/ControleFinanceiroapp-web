import { useRef, useState } from 'react';
import { Upload, Loader2, Plus } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { saveSnapshot } from '../services/investmentService';
import { extractPdfText } from '../utils/pdfText';
import { parsePerformanceReport } from '../utils/eqiPerformanceParser';
import { formatCurrency, monthLabelFromKey } from '../utils/format';

export default function EqiPerformanceImportModal({ onClose }) {
  const { snapshots } = useData();
  const { user } = useAuth();
  const { notify } = useToast();
  const fileRef = useRef(null);

  const [status, setStatus] = useState('idle'); // idle | loading | parsed
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setStatus('loading');
    try {
      const text = await extractPdfText(file);
      const parsed = parsePerformanceReport(text);
      if (parsed.length === 0) {
        notify('Não encontrei a tabela de evolução mensal nesse PDF. É o "Relatório de Performance" da EQI?', 'err');
        setStatus('idle');
        return;
      }
      const built = parsed.map((p) => {
        const existing = snapshots.find((s) => s.date === p.monthKey);
        return { ...p, checked: true, existingId: existing?.id || null };
      });
      setRows(built);
      setStatus('parsed');
    } catch (e) {
      console.error(e);
      notify('Não consegui ler esse PDF.', 'err');
      setStatus('idle');
    }
  };

  const toggle = (monthKey, value) => setRows((rs) => rs.map((r) => (r.monthKey === monthKey ? { ...r, checked: value } : r)));

  const handleImport = async () => {
    const toImport = rows.filter((r) => r.checked);
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      for (const r of toImport) {
        await saveSnapshot(user.uid, r.monthKey, r.totalInvested, r.totalValue, r.existingId);
      }
      notify(`${toImport.length} mês${toImport.length === 1 ? '' : 'es'} registrado${toImport.length === 1 ? '' : 's'} no histórico.`);
      onClose();
    } catch (e) {
      console.error(e);
      notify('Não foi possível concluir a importação.', 'err');
    } finally {
      setImporting(false);
    }
  };

  const totalChecked = rows.filter((r) => r.checked).length;

  return (
    <Modal title="Importar histórico mensal (EQI)" onClose={onClose}>
      {status !== 'parsed' && (
        <div
          className="card"
          style={{ padding: 28, textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed' }}
          onClick={() => fileRef.current?.click()}
        >
          {status === 'loading' ? (
            <>
              <Loader2 size={26} className="spin" style={{ margin: '0 auto 10px' }} />
              <p className="muted" style={{ fontSize: '0.86rem' }}>Lendo o PDF…</p>
            </>
          ) : (
            <>
              <Upload size={26} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Selecionar "Relatório de Performance"</p>
              <p className="muted" style={{ fontSize: '0.8rem' }}>Preenche automaticamente o histórico de "Registrar mês"</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {status === 'parsed' && (
        <div className="col gap">
          <p className="muted" style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
            Encontrei {rows.length} meses. Meses já registrados no seu histórico aparecem marcados — confirmar vai
            <strong> sobrescrever</strong> o valor que já estava lá.
          </p>

          <div className="col gap-sm">
            {rows.map((r) => (
              <label key={r.monthKey} className="between card" style={{ padding: '10px 12px', cursor: 'pointer' }}>
                <div className="row gap-sm">
                  <input type="checkbox" checked={r.checked} onChange={(e) => toggle(r.monthKey, e.target.checked)} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      {monthLabelFromKey(r.monthKey)} {r.existingId && <span className="muted" style={{ fontWeight: 400 }}>(já existe — será atualizado)</span>}
                    </div>
                    <div className="muted" style={{ fontSize: '0.76rem' }}>Investido acumulado: {formatCurrency(r.totalInvested)}</div>
                  </div>
                </div>
                <span className="num" style={{ fontWeight: 700 }}>{formatCurrency(r.totalValue)}</span>
              </label>
            ))}
          </div>

          <button className="btn btn-primary btn-block" onClick={handleImport} disabled={importing || totalChecked === 0}>
            {importing ? <><Loader2 size={16} className="spin" /> Importando…</> : <><Plus size={16} /> Registrar {totalChecked} mês{totalChecked === 1 ? '' : 'es'}</>}
          </button>
        </div>
      )}
    </Modal>
  );
}
