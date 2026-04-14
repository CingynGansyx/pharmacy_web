import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await login({ username, password });

      if (data.role !== 'STAFF') {
        setError('Зөвхөн ажилтан нэвтрэх боломжтой');
        setLoading(false);
        return;
      }

      setUser(data);
      navigate('/');
    } catch {
      setError('Нэвтрэх нэр эсвэл нууц үг буруу байна');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Эмийн сан</h1>
        <p className="login-subtitle">Ажилтны нэвтрэх хэсэг</p>

        {error && <div className="error-msg">{error}</div>}

        <label>
          Нэвтрэх нэр
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Нэвтрэх нэр"
            required
            autoFocus
          />
        </label>

        <label>
          Нууц үг
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Нууц үг"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
        </button>
      </form>
    </div>
  );
}
