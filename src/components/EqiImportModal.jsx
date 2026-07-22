import { useMemo, useRef, useState } from 'react';
import { Upload, Loader2, Plus } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  addInvestment, updateInvestment, applyAporte, applyResgate,
} from '../services/investmentService';
import { addTransaction } from '../services/transactionService';
import { extractPdfText } from '../utils/pdfText';
import { parseEqiStatement } from '../utils/eqiPdfParser';
import { formatCurrency, formatDate } from '../utils/format';
import { ASSET_CLASSES } from './InvestmentModal';

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function guessMatch(parsedName, investments) {
  const pn = normalize(parsedName);
  let best = null;
  let bestScore = 0;
  for (const inv of investments) {
    const in_ = normalize(inv.name);
    let common = 0;
    while (common < pn.length && common < in_.length && pn[common] === in_[common]) common++;
    if (common > bestScore && common >= 4) { bestScore = common; best = inv; }
  }
  return best;
}

export default function EqiImportModal({ onClose }) {
  const { investments } = useData();
  const { user } = useAuth();
  const { notify } = useToast();
  const fileRef = useRef(null);

  const [status, setStatus] = useState('idle'); // idle | loading | parsed
  const [groups, setGroups] = useState([]); // um por ativo detectado
  const [positions, setPositions] = useState({});
  const [importing, setImporting] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setStatus('loading');
    try {
      const text = await extractPdfText(file);
      const { events, positions: pos } = parseEqiStatement(text);
      if (events.length === 0) {
        notify('Não encontrei aportes/resgates nesse PDF. É um extrato da EQI?', 'err');
        setStatus('idle');
        return;
      }

      const byAsset = {};
      for (const ev of events) {
        byAsset[ev.asset] = byAsset[ev.asset] || { parsedName: ev.asset, kind: ev.kind, events: [] };
        byAsset[ev.asset].events.push({ ...ev, checked: true });
      }

      const built = Object.values(byAsset).map((g) => {
        const match = guessMatch(g.parsedName, investments);
        return {
          key: g.parsedName,
          parsedName: g.parsedName,
          kind: g.kind,
          events: g.events,
          mappedId: match?.id || '',
          newName: g.parsedName,
          newAssetClass: g.kind === 'renda_fixa' ? 'Renda Fixa' : 'Fundos',
        };
      });

      setPositions(pos);
      setGroups(built);
      setStatus('parsed');
    } catch (e) {
      console.error(e);
      notify('Não consegui ler esse PDF.', 'err');
      setStatus('idle');
    }
  };

  const updateGroup = (key, patch) => setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const updateEvent = (key, idx, patch) => setGroups((gs) => gs.map((g) => (
    g.key === key ? { ...g, events: g.events.map((e, i) => (i === idx ? { ...e, ...patch } : e)) } : g
  )));

  const handleImport = async () => {
    setImporting(true);
    try {
      for (const g of groups) {
        const checkedEvents = g.events.filter((e) => e.checked);
        if (checkedEvents.length === 0) continue;

        let positionId = g.mappedId;
        let position = investments.find((i) => i.id === positionId);
        if (!positionId) {
          const ref = await addInvestment(user.uid, {
            name: g.newName.trim() || g.parsedName,
            assetClass: g.newAssetClass,
            invested: 0,
            currentValue: 0,
            date: checkedEvents[0]?.date || null,
          });
          positionId = ref.id;
          position = { invested: 0, currentValue: 0, name: g.newName.trim() || g.parsedName, assetClass: g.newAssetClass, date: checkedEvents[0]?.date };
        }

        for (const ev of checkedEvents) {
          if (ev.type === 'redemption' && ev.positionAmount > position.currentValue) {
            // o resgate vale mais do que sabíamos que a posição tinha —
            // sinal de rendimento (juros/valorização) que não foi capturado
            // por nenhum "atualizar saldo" no meio do caminho. Sobe o valor
            // atual pra refletir isso ANTES do resgate, senão o pro-rata
            // trunca o valor considerado.
            position = { ...position, currentValue: ev.positionAmount };
          }
          // custo/valor da posição usa o Valor BRUTO (o que realmente
          // entrou/saiu do fundo) — usar o líquido (com IOF somado numa
          // aplicação, ou já descontado o IR num resgate) faz o % de
          // rendimento ficar errado, contando imposto como parte do fundo.
          const result = ev.type === 'application' ? applyAporte(position, ev.positionAmount) : applyResgate(position, ev.positionAmount);
          position = { ...position, invested: result.invested, currentValue: result.currentValue };
          await updateInvestment(positionId, {
            name: position.name, assetClass: position.assetClass, date: position.date,
            invested: position.invested, currentValue: position.currentValue,
          });
          await addTransaction(user.uid, {
            type: ev.type,
            description: `${ev.type === 'application' ? 'Aplicação' : 'Resgate'}: ${position.name}`,
            // a transação usa o Valor LÍQUIDO — é o que realmente
            // entrou/saiu da sua conta, o que importa pro saldo
            amount: ev.cashAmount,
            category: 'Investimentos',
            date: ev.date,
            paymentMethod: 'Pix',
          });
        }

        // ajusta o valor atual final com o que a EQI declarou na posição
        // (o replay de aporte/resgate sozinho não capta rendimento de mercado
        // que ainda não passou por um resgate)
        const finalValue = positions[g.parsedName];
        if (finalValue != null) {
          position = { ...position, currentValue: finalValue };
          await updateInvestment(positionId, {
            name: position.name, assetClass: position.assetClass, date: position.date,
            invested: position.invested, currentValue: finalValue,
          });
        }
      }
      notify('Importação concluída.');
      onClose();
    } catch (e) {
      console.error(e);
      notify('Não foi possível concluir a importação.', 'err');
    } finally {
      setImporting(false);
    }
  };

  const totalChecked = groups.reduce((s, g) => s + g.events.filter((e) => e.checked).length, 0);

  return (
    <Modal title="Importar extrato de investimentos (EQI)" onClose={onClose}>
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
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Selecionar PDF do extrato</p>
              <p className="muted" style={{ fontSize: '0.8rem' }}>"Extrato da Conta Investimento" exportado pela EQI</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {status === 'parsed' && (
        <div className="col gap">
          <p className="muted" style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
            Encontrei {groups.length} ativo{groups.length === 1 ? '' : 's'}. Pra cada um, escolha uma posição já
            cadastrada ou crie uma nova — o nome extraído do PDF pode vir com falha de leitura, confira antes de
            confirmar.
          </p>

          {groups.map((g) => (
            <div className="card card-pad" key={g.key}>
              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Ativo no extrato: "{g.parsedName}"</label>
                <select
                  className="select"
                  value={g.mappedId}
                  onChange={(e) => updateGroup(g.key, { mappedId: e.target.value })}
                >
                  <option value="">+ Criar nova posição</option>
                  {investments.map((inv) => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                </select>
              </div>

              {!g.mappedId && (
                <div className="row gap-sm" style={{ marginBottom: 12 }}>
                  <input
                    className="input grow"
                    value={g.newName}
                    onChange={(e) => updateGroup(g.key, { newName: e.target.value })}
                    placeholder="Nome da posição"
                  />
                  <select
                    className="select"
                    style={{ maxWidth: 160 }}
                    value={g.newAssetClass}
                    onChange={(e) => updateGroup(g.key, { newAssetClass: e.target.value })}
                  >
                    {ASSET_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className="col gap-sm">
                {g.events.map((ev, idx) => (
                  <label key={idx} className="between card" style={{ padding: '8px 10px', cursor: 'pointer' }}>
                    <div className="row gap-sm">
                      <input type="checkbox" checked={ev.checked} onChange={(e) => updateEvent(g.key, idx, { checked: e.target.checked })} />
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                          {ev.type === 'application' ? 'Aporte' : 'Resgate'} · {formatDate(ev.date)}
                        </div>
                        {Math.abs(ev.positionAmount - ev.cashAmount) > 0.01 && (
                          <div className="muted" style={{ fontSize: '0.72rem' }}>
                            posição: {formatCurrency(ev.positionAmount)} (diferença é IR/IOF)
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="num" style={{ fontWeight: 700, color: ev.type === 'application' ? 'var(--expense)' : 'var(--income)' }}>
                      {formatCurrency(ev.cashAmount)}
                    </span>
                  </label>
                ))}
              </div>

              {positions[g.parsedName] != null && (
                <p className="muted" style={{ fontSize: '0.76rem', marginTop: 10, marginBottom: 0 }}>
                  Saldo atual declarado no extrato: {formatCurrency(positions[g.parsedName])} — será aplicado
                  como valor atual da posição após os movimentos acima.
                </p>
              )}
            </div>
          ))}

          <button className="btn btn-primary btn-block" onClick={handleImport} disabled={importing || totalChecked === 0}>
            {importing ? <><Loader2 size={16} className="spin" /> Importando…</> : <><Plus size={16} /> Importar {totalChecked} movimento{totalChecked === 1 ? '' : 's'}</>}
          </button>
        </div>
      )}
    </Modal>
  );
}
