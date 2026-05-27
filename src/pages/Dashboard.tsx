import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMedicines, type Medicine } from '../api/medicines';
import { getAllUsers } from '../api/users';
import { getAllTransactions, getSummary, type Transaction, type Summary } from '../api/transactions';
import type { User } from '../api/auth';

function formatMnt(n: number): string {
  return Math.round(n).toLocaleString() + '₮';
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Dashboard() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [medRes, userRes, txnRes, sumRes] = await Promise.all([
          getMedicines({ page: 1, size: 1000 }),
          getAllUsers(),
          getAllTransactions(),
          getSummary(),
        ]);
        setMedicines(medRes.data.items);
        setUsers(userRes.data);
        setTransactions(txnRes.data);
        setSummary(sumRes.data);
      } catch {
        // soft-fail, leave empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="loading-text">Дашбоард ачааллаж байна...</p>;

  // === stats ===
  const totalMedicines = medicines.length;
  const outOfStock = medicines.filter((m) => m.quantity <= 0).length;
  const lowStock = medicines.filter((m) => m.quantity > 0 && m.quantity < 10).length;
  const insuranceCount = medicines.filter((m) => (m.insuranceDiscountPercent ?? 0) > 0).length;
  const rxCount = medicines.filter((m) => m.prescriptionRequired).length;
  const customerCount = users.filter((u) => u.role === 'CUSTOMER').length;
  const inventoryValue = medicines.reduce((s, m) => s + m.price * m.quantity, 0);

  const sales = transactions.filter((t) => t.type === 'SALE');
  const todaySales = sales.filter((t) => isToday(t.dateTime));
  const todayRevenue = todaySales.reduce((s, t) => s + t.total, 0);

  // === Last 7 days revenue chart ===
  const sparkBuckets: { date: Date; label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    sparkBuckets.push({ date: d, label: `${d.getMonth() + 1}/${d.getDate()}`, value: 0 });
  }
  for (const t of sales) {
    const td = new Date(t.dateTime);
    td.setHours(0, 0, 0, 0);
    const b = sparkBuckets.find((x) => x.date.getTime() === td.getTime());
    if (b) b.value += t.total;
  }
  const sparkMax = Math.max(1, ...sparkBuckets.map((b) => b.value));

  // === Category breakdown ===
  const catMap = new Map<string, number>();
  for (const m of medicines) {
    const c = m.category || 'Бусад';
    catMap.set(c, (catMap.get(c) ?? 0) + m.quantity);
  }
  const topCategories = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const catMaxQty = Math.max(1, ...topCategories.map(([, v]) => v));

  // === Top medicines (out of stock + alerts first) ===
  const stockAlerts = medicines
    .filter((m) => m.quantity < 10)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 6);

  const recentTxns = [...transactions]
    .sort((a, b) => +new Date(b.dateTime) - +new Date(a.dateTime))
    .slice(0, 8);

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Дашбоард</h1>
      </div>

      {/* === Stat cards === */}
      <div className="stat-grid">
        <StatCard
          label="Өнөөдрийн борлуулалт"
          value={formatMnt(todayRevenue)}
          sub={`${todaySales.length} гүйлгээ`}
          color="primary"
        />
        <StatCard
          label="Нийт борлуулалт"
          value={formatMnt(summary?.totalSales ?? 0)}
          sub={`${sales.length} нийт`}
          color="success"
        />
        <StatCard
          label="Эмийн нөөц"
          value={formatMnt(inventoryValue)}
          sub={`${totalMedicines} төрөл`}
          color="violet"
        />
        <StatCard
          label="Хэрэглэгч"
          value={customerCount.toString()}
          sub={`нийт ${users.length}`}
          color="cyan"
        />
        <StatCard
          label="Дууссан эм"
          value={outOfStock.toString()}
          sub={`${lowStock} нөөц багатай`}
          color={outOfStock > 0 ? 'danger' : 'muted'}
        />
        <StatCard
          label="Даатгалтай"
          value={insuranceCount.toString()}
          sub={`${rxCount} жортой`}
          color="amber"
        />
      </div>

      {/* === Charts row === */}
      <div className="grid-2col">
        <Panel title="Сүүлийн 7 хоногийн борлуулалт">
          <BarChart bars={sparkBuckets.map((b) => ({ label: b.label, value: b.value, max: sparkMax }))} />
          <div className="chart-footer">
            <span>Нийт: {formatMnt(sparkBuckets.reduce((s, b) => s + b.value, 0))}</span>
          </div>
        </Panel>

        <Panel title="Ангилал тус бүрийн нөөц">
          {topCategories.length === 0 ? (
            <p className="empty-text">Өгөгдөл алга</p>
          ) : (
            <div className="cat-list">
              {topCategories.map(([cat, qty]) => (
                <div className="cat-row" key={cat}>
                  <div className="cat-row-top">
                    <span className="cat-name">{cat}</span>
                    <span className="cat-qty">{qty} ш</span>
                  </div>
                  <div className="cat-bar">
                    <div className="cat-bar-fill" style={{ width: `${(qty / catMaxQty) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* === Alerts & Recent === */}
      <div className="grid-2col">
        <Panel title="Нөөцийн анхааруулга" action={<Link to="/medicines?inStock=true" className="panel-link">Бүгд →</Link>}>
          {stockAlerts.length === 0 ? (
            <p className="empty-text">Анхааруулга алга</p>
          ) : (
            <ul className="alert-list">
              {stockAlerts.map((m) => (
                <li key={m.barcode} className={m.quantity === 0 ? 'alert-out' : 'alert-low'}>
                  <div className="alert-info">
                    <div className="alert-name">{m.name}</div>
                    <div className="alert-sub">{m.category || '—'} · {m.barcode}</div>
                  </div>
                  <span className={`alert-badge ${m.quantity === 0 ? 'badge-out' : 'badge-low'}`}>
                    {m.quantity === 0 ? 'ДУУССАН' : `${m.quantity}ш`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Сүүлийн гүйлгээ" action={<Link to="/reports" className="panel-link">Бүгд →</Link>}>
          {recentTxns.length === 0 ? (
            <p className="empty-text">Гүйлгээ алга</p>
          ) : (
            <ul className="txn-list">
              {recentTxns.map((t) => (
                <li key={t.id}>
                  <div className="txn-info">
                    <div className="txn-type">
                      <span className={`type-pill type-${t.type.toLowerCase()}`}>{txnLabel(t.type)}</span>
                      <span className="txn-id">#{t.id}</span>
                    </div>
                    <div className="txn-date">{new Date(t.dateTime).toLocaleString('mn-MN')}</div>
                  </div>
                  <div className={`txn-amount ${t.type === 'SALE' ? 'amt-in' : 'amt-out'}`}>
                    {t.type === 'SALE' ? '+' : '−'}{formatMnt(t.total)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function txnLabel(t: string): string {
  switch (t) {
    case 'SALE': return 'Борлуулалт';
    case 'PURCHASE': return 'Татан авалт';
    case 'DEPOSIT': return 'Цэнэглэлт';
    case 'WITHDRAW': return 'Гаргалт';
    case 'REFUND': return 'Буцаалт';
    default: return t;
  }
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{title}</h3>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

function BarChart({ bars }: { bars: { label: string; value: number; max: number }[] }) {
  return (
    <div className="bar-chart">
      {bars.map((b, i) => {
        const height = b.max > 0 ? Math.max(2, (b.value / b.max) * 100) : 2;
        return (
          <div className="bar-col" key={i}>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${height}%` }} title={`${b.label}: ${formatMnt(b.value)}`} />
            </div>
            <div className="bar-label">{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}
