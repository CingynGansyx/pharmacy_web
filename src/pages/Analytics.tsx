import { useEffect, useMemo, useState } from 'react';
import { getMedicines, type Medicine } from '../api/medicines';
import { getAllTransactions, type Transaction } from '../api/transactions';

type Window = 7 | 14 | 30 | 90;

function fmt(n: number): string { return Math.round(n).toLocaleString() + '₮'; }

function bucketByDay(transactions: Transaction[], days: number) {
  const buckets: { date: Date; label: string; value: number; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const label = days <= 14 ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getDate()}`;
    buckets.push({ date: d, label, value: 0, count: 0 });
  }
  for (const t of transactions) {
    const td = new Date(t.dateTime);
    td.setHours(0, 0, 0, 0);
    const b = buckets.find((x) => x.date.getTime() === td.getTime());
    if (b) { b.value += t.total; b.count += 1; }
  }
  return buckets;
}

export default function Analytics() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState<Window>(7);

  useEffect(() => {
    (async () => {
      try {
        const [m, t] = await Promise.all([
          getMedicines({ page: 1, size: 1000 }),
          getAllTransactions(),
        ]);
        setMedicines(m.data.items);
        setTxns(t.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sales = useMemo(() => txns.filter((t) => t.type === 'SALE'), [txns]);
  const trend = useMemo(() => bucketByDay(sales, window), [sales, window]);
  const trendMax = Math.max(1, ...trend.map((b) => b.value));
  const totalRevenue = trend.reduce((s, b) => s + b.value, 0);
  const totalCount = trend.reduce((s, b) => s + b.count, 0);
  const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

  // === Top selling medicines (by quantity sold in window) ===
  const topSold = useMemo(() => {
    const cutoff = new Date(Date.now() - window * 86400000);
    const counter = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const t of sales) {
      if (new Date(t.dateTime) < cutoff) continue;
      for (const it of t.items) {
        const k = it.medicine.barcode;
        const cur = counter.get(k) ?? { name: it.medicine.name, qty: 0, revenue: 0 };
        cur.qty += it.quantity;
        cur.revenue += it.medicine.price * it.quantity;
        counter.set(k, cur);
      }
    }
    return [...counter.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [sales, window]);

  // === Category breakdown by stock value ===
  const catBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    for (const med of medicines) {
      const c = med.category || 'Бусад';
      m.set(c, (m.get(c) ?? 0) + med.price * med.quantity);
    }
    const arr = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
    const total = arr.reduce((s, [, v]) => s + v, 0);
    return arr.map(([name, value]) => ({ name, value, pct: total > 0 ? (value / total) * 100 : 0 }));
  }, [medicines]);

  // === Stock health ===
  const inStock = medicines.filter((m) => m.quantity > 0).length;
  const outStock = medicines.filter((m) => m.quantity === 0).length;
  const lowStock = medicines.filter((m) => m.quantity > 0 && m.quantity < 10).length;
  const insurance = medicines.filter((m) => (m.insuranceDiscountPercent ?? 0) > 0).length;
  const rx = medicines.filter((m) => m.prescriptionRequired).length;
  const otc = medicines.length - rx;

  if (loading) return <p className="loading-text">Аналитик ачааллаж байна...</p>;

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>Аналитик</h1>
        <div className="window-switch">
          {([7, 14, 30, 90] as Window[]).map((w) => (
            <button
              key={w}
              className={window === w ? 'win-active' : ''}
              onClick={() => setWindow(w)}
            >
              {w}д
            </button>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        <Stat label={`Сүүлийн ${window} хоног`} value={fmt(totalRevenue)} sub={`${totalCount} гүйлгээ`} color="primary" />
        <Stat label="Дундаж дүн" value={fmt(avgTicket)} color="success" />
        <Stat label="Нөөцтэй" value={inStock.toString()} sub={`${lowStock} багатай · ${outStock} дууссан`} color="violet" />
        <Stat label="Жортой / Жоргүй" value={`${rx} / ${otc}`} sub={`${insurance} даатгалтай`} color="amber" />
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Борлуулалтын чиг хандлага</h3>
          <span className="muted">{trend[0]?.label} → {trend[trend.length - 1]?.label}</span>
        </div>
        <div className="panel-body">
          <LineChart points={trend.map((b) => ({ x: b.label, y: b.value, max: trendMax, count: b.count }))} />
        </div>
      </div>

      <div className="grid-2col">
        <div className="panel">
          <div className="panel-header">
            <h3>Хамгийн их зарагдсан эм</h3>
            <span className="muted">{window} хоног</span>
          </div>
          <div className="panel-body">
            {topSold.length === 0 ? (
              <p className="empty-text">Борлуулалт алга</p>
            ) : (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Эм</th>
                    <th className="num">Ширхэг</th>
                    <th className="num">Орлого</th>
                  </tr>
                </thead>
                <tbody>
                  {topSold.map((m, i) => (
                    <tr key={i}>
                      <td><span className="rank">{i + 1}</span></td>
                      <td>{m.name}</td>
                      <td className="num"><strong>{m.qty}</strong></td>
                      <td className="num">{fmt(m.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Нөөцийн үнэлгээ — ангилалаар</h3>
          </div>
          <div className="panel-body">
            <DonutChart slices={catBreakdown.map((c, i) => ({ ...c, color: PIE_COLORS[i % PIE_COLORS.length] }))} />
          </div>
        </div>
      </div>
    </div>
  );
}

const PIE_COLORS = ['#2563eb', '#0ea5a4', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function LineChart({ points }: { points: { x: string; y: number; max: number; count: number }[] }) {
  const W = 720, H = 220, P = 32;
  const innerW = W - P * 2;
  const innerH = H - P * 2;
  if (points.length < 2) return <div className="empty-text">Өгөгдөл хангалтгүй</div>;
  const max = points[0].max || 1;
  const stepX = innerW / (points.length - 1);

  const coords = points.map((p, i) => ({
    cx: P + i * stepX,
    cy: P + innerH - (p.y / max) * innerH,
    label: p.x,
    value: p.y,
    count: p.count,
  }));
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.cx},${c.cy}`).join(' ');
  const area = `${path} L ${coords[coords.length - 1].cx},${P + innerH} L ${coords[0].cx},${P + innerH} Z`;

  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <line key={i} x1={P} x2={W - P} y1={P + innerH * r} y2={P + innerH * r} stroke="#f3f4f6" />
      ))}
      <path d={area} fill="#eff6ff" />
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.cx} cy={c.cy} r="2.5" fill="#2563eb">
            <title>{c.label}: {fmt(c.value)} ({c.count} гүйлгээ)</title>
          </circle>
          <text x={c.cx} y={H - 8} textAnchor="middle" fontSize="10" fill="#9ca3af">{c.label}</text>
        </g>
      ))}
    </svg>
  );
}

function DonutChart({ slices }: { slices: { name: string; value: number; pct: number; color: string }[] }) {
  if (slices.length === 0 || slices.every((s) => s.value === 0)) {
    return <div className="empty-text">Өгөгдөл алга</div>;
  }
  const total = slices.reduce((s, c) => s + c.value, 0);
  const R = 75, INNER = 50, CX = 100, CY = 100;
  let acc = -Math.PI / 2;
  const arcs = slices.map((s) => {
    const angle = (s.value / total) * Math.PI * 2;
    const start = acc;
    const end = acc + angle;
    acc = end;
    const sx = CX + Math.cos(start) * R;
    const sy = CY + Math.sin(start) * R;
    const ex = CX + Math.cos(end) * R;
    const ey = CY + Math.sin(end) * R;
    const isx = CX + Math.cos(end) * INNER;
    const isy = CY + Math.sin(end) * INNER;
    const iex = CX + Math.cos(start) * INNER;
    const iey = CY + Math.sin(start) * INNER;
    const large = angle > Math.PI ? 1 : 0;
    const d = `M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey} L ${isx} ${isy} A ${INNER} ${INNER} 0 ${large} 0 ${iex} ${iey} Z`;
    return { ...s, d };
  });

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 200 200" className="donut-svg">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color}>
            <title>{a.name}: {fmt(a.value)} ({a.pct.toFixed(1)}%)</title>
          </path>
        ))}
        <text x="100" y="98" textAnchor="middle" fontSize="11" fill="#6b7280">Нийт</text>
        <text x="100" y="115" textAnchor="middle" fontSize="14" fontWeight="700" fill="#111827">
          {fmt(total)}
        </text>
      </svg>
      <ul className="donut-legend">
        {arcs.map((a, i) => (
          <li key={i}>
            <span className="dot" style={{ background: a.color }} />
            <span className="lg-name">{a.name}</span>
            <span className="lg-pct">{a.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
