import { useState } from 'react';
import { Landmark, Ticket } from 'lucide-react';
import FinancingsPanel from '../components/FinancingsPanel';
import ConsortiumsPanel from '../components/ConsortiumsPanel';

export default function Financing() {
  const [tab, setTab] = useState('financing'); // 'financing' | 'consortium'

  return (
    <>
      <div className="row gap-sm wrap" style={{ marginBottom: 16 }}>
        <button className={`chip ${tab === 'financing' ? 'active' : ''}`} onClick={() => setTab('financing')}>
          <Landmark size={14} style={{ marginRight: 4 }} /> Financiamentos
        </button>
        <button className={`chip ${tab === 'consortium' ? 'active' : ''}`} onClick={() => setTab('consortium')}>
          <Ticket size={14} style={{ marginRight: 4 }} /> Consórcios
        </button>
      </div>

      {tab === 'financing' ? <FinancingsPanel /> : <ConsortiumsPanel />}
    </>
  );
}
