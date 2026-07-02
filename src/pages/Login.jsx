import ZenoMark from '../components/ZenoMark';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authErrorMessage } from '../services/authService';
import GoogleButton from '../components/GoogleButton';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate('/');
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
          <ZenoMark /> Zeno
        </div>
        <h1 className="auth-title">Entrar na sua conta</h1>
        <p className="auth-sub">Acesse seu controle financeiro.</p>

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
          <div className="field">
            <label className="label">Senha</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: 18 }}>
            <Link to="/recuperar" className="link-btn">Esqueci minha senha</Link>
          </div>

          {error && <p className="expense" style={{ marginBottom: 14, fontSize: '0.9rem' }}>{error}</p>}

          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="divider">ou</div>
        <GoogleButton onError={setError} />

        <p className="auth-foot">
          Não tem conta? <Link to="/cadastro" className="link-btn">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
