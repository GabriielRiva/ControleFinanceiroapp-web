import { useRef, useState } from 'react';
import { Upload, Loader2, Plus } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addInvestment, updateInvestment, saveSnapshot } from '../services/investmentService';
import { addTransaction } from '../services/transactionService';
import { parseEqiWorkbook } from '../utils/eqiXlsxParser';
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
  const { investments, transactions, snapshots } = useData();
  const { user } = useAuth();
  const { notify } = useToast();
  const fileRef = useRef(null);

  const [status, setStatus] = useState('idle'); // idle | loading | parsed
  const [groups, setGroups] = useState([]); // um por ativo detectado
  const [positions, setPositions] = useState({});
  const [investedTotals, setInvestedTotals] = useState({});
  const [monthKey, setMonthKey] = useState(null);
  const [importing, setImporting] = useState(false);

  // já existe uma transação de investimento com essa data+valor+tipo? Evita
  // duplicar aporte/resgate se a mesma planilha (ou uma que já cobre o mesmo
  // período) for importada de novo.
  const findExistingTransaction = (ev) => transactions.find((t) => (
    t.category === 'Investimentos'
    && t.type === ev.type
    && t.date === ev.date
    && Math.abs((t.amount || 0) - ev.cashAmount) < 0.01
  ));

  const handleFile = async (file) => {
    if (!file) return;
    setStatus('loading');
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const { events, positions: pos, investedTotals: totals, monthKey: mk } = parseEqiWorkbook(new Uint8Array(buffer), XLSX);
      if (events.length === 0) {
        notify('Não encontrei aportes/resgates nessa planilha. É um relatório da EQI (abas "Fundos"/"Renda Fixa")?', 'err');
        setStatus('idle');
        return;
      }

      const byAsset = {};
      for (const ev of events) {
        byAsset[ev.asset] = byAsset[ev.asset] || { parsedName: ev.asset, kind: ev.kind, events: [] };
        const already = !!findExistingTransaction(ev);
        byAsset[ev.asset].events.push({ ...ev, checked: !already, alreadyImported: already });
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
      setInvestedTotals(totals);
      setMonthKey(mk);
      setGroups(built);
      setStatus('parsed');
    } catch (e) {
      console.error(e);
      notify('Não consegui ler essa planilha.', 'err');
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
      const updatedById = {}; // rastreia os valores novos pra somar no snapshot sem esperar o Firestore atualizar o contexto

      for (const g of groups) {
        const checkedEvents = g.events.filter((e) => e.checked);

        let positionId = g.mappedId;
        let position = investments.find((i) => i.id === positionId);
        if (!positionId) {
          const ref = await addInvestment(user.uid, {
            name: g.newName.trim() || g.parsedName,
            assetClass: g.newAssetClass,
            invested: 0,
            currentValue: 0,
            date: g.events[0]?.date || null,
          });
          positionId = ref.id;
          position = {
            invested: 0, currentValue: 0, name: g.newName.trim() || g.parsedName, assetClass: g.newAssetClass, date: g.events[0]?.date,
          };
        }

        // cria só as transações dos eventos marcados (e que ainda não
        // existem) — isso é só pro seu histórico de fluxo de caixa, não é
        // mais usado pra calcular aportado/saldo (ver abaixo)
        for (const ev of checkedEvents) {
          if (ev.alreadyImported) continue;
          await addTransaction(user.uid, {
            type: ev.type,
            description: `${ev.type === 'application' ? 'Aplicação' : 'Resgate'}: ${position.name}`,
            amount: ev.cashAmount,
            category: 'Investimentos',
            date: ev.date,
            paymentMethod: 'Pix',
          });
        }

        // aportado e saldo atual vêm PRONTOS da planilha (a EQI já calcula
        // certinho, inclusive descontando resgate parcial pró-rata) —
        // SOBRESCREVE direto, nunca soma. Isso é o que torna reimportar a
        // mesma planilha (ou uma mais nova) seguro: não duplica nada.
        const invested = investedTotals[g.parsedName] != null ? investedTotals[g.parsedName] : position.invested;
        const currentValue = positions[g.parsedName] != null ? positions[g.parsedName] : position.currentValue;
        await updateInvestment(positionId, {
          name: position.name,
          assetClass: position.assetClass,
          date: position.date,
          invested,
          currentValue,
        });
        updatedById[positionId] = { invested, currentValue };
      }

      // registra o snapshot do mês do relatório — soma aportado/saldo de
      // TODAS as posições (as que essa planilha atualizou agora + as que
      // continuam com o valor que já estava salvo), igual o botão
      // "Registrar mês" já fazia manualmente. saveSnapshot substitui o mês
      // se já existir (não duplica o ponto no gráfico).
      if (monthKey) {
        const totals = investments.reduce((acc, inv) => {
          const v = updatedById[inv.id] || { invested: inv.invested, currentValue: inv.currentValue };
          return { invested: acc.invested + (Number(v.invested) || 0), current: acc.current + (Number(v.currentValue) || 0) };
        }, { invested: 0, current: 0 });
        const existing = snapshots.find((s) => s.date === monthKey);
        await saveSnapshot(user.uid, monthKey, totals.invested, totals.current, existing?.id);
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
              <p className="muted" style={{ fontSize: '0.86rem' }}>Lendo a planilha…</p>
            </>
          ) : (
            <>
              <Upload size={26} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Selecionar planilha (.xlsx/.xls) da EQI</p>
              <p className="muted" style={{ fontSize: '0.8rem' }}>Relatório da EQI exportado em Excel (abas "Fundos" e "Renda Fixa")</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {status === 'parsed' && (
        <div className="col gap">
          <p className="muted" style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
            Encontrei {groups.length} ativo{groups.length === 1 ? '' : 's'}. Pra cada um, escolha uma posição já
            cadastrada ou crie uma nova — o nome extraído da planilha pode vir com formatação estranha, confira
            antes de confirmar. Aportado e saldo atual são sempre <strong>sobrescritos</strong> com os totais
            certos da planilha, nunca somados — é seguro reimportar a mesma planilha ou uma mais nova depois.
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
                          {ev.alreadyImported && <span className="muted" style={{ fontWeight: 400 }}> · já importado</span>}
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

              <p className="muted" style={{ fontSize: '0.76rem', marginTop: 10, marginBottom: 0 }}>
                Aportado será definido como {formatCurrency(investedTotals[g.parsedName] ?? 0)} e saldo atual
                como {formatCurrency(positions[g.parsedName] ?? 0)}, direto da planilha.
              </p>
            </div>
          ))}

          <button className="btn btn-primary btn-block" onClick={handleImport} disabled={importing || groups.length === 0}>
            {importing ? <><Loader2 size={16} className="spin" /> Importando…</> : <><Plus size={16} /> Importar {totalChecked} movimento{totalChecked === 1 ? '' : 's'} e atualizar saldos</>}
          </button>
        </div>
      )}
    </Modal>
  );
}
