import { useState } from 'react';

// Formata centavos -> "1.910,00"
function fmt(cents) {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Campo de valor em reais no estilo "banco": o usuário digita apenas
 * números e o app insere a vírgula/pontos automaticamente. Não depende
 * da tecla de vírgula do teclado (que alguns Androids desabilitam).
 *
 * Props:
 *  - value: número em reais (ex: 1910.5)
 *  - onChange: recebe o número em reais
 */
export default function CurrencyInput({
  value, onChange, placeholder = '0,00', autoFocus, className = 'input num',
}) {
  const [digits, setDigits] = useState(() => {
    const c = Math.round((Number(value) || 0) * 100);
    return c ? String(c) : '';
  });

  const handle = (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 12); // só dígitos
    setDigits(d);
    onChange(d ? parseInt(d, 10) / 100 : 0);
  };

  return (
    <input
      className={className}
      inputMode="numeric"
      value={digits ? fmt(parseInt(digits, 10)) : ''}
      onChange={handle}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  );
}
