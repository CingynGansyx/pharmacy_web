import { useState, useRef, type ChangeEvent } from 'react';
import { importExcel, type ImportResult } from '../api/medicines';

export default function ExcelImport() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await importExcel(file);
      setResult(data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setError('Файл оруулахад алдаа гарлаа. Excel файл зөв эсэхийг шалгана уу.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="import-page">
      <h1>Excel файл оруулах</h1>
      <p className="import-desc">
        Эмийн мэдээллийг Excel (.xlsx, .xls) файлаар оруулна уу.
      </p>

      <div className="upload-area">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
        {file && <p className="file-name">Сонгосон файл: {file.name}</p>}
        <button onClick={handleUpload} disabled={!file || loading}>
          {loading ? 'Оруулж байна...' : 'Оруулах'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div className="import-result">
          <h2>Үр дүн</h2>
          <div className="result-summary">
            <div className="result-card success">
              <span className="result-number">{result.totalImported}</span>
              <span className="result-label">Амжилттай</span>
            </div>
            <div className="result-card error">
              <span className="result-number">{result.totalErrors}</span>
              <span className="result-label">Алдаатай</span>
            </div>
          </div>

          {result.imported.length > 0 && (
            <div className="import-detail">
              <h3>Амжилттай оруулсан</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Мөр</th>
                      <th>Баркод</th>
                      <th>Нэр</th>
                      <th>Үйлдэл</th>
                      <th>Тоо ширхэг</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.imported.map((item, i) => (
                      <tr key={i}>
                        <td>{item.row}</td>
                        <td>{item.barcode}</td>
                        <td>{item.name}</td>
                        <td>{item.action}</td>
                        <td>{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="error-list">
              <h3>Алдааны жагсаалт</h3>
              <ul>
                {result.errors.map((err, i) => (
                  <li key={i}>Мөр {err.row}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
