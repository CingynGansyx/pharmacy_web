import { useEffect, useMemo, useState } from 'react';
import { getAllUsers, depositWallet, withdrawWallet } from '../api/users';
import type { User } from '../api/auth';

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
      .filter((u) =>
        !s ||
        u.fullName?.toLowerCase().includes(s) ||
        u.username?.toLowerCase().includes(s) ||
        u.phone?.includes(s) ||
        u.email?.toLowerCase().includes(s),
      );
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
    } catch {
      // ignore — keep UI calm
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="customers-page">
      <div className="page-header">
        <h1>Хэрэглэгчид <span className="muted small">({filtered.length})</span></h1>
        <span className="muted small">
          Хэтэвч {totalBalance.toLocaleString()}₮ · Бонус {totalBonus.toLocaleString()}
        </span>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Нэр, утас, имэйл, нэвтрэх нэрээр хайх..."
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

      {loading ? (
        <p className="loading-text">Ачааллаж байна...</p>
      ) : filtered.length === 0 ? (
        <p className="empty-text">Хэрэглэгч олдсонгүй</p>
      ) : (
        <div className="table-wrapper">
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
                <th>Үйлдэл</th>
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
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selected.fullName}</h2>
                <div className="muted">@{selected.username} · {selected.id}</div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-stats">
              <div className="ms">
                <div className="ms-label">Хэтэвчний үлдэгдэл</div>
                <div className="ms-value">{(selected.wallet?.balance ?? 0).toLocaleString()}₮</div>
              </div>
              <div className="ms">
                <div className="ms-label">Бонус оноо</div>
                <div className="ms-value">{selected.bonusPoints ?? 0}</div>
              </div>
            </div>
            <div className="modal-actions">
              <label>
                Дүн (₮)
                <input
                  type="number"
                  min="0"
                  value={walletDelta}
                  onChange={(e) => setWalletDelta(e.target.value)}
                  placeholder="100000"
                  autoFocus
                />
              </label>
              <div className="modal-btns">
                <button className="btn-primary" disabled={busy || !walletDelta} onClick={() => handleWallet('deposit')}>
                  Цэнэглэх
                </button>
                <button className="btn-danger" disabled={busy || !walletDelta} onClick={() => handleWallet('withdraw')}>
                  Гаргах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
