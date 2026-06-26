import Modal from './Modal';

export default function ConfirmDialog({ title, message, confirmLabel = 'Excluir', onConfirm, onClose }) {
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
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted" style={{ lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}
