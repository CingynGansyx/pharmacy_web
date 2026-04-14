import { useEffect, useState } from 'react';
import { getMedicines, type Medicine, type MedicineParams } from '../api/medicines';

export default function MedicineList() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const fetchMedicines = async (p = page, search?: string) => {
    setLoading(true);
    try {
      const params: MedicineParams = { page: p, size: 20, sort, order };
      if (search) params.q = search;
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

  useEffect(() => {
    fetchMedicines(1);
  }, [sort, order]);

  const handleSearch = () => {
    fetchMedicines(1, keyword);
  };

  const handleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('asc');
    }
  };

  const goToPage = (p: number) => {
    fetchMedicines(p, keyword);
  };

  const sortIcon = (field: string) => {
    if (sort !== field) return ' ↕';
    return order === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="medicine-page">
      <div className="page-header">
        <h1>Эмийн жагсаалт ({totalItems})</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Эм хайх..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>Хайх</button>
        </div>
      </div>

      {loading ? (
        <p className="loading-text">Ачааллаж байна...</p>
      ) : medicines.length === 0 ? (
        <p className="empty-text">Эм олдсонгүй</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('barcode')}>
                    Баркод{sortIcon('barcode')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('name')}>
                    Нэр{sortIcon('name')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('category')}>
                    Ангилал{sortIcon('category')}
                  </th>
                  <th>Үйлдвэрлэгч</th>
                  <th className="sortable" onClick={() => handleSort('price')}>
                    Үнэ{sortIcon('price')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('quantity')}>
                    Тоо ширхэг{sortIcon('quantity')}
                  </th>
                  <th>Дуусах хугацаа</th>
                  <th>Жороор</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => (
                  <tr key={m.barcode} className={m.quantity <= 0 ? 'out-of-stock' : ''}>
                    <td>{m.barcode}</td>
                    <td>{m.name}</td>
                    <td>{m.category}</td>
                    <td>{m.manufacturer}</td>
                    <td>{m.price?.toLocaleString()}₮</td>
                    <td>{m.quantity}</td>
                    <td>{m.expiryDate}</td>
                    <td>{m.prescriptionRequired ? 'Тийм' : 'Үгүй'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                ← Өмнөх
              </button>
              <span className="page-info">
                {page} / {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
                Дараах →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
