// Motor de cálculo de amortização para o módulo de Financiamento/Consórcio.
//
// IMPORTANTE: são modelos simplificados de uso pessoal (não substituem o
// extrato oficial do banco/administradora). Não consideram seguro, IOF,
// tarifas administrativas variáveis ou juros pró-rata do primeiro período.

import { addMonthsISO } from './format';

const MAX_INSTALLMENTS = 600; // trava de segurança (50 anos)

function pricePayment(balance, rate, n) {
  if (n <= 0) return 0;
  if (rate <= 0) return balance / n;
  return (balance * rate) / (1 - Math.pow(1 + rate, -n));
}

/**
 * Gera a tabela de amortização (Price ou SAC) de um financiamento, aplicando
 * eventuais abatimentos extraordinários (amortização antecipada) na ordem em
 * que foram registrados.
 *
 * financing: {
 *   principal, monthlyRatePct, system: 'price'|'sac',
 *   installmentsTotal, startDate, paidInstallments: number[],
 *   extraPayments: [{ afterInstallment, amount, mode: 'reduceTerm'|'reduceInstallment' }]
 * }
 */
export function computeFinancingSchedule(financing) {
  const rate = (Number(financing.monthlyRatePct) || 0) / 100;
  const system = financing.system === 'sac' ? 'sac' : 'price';
  const paidSet = new Set(financing.paidInstallments || []);
  const extras = [...(financing.extraPayments || [])].sort(
    (a, b) => Number(a.afterInstallment) - Number(b.afterInstallment)
  );

  let balance = Number(financing.principal) || 0;
  let remaining = Math.max(1, Number(financing.installmentsTotal) || 1);
  let currentPmt = system === 'price' ? pricePayment(balance, rate, remaining) : null;
  let currentAmort = system === 'sac' ? balance / remaining : null;

  const rows = [];
  let extraIdx = 0;
  let k = 0;

  while (remaining > 0 && balance > 0.005 && k < MAX_INSTALLMENTS) {
    k += 1;
    const interest = balance * rate;
    let amort = system === 'price' ? currentPmt - interest : currentAmort;
    if (amort > balance) amort = balance;
    if (amort < 0) amort = 0;
    const installmentValue = amort + interest;
    balance = Math.max(0, balance - amort);
    remaining -= 1;

    const row = {
      number: k,
      dueDate: addMonthsISO(financing.startDate, k - 1),
      interest,
      amortization: amort,
      installmentValue,
      closingBalance: balance,
      extraPayment: 0,
      paid: paidSet.has(k),
    };
    rows.push(row);

    // aplica todo abatimento extra marcado para depois desta parcela
    while (extras[extraIdx] && Number(extras[extraIdx].afterInstallment) === k && balance > 0.005) {
      const extra = extras[extraIdx];
      const amt = Math.min(Number(extra.amount) || 0, balance);
      balance = Math.max(0, balance - amt);
      row.extraPayment += amt;
      row.closingBalance = balance;

      if (balance <= 0.005) {
        remaining = 0;
      } else if (extra.mode === 'reduceInstallment') {
        if (system === 'price') currentPmt = pricePayment(balance, rate, remaining);
        else currentAmort = balance / remaining;
      } else {
        // reduceTerm: mantém parcela/amortização, recalcula quantas faltam
        if (system === 'price') {
          const denom = currentPmt - balance * rate;
          if (rate > 0 && denom > 0) {
            remaining = Math.max(1, Math.ceil(Math.log(currentPmt / denom) / Math.log(1 + rate)));
          } else {
            remaining = Math.max(1, Math.ceil(balance / (currentPmt || 1)));
          }
        } else {
          remaining = Math.max(1, Math.ceil(balance / (currentAmort || 1)));
        }
      }
      extraIdx += 1;
    }
  }

  return rows;
}

export function financingSummary(financing) {
  const rows = computeFinancingSchedule(financing);
  const totalInstallments = rows.length;
  const paidRows = rows.filter((r) => r.paid);
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const totalPaidValue = paidRows.reduce((s, r) => s + r.installmentValue + r.extraPayment, 0);
  const nextDue = rows.find((r) => !r.paid) || null;
  const outstandingBalance = nextDue ? (rows[nextDue.number - 2]?.closingBalance ?? financing.principal) : 0;
  return {
    rows,
    totalInstallments,
    paidCount: paidRows.length,
    totalInterest,
    totalPaidValue,
    nextDue,
    outstandingBalance,
    progressPct: totalInstallments > 0 ? (paidRows.length / totalInstallments) * 100 : 0,
  };
}

/**
 * Projeção de consórcio: sem juros compostos, mas com correção monetária
 * (eventos informados manualmente) e contemplação por sorteio ou lance.
 *
 * consortium: {
 *   assetValue, adminFeePct, reserveFundPct, installmentsTotal, startDate,
 *   paidInstallments: number[],
 *   correctionEvents: [{ date, indexPct }],
 *   contemplation: null | { date, method: 'sorteio'|'lance', creditValue, bidValue, mode }
 * }
 */
export function computeConsortiumSchedule(consortium) {
  const n0 = Math.max(1, Number(consortium.installmentsTotal) || 1);
  const feeFactor = 1 + ((Number(consortium.adminFeePct) || 0) + (Number(consortium.reserveFundPct) || 0)) / 100;
  const totalToPay = (Number(consortium.assetValue) || 0) * feeFactor;
  const paidSet = new Set(consortium.paidInstallments || []);
  const corrections = [...(consortium.correctionEvents || [])].sort((a, b) => (a.date < b.date ? -1 : 1));

  let parcela = totalToPay / n0;
  let balance = totalToPay;
  let remaining = n0;
  let correctionIdx = 0;
  let contemplationApplied = false;

  const rows = [];
  let k = 0;

  while (remaining > 0 && balance > 0.005 && k < MAX_INSTALLMENTS) {
    k += 1;
    const dueDate = addMonthsISO(consortium.startDate, k - 1);

    let appliedCorrection = 0;
    while (corrections[correctionIdx] && corrections[correctionIdx].date <= dueDate) {
      const factor = 1 + (Number(corrections[correctionIdx].indexPct) || 0) / 100;
      parcela *= factor;
      balance *= factor;
      appliedCorrection = Number(corrections[correctionIdx].indexPct) || 0;
      correctionIdx += 1;
    }

    const amort = Math.min(parcela, balance);
    balance = Math.max(0, balance - amort);
    remaining -= 1;

    const row = {
      number: k,
      dueDate,
      installmentValue: amort,
      closingBalance: balance,
      correctionPct: appliedCorrection,
      contemplationBid: 0,
      paid: paidSet.has(k),
    };
    rows.push(row);

    const c = consortium.contemplation;
    if (c && c.method === 'lance' && !contemplationApplied && c.date && c.date <= dueDate) {
      contemplationApplied = true;
      const bid = Math.min(Number(c.bidValue) || 0, balance);
      balance = Math.max(0, balance - bid);
      row.contemplationBid = bid;
      row.closingBalance = balance;

      if (balance <= 0.005) {
        remaining = 0;
      } else if (c.mode === 'reduceInstallment') {
        parcela = balance / remaining;
      } else {
        remaining = Math.max(1, Math.ceil(balance / parcela));
      }
    }
  }

  return rows;
}

export function consortiumSummary(consortium) {
  const rows = computeConsortiumSchedule(consortium);
  const paidRows = rows.filter((r) => r.paid);
  const totalPaidValue = paidRows.reduce((s, r) => s + r.installmentValue + r.contemplationBid, 0);
  const nextDue = rows.find((r) => !r.paid) || null;
  return {
    rows,
    totalInstallments: rows.length,
    paidCount: paidRows.length,
    totalPaidValue,
    nextDue,
    outstandingBalance: nextDue ? (rows[nextDue.number - 2]?.closingBalance ?? consortium.assetValue) : 0,
    progressPct: rows.length > 0 ? (paidRows.length / rows.length) * 100 : 0,
    contemplated: !!(consortium.contemplation && consortium.contemplation.date),
  };
}
