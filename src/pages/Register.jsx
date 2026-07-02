import ZenoMark from '../components/ZenoMark';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authErrorMessage } from '../services/authService';
import GoogleButton from '../components/GoogleButton';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('A senha precisa ter ao menos 6 caracteres.');
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
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
        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-sub">Comece a organizar suas finanças hoje.</p>

        <form onSubmit={submit}>
          <div className="field">
            <label className="label">Nome</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
              required
            />
          </div>
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
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
            />
          </div>

          {error && <p className="expense" style={{ marginBottom: 14, fontSize: '0.9rem' }}>{error}</p>}

          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Criando…' : 'Criar conta'}
          </button>
        </form>

        <div className="divider">ou</div>
        <GoogleButton onError={setError} />

        <p className="auth-foot">
          Já tem conta? <Link to="/login" className="link-btn">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
