import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // notify(message, type, action?)  -> action = { label, onClick }
  const notify = useCallback((message, type = 'ok', action = null) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type, action }]);
    // avisos com ação (ex: desfazer) ficam mais tempo na tela
    const ttl = action ? 6000 : 3200;
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ttl);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === 'err' ? 'err' : ''}`}>
            <span className="grow">{t.message}</span>
            {t.action && (
              <button
                className="toast-action"
                onClick={() => { t.action.onClick(); dismiss(t.id); }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
