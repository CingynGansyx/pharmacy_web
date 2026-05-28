import { useEffect, useMemo, useState } from 'react';
import { getAllUsers, depositWallet, withdrawWallet } from '../api/users';
import { register, type User } from '../api/auth';

type RoleFilter = 'ALL' | 'CUSTOMER' | 'STAFF';

export default function Customers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'bonus'>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<User | null>(null);
  const [walletDelta, setWalletDelta] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getAllUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = users
      .filter((u) => role === 'ALL' || u.role === role)
      .filter((u) => {
        if (!s) return true;
        return [u.fullName, u.username, u.phone, u.email, String(u.id)]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(s));
      });
    list.sort((a, b) => {
      let r = 0;
      if (sortBy === 'name') r = (a.fullName || '').localeCompare(b.fullName || '');
      else if (sortBy === 'balance') r = (a.wallet?.balance ?? 0) - (b.wallet?.balance ?? 0);
      else if (sortBy === 'bonus') r = (a.bonusPoints ?? 0) - (b.bonusPoints ?? 0);
      return order === 'asc' ? r : -r;
    });
    return list;
  }, [users, q, role, sortBy, order]);

  const totalBalance = filtered.reduce((s, u) => s + (u.wallet?.balance ?? 0), 0);
  const totalBonus = filtered.reduce((s, u) => s + (u.bonusPoints ?? 0), 0);

  const flipSort = (field: typeof sortBy) => {
    if (sortBy === field) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setOrder('asc'); }
  };
  const sortIcon = (field: typeof sortBy) => sortBy !== field ? ' ↕' : order === 'asc' ? ' ↑' : ' ↓';

  const handleWallet = async (mode: 'deposit' | 'withdraw') => {
    if (!selected) return;
    const amount = Number(walletDelta);
    if (!amount || amount <= 0) return;
    setBusy(true);
    try {
      if (mode === 'deposit') await depositWallet(selected.id.toString(), amount);
      else await withdrawWallet(selected.id.toString(), amount);
      setWalletDelta('');
      setSelected(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="customers-page page-fill">
      <div className="page-header">
        <h1>Хэрэглэгчид <span className="muted small">({filtered.length})</span></h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="muted small">
            Хэтэвч {totalBalance.toLocaleString()}₮ · Бонус {totalBonus.toLocaleString()}
          </span>
          <button className="btn-primary" onClick={() => setCreating(true)}>+ Бүртгэх</button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Нэр / утас / имэйл / нэвтрэх нэр / ID..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="filter-input"
        />
        <select className="filter-select" value={role} onChange={(e) => setRole(e.target.value as RoleFilter)}>
          <option value="ALL">Бүх эрх</option>
          <option value="CUSTOMER">Үйлчлүүлэгч</option>
          <option value="STAFF">Ажилтан</option>
        </select>
      </div>

      <div className="table-wrapper scroll-table">
        {loading ? (
          <p className="loading-text">Ачааллаж байна...</p>
        ) : filtered.length === 0 ? (
          <p className="empty-text">Хэрэглэгч олдсонгүй</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th className="sortable" onClick={() => flipSort('name')}>Нэр{sortIcon('name')}</th>
                <th>Нэвтрэх нэр</th>
                <th>Холбоо</th>
                <th>Эрх</th>
                <th className="sortable num" onClick={() => flipSort('balance')}>Хэтэвч{sortIcon('balance')}</th>
                <th className="sortable num" onClick={() => flipSort('bonus')}>Бонус{sortIcon('bonus')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td><code>{u.id}</code></td>
                  <td><strong>{u.fullName || '—'}</strong></td>
                  <td>{u.username}</td>
                  <td>
                    <div className="contact-cell">
                      {u.phone && <div>{u.phone}</div>}
                      {u.email && <div className="muted">{u.email}</div>}
                    </div>
                  </td>
                  <td>
                    <span className={`role-pill role-${u.role.toLowerCase()}`}>
                      {u.role === 'STAFF' ? 'Ажилтан' : 'Үйлчлүүлэгч'}
                    </span>
                  </td>
                  <td className="num">{(u.wallet?.balance ?? 0).toLocaleString()}₮</td>
                  <td className="num">{u.bonusPoints ?? 0}</td>
                  <td>
                    <button className="btn-mini" onClick={() => setSelected(u)}>Хэтэвч</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <WalletModal
          user={selected}
          delta={walletDelta}
          setDelta={setWalletDelta}
          busy={busy}
          onClose={() => { setSelected(null); setWalletDelta(''); }}
          onAction={handleWallet}
        />
      )}

      {creating && (
        <RegisterModal
          onClose={() => setCreating(false)}
          onCreated={async () => { setCreating(false); await load(); }}
        />
      )}
    </div>
  );
}

function WalletModal({ user, delta, setDelta, busy, onClose, onAction }: {
  user: User;
  delta: string;
  setDelta: (v: string) => void;
  busy: boolean;
  onClose: () => void;
  onAction: (mode: 'deposit' | 'withdraw') => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{user.fullName}</h2>
            <div className="muted small">@{user.username} · {user.id}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-stats">
          <div className="ms">
            <div className="ms-label">Хэтэвч</div>
            <div className="ms-value">{(user.wallet?.balance ?? 0).toLocaleString()}₮</div>
          </div>
          <div className="ms">
            <div className="ms-label">Бонус</div>
            <div className="ms-value">{user.bonusPoints ?? 0}</div>
          </div>
        </div>
        <div className="modal-actions">
          <label>
            Дүн (₮)
            <input
              type="number"
              min="0"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="100000"
              autoFocus
            />
          </label>
          <div className="modal-btns">
            <button className="btn-primary" disabled={busy || !delta} onClick={() => onAction('deposit')}>Цэнэглэх</button>
            <button className="btn-danger" disabled={busy || !delta} onClick={() => onAction('withdraw')}>Гаргах</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    username: '', password: '', fullName: '', phone: '', email: '',
    role: 'STAFF' as 'STAFF' | 'CUSTOMER',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.username || !form.password || !form.fullName) {
      setError('Нэвтрэх нэр, нууц үг, бүтэн нэр заавал шаардлагатай');
      return;
    }
    setBusy(true);
    try {
      await register(form);
      onCreated();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Бүртгэх үед алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Хэрэглэгч бүртгэх</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <label>
              Эрх *
              <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="STAFF">Ажилтан</option>
                <option value="CUSTOMER">Үйлчлүүлэгч</option>
              </select>
            </label>
            <label>
              Нэвтрэх нэр *
              <input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="staff01" autoFocus />
            </label>
            <label>
              Нууц үг *
              <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
            </label>
            <label className="full">
              Бүтэн нэр *
              <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Б.Болд" />
            </label>
            <label>
              Утас
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="99XXXXXX" />
            </label>
            <label>
              Имэйл
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <div className="modal-btns">
            <button className="btn-danger" onClick={onClose}>Цуцлах</button>
            <button className="btn-primary" onClick={submit} disabled={busy}>
              {busy ? 'Бүртгэж байна...' : 'Бүртгэх'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
