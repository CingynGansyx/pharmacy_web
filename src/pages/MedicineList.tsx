import { useEffect, useMemo, useState } from 'react';
import { getMedicines, type Medicine, type MedicineParams, discountedPrice } from '../api/medicines';

type StockFilter = 'ALL' | 'IN' | 'OUT' | 'LOW';
type RxFilter = 'ALL' | 'RX' | 'OTC';
type InsuranceFilter = 'ALL' | 'INS';

export default function MedicineList() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Filter state
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');
  const [rxFilter, setRxFilter] = useState<RxFilter>('ALL');
  const [insFilter, setInsFilter] = useState<InsuranceFilter>('ALL');

  const fetchPage = async (p = 1) => {
    setLoading(true);
    try {
      const params: MedicineParams = { page: p, size: 25, sort, order };
      if (keyword) params.q = keyword;
      if (category) params.category = category;
      if (manufacturer) params.manufacturer = manufacturer;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (stockFilter === 'IN') params.inStock = 'true';
      if (rxFilter === 'RX') params.prescriptionRequired = 'true';
      else if (rxFilter === 'OTC') params.prescriptionRequired = 'false';
      const { data } = await getMedicines(params);
      setMedicines(data.items);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
    } catch {
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when sort/order/filters change (debounced for text)
  useEffect(() => {
    const t = setTimeout(() => fetchPage(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, order, category, manufacturer, minPrice, maxPrice, stockFilter, rxFilter]);

  // Client-side filters (stockFilter LOW/OUT and insurance — backend doesn't support yet)
  const visible = useMemo(() => {
    let list = medicines;
    if (stockFilter === 'OUT') list = list.filter((m) => m.quantity === 0);
    else if (stockFilter === 'LOW') list = list.filter((m) => m.quantity > 0 && m.quantity < 10);
    if (insFilter === 'INS') list = list.filter((m) => (m.insuranceDiscountPercent ?? 0) > 0);
    return list;
  }, [medicines, stockFilter, insFilter]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    medicines.forEach((m) => m.category && s.add(m.category));
    return [...s].sort();
  }, [medicines]);

  const manufacturers = useMemo(() => {
    const s = new Set<string>();
    medicines.forEach((m) => m.manufacturer && s.add(m.manufacturer));
    return [...s].sort();
  }, [medicines]);

  const flipSort = (field: string) => {
    if (sort === field) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setSort(field); setOrder('asc'); }
  };
  const sortIcon = (f: string) => sort !== f ? ' ↕' : order === 'asc' ? ' ↑' : ' ↓';

  const clearFilters = () => {
    setKeyword(''); setCategory(''); setManufacturer('');
    setMinPrice(''); setMaxPrice('');
    setStockFilter('ALL'); setRxFilter('ALL'); setInsFilter('ALL');
  };

  const activeFilterCount =
    [keyword, category, manufacturer, minPrice, maxPrice].filter(Boolean).length +
    (stockFilter !== 'ALL' ? 1 : 0) +
    (rxFilter !== 'ALL' ? 1 : 0) +
    (insFilter !== 'ALL' ? 1 : 0);

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <h1>Эмийн жагсаалт</h1>
          <p className="page-sub">{visible.length} / {totalItems} харагдаж байна</p>
        </div>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Нэр / баркод / INN..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPage(1)}
          />
          <button onClick={() => fetchPage(1)}>Хайх</button>
        </div>
      </div>

      <div className="filter-card">
        <div className="filter-row">
          <div className="filter-group">
            <label>Ангилал</label>
            <select className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Бүгд</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Үйлдвэрлэгч</label>
            <select className="filter-select" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)}>
              <option value="">Бүгд</option>
              {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Үнэ (мин)</label>
            <input className="filter-input" type="number" placeholder="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Үнэ (макс)</label>
            <input className="filter-input" type="number" placeholder="100000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
        </div>

        <div className="filter-row chip-row">
          <ChipGroup
            label="Нөөц"
            value={stockFilter}
            onChange={(v) => setStockFilter(v as StockFilter)}
            options={[
              { v: 'ALL', l: 'Бүгд' },
              { v: 'IN', l: 'Нөөцтэй' },
              { v: 'LOW', l: 'Бага (<10)' },
              { v: 'OUT', l: 'Дууссан' },
            ]}
          />
          <ChipGroup
            label="Жор"
            value={rxFilter}
            onChange={(v) => setRxFilter(v as RxFilter)}
            options={[
              { v: 'ALL', l: 'Бүгд' },
              { v: 'OTC', l: 'Жоргүй' },
              { v: 'RX', l: 'Жортой' },
            ]}
          />
          <ChipGroup
            label="Даатгал"
            value={insFilter}
            onChange={(v) => setInsFilter(v as InsuranceFilter)}
            options={[
              { v: 'ALL', l: 'Бүгд' },
              { v: 'INS', l: 'Хөнгөлөлттэй' },
            ]}
          />
          {activeFilterCount > 0 && (
            <button className="btn-ghost" onClick={clearFilters}>
              Шүүлтүүр цэвэрлэх ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="loading-text">Ачааллаж байна...</p>
      ) : visible.length === 0 ? (
        <p className="empty-text">Тохирох эм олдсонгүй</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => flipSort('barcode')}>Баркод{sortIcon('barcode')}</th>
                  <th className="sortable" onClick={() => flipSort('name')}>Нэр / INN{sortIcon('name')}</th>
                  <th>ATC</th>
                  <th className="sortable" onClick={() => flipSort('category')}>Ангилал{sortIcon('category')}</th>
                  <th>Хэлбэр</th>
                  <th className="sortable num" onClick={() => flipSort('price')}>Үнэ{sortIcon('price')}</th>
                  <th className="num">Даатгал</th>
                  <th className="sortable num" onClick={() => flipSort('quantity')}>Нөөц{sortIcon('quantity')}</th>
                  <th>Жор</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => {
                  const hasDiscount = (m.insuranceDiscountPercent ?? 0) > 0;
                  return (
                    <tr key={m.barcode} className={m.quantity <= 0 ? 'out-of-stock' : ''}>
                      <td><code>{m.barcode}</code></td>
                      <td>
                        <div><strong>{m.name}</strong></div>
                        {m.innName && <div className="muted small">{m.innName}</div>}
                      </td>
                      <td>{m.atcCode ? <span className="atc-pill">{m.atcCode}</span> : <span className="muted">—</span>}</td>
                      <td>{m.category || '—'}</td>
                      <td className="small">{m.form || '—'}</td>
                      <td className="num">
                        {hasDiscount ? (
                          <div>
                            <div className="orig-price">{m.price.toLocaleString()}₮</div>
                            <div className="disc-price">{Math.round(discountedPrice(m)).toLocaleString()}₮</div>
                          </div>
                        ) : (
                          <strong>{m.price.toLocaleString()}₮</strong>
                        )}
                      </td>
                      <td className="num">
                        {hasDiscount
                          ? <span className="ins-pill">−{m.insuranceDiscountPercent}%</span>
                          : <span className="muted">—</span>}
                      </td>
                      <td className="num">
                        <span className={stockBadge(m.quantity)}>
                          {m.quantity === 0 ? 'Дууссан' : `${m.quantity}ш`}
                        </span>
                      </td>
                      <td>{m.prescriptionRequired ? <span className="rx-pill">Жортой</span> : <span className="muted">Жоргүй</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => fetchPage(page - 1)}>← Өмнөх</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => fetchPage(page + 1)}>Дараах →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function stockBadge(q: number): string {
  if (q === 0) return 'stock-pill stock-out';
  if (q < 10) return 'stock-pill stock-low';
  return 'stock-pill stock-ok';
}

function ChipGroup<V extends string>({ label, value, onChange, options }: {
  label: string;
  value: V;
  onChange: (v: V) => void;
  options: { v: V; l: string }[];
}) {
  return (
    <div className="chip-group">
      <span className="chip-group-label">{label}:</span>
      {options.map((o) => (
        <button
          key={o.v}
          className={`chip ${value === o.v ? 'chip-active' : ''}`}
          onClick={() => onChange(o.v)}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
