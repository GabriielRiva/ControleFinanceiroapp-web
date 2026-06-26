import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authErrorMessage } from '../services/authService';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">R$</span> FinanceApp
        </div>
        <h1 className="auth-title">Recuperar senha</h1>
        <p className="auth-sub">Enviaremos um link para você redefinir sua senha.</p>

        {sent ? (
          <>
            <div
              className="card card-pad"
              style={{ background: 'var(--income-soft)', borderColor: 'transparent', marginBottom: 18 }}
            >
              <p style={{ color: 'var(--income)', fontWeight: 600 }}>
                Pronto! Se existir uma conta com esse e-mail, o link de recuperação chegou na sua caixa de entrada.
              </p>
            </div>
            <Link to="/login" className="btn btn-primary btn-block">Voltar para o login</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label className="label">E-mail</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                autoComplete="email"
                required
              />
            </div>

            {error && <p className="expense" style={{ marginBottom: 14, fontSize: '0.9rem' }}>{error}</p>}

            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}

        <p className="auth-foot">
          Lembrou a senha? <Link to="/login" className="link-btn">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
