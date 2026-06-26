import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div
          className="between"
          style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}
        >
          <h2 style={{ fontSize: '1.12rem', fontWeight: 700 }}>{title}</h2>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: 8, borderRadius: 10 }}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && (
          <div
            className="row gap"
            style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
