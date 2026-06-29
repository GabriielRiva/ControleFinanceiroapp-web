import { useState } from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
  title, message, confirmLabel = 'Excluir', checkboxLabel, onConfirm, onClose,
}) {
  const [checked, setChecked] = useState(false);

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-danger grow"
            style={{ background: 'var(--expense)', color: '#fff', borderColor: 'var(--expense)' }}
            onClick={() => {
              onConfirm(checked);
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted" style={{ lineHeight: 1.6 }}>{message}</p>
      {checkboxLabel && (
        <label className="check-row" style={{ marginTop: 16 }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>{checkboxLabel}</span>
        </label>
      )}
    </Modal>
  );
}
