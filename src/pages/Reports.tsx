import { useEffect, useMemo, useState } from 'react';
import { getAllTransactions, type Transaction, type TransactionType } from '../api/transactions';

type TypeFilter = 'ALL' | TransactionType;
type Range = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';

function fmt(n: number) { return Math.round(n).toLocaleString() + '₮'; }

function withinRange(iso: string, range: Range): boolean {
  if (range === 'ALL') return true;
  const d = new Date(iso);
  const now = new Date();
  if (range === 'TODAY') {
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  }
  const days = range === 'WEEK' ? 7 : 30;
  const cutoff = new Date(now.getTime() - days * 86400000);
  return d >= cutoff;
}

const TYPE_LABEL: Record<TransactionType, string> = {
  SALE: 'Борлуулалт',
  PURCHASE: 'Татан авалт',
  DEPOSIT: 'Цэнэглэлт',
  WITHDRAW: 'Гаргалт',
  REFUND: 'Буцаалт',
};

export default function Reports() {
  const [all, setAll] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<TypeFilter>('ALL');
  const [range, setRange] = useState<Range>('WEEK');
  const [q, setQ] = useState('');

  useEffect(() => {
    getAllTransactions()
      .then(({ data }) => setAll(data))
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all
      .filter((t) => type === 'ALL' || t.type === type)
      .filter((t) => withinRange(t.dateTime, range))
      .filter((t) =>
        !s ||
        t.id.toLowerCase().includes(s) ||
        (t.userId ?? '').toLowerCase().includes(s) ||
        t.items.some((i) => i.medicine.name.toLowerCase().includes(s)),
      )
      .sort((a, b) => +new Date(b.dateTime) - +new Date(a.dateTime));
  }, [all, type, range, q]);

  const totals = useMemo(() => {
    const t = { sales: 0, purchases: 0, deposit: 0, withdraw: 0, refund: 0, count: filtered.length };
    for (const x of filtered) {
      if (x.type === 'SALE') t.sales += x.total;
      else if (x.type === 'PURCHASE') t.purchases += x.total;
      else if (x.type === 'DEPOSIT') t.deposit += x.total;
      else if (x.type === 'WITHDRAW') t.withdraw += x.total;
      else if (x.type === 'REFUND') t.refund += x.total;
    }
    return t;
  }, [filtered]);

  const exportCsv = () => {
    const header = 'ID,Төрөл,Огноо,Хэрэглэгч,Эмийн тоо,Дүн,Бонус ашигласан,Хэтэвч ашигласан';
    const rows = filtered.map((t) => [
      t.id,
      TYPE_LABEL[t.type] ?? t.type,
      new Date(t.dateTime).toISOString(),
      t.userId ?? '',
      t.items.reduce((s, i) => s + i.quantity, 0),
      Math.round(t.total),
      t.bonusUsed,
      Math.round(t.walletUsed),
    ].join(','));
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-page page-fill">
      <div className="page-header">
        <h1>Тайлан</h1>
        <button className="btn-primary" onClick={exportCsv} disabled={filtered.length === 0}>
          CSV татах
        </button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="Эмийн нэр / хэрэглэгч / ID..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="filter-select" value={type} onChange={(e) => setType(e.target.value as TypeFilter)}>
          <option value="ALL">Бүх төрөл</option>
          <option value="SALE">Борлуулалт</option>
          <option value="PURCHASE">Татан авалт</option>
          <option value="DEPOSIT">Цэнэглэлт</option>
          <option value="WITHDRAW">Гаргалт</option>
          <option value="REFUND">Буцаалт</option>
        </select>
        <select className="filter-select" value={range} onChange={(e) => setRange(e.target.value as Range)}>
          <option value="TODAY">Өнөөдөр</option>
          <option value="WEEK">7 хоног</option>
          <option value="MONTH">30 хоног</option>
          <option value="ALL">Бүгд</option>
        </select>
      </div>

      <div className="totals-row">
        <Mini label="Гүйлгээ" value={totals.count.toString()} />
        <Mini label="Борлуулалт" value={fmt(totals.sales)} accent="green" />
        <Mini label="Татан авалт" value={fmt(totals.purchases)} accent="orange" />
        <Mini label="Цэнэглэлт" value={fmt(totals.deposit)} accent="blue" />
        <Mini label="Цэвэр" value={fmt(totals.sales - totals.purchases - totals.refund)} accent="violet" />
      </div>

      {loading ? (
        <p className="loading-text">Ачааллаж байна...</p>
      ) : filtered.length === 0 ? (
        <p className="empty-text">Тохирох гүйлгээ алга</p>
      ) : (
        <div className="table-wrapper scroll-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Төрөл</th>
                <th>Огноо</th>
                <th>Хэрэглэгч</th>
                <th>Эм</th>
                <th className="num">Дүн</th>
                <th className="num">Хэтэвч</th>
                <th className="num">Бонус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td><code>{t.id}</code></td>
                  <td><span className={`type-pill type-${t.type.toLowerCase()}`}>{TYPE_LABEL[t.type] ?? t.type}</span></td>
                  <td>{new Date(t.dateTime).toLocaleString('mn-MN')}</td>
                  <td>{t.userId || <span className="muted">—</span>}</td>
                  <td>
                    {t.items.length === 0 ? <span className="muted">—</span> : (
                      <div className="items-cell">
                        <div className="items-first">{t.items[0].medicine.name} × {t.items[0].quantity}</div>
                        {t.items.length > 1 && <div className="items-more">+ {t.items.length - 1} бусад</div>}
                      </div>
                    )}
                  </td>
                  <td className="num"><strong>{fmt(t.total)}</strong></td>
                  <td className="num">{t.walletUsed > 0 ? fmt(t.walletUsed) : <span className="muted">—</span>}</td>
                  <td className="num">{t.bonusUsed > 0 ? t.bonusUsed : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={`mini-stat ${accent ? `mini-${accent}` : ''}`}>
      <span className="mini-label">{label}</span>
      <span className="mini-value">{value}</span>
    </div>
  );
}
