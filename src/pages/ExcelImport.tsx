import { useState, useRef, type ChangeEvent } from 'react';
import { importExcel, type ImportResult } from '../api/medicines';

const COLUMNS = [
  { name: 'barcode', label: 'Баркод', required: true, example: '8800001' },
  { name: 'name', label: 'Нэр', required: true, example: 'Парацетамол 500мг' },
  { name: 'innName', label: 'INN', required: false, example: 'Paracetamol' },
  { name: 'atcCode', label: 'ATC', required: false, example: 'N02BE01' },
  { name: 'form', label: 'Хэлбэр', required: false, example: 'Шахмал' },
  { name: 'category', label: 'Ангилал', required: false, example: 'Анальгетик' },
  { name: 'manufacturer', label: 'Үйлдвэрлэгч', required: false, example: 'Монфарм' },
  { name: 'price', label: 'Үнэ', required: false, example: '2500' },
  { name: 'quantity', label: 'Тоо ширхэг', required: false, example: '100' },
  { name: 'expiryDate', label: 'Дуусах хугацаа', required: false, example: '2027-05-28' },
  { name: 'prescriptionRequired', label: 'Жортой', required: false, example: 'false / true' },
  { name: 'insuranceDiscountPercent', label: 'Даатгал %', required: false, example: '70' },
  { name: 'description', label: 'Тайлбар', required: false, example: 'Толгой өвдөх, халуун' },
];

function downloadTemplate() {
  // Build a tab-separated example file that opens cleanly in Excel
  const header = COLUMNS.map((c) => c.name).join('\t');
  const example = COLUMNS.map((c) => c.example).join('\t');
  const csv = '﻿' + [header, example].join('\n');
  const blob = new Blob([csv], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pharmacy-template.tsv';
  a.click();
  URL.revokeObjectURL(url);
}

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
      setError('Файл оруулахад алдаа гарлаа. Excel файлын баганын нэрсийг шалгана уу.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="import-page">
      <div className="page-header">
        <h1>Excel импорт</h1>
        <button className="btn-mini" onClick={downloadTemplate}>Загвар татах</button>
      </div>

      <div className="schema-card">
        <div className="schema-header">Дэмжигдэх багана</div>
        <div className="schema-grid">
          {COLUMNS.map((c) => (
            <div key={c.name} className="schema-row">
              <div className="schema-col-name">
                <code>{c.name}</code>
                {c.required && <span className="req-tag">*</span>}
              </div>
              <div className="schema-col-label">{c.label}</div>
              <div className="schema-col-example muted small">{c.example}</div>
            </div>
          ))}
        </div>
        <div className="schema-note muted small">
          Эхний мөр баганын нэр (header) байх. Зөвхөн <code>barcode</code> ба <code>name</code> заавал шаардлагатай — бусад нь хоосон байж болно.
          Англи болон монгол баганын нэрс хоёулаа дэмжигдэнэ (жш: <code>name</code> = <code>нэр</code>).
        </div>
      </div>

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
                      <th>Тоо</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.imported.map((item, i) => (
                      <tr key={i}>
                        <td>{item.row}</td>
                        <td><code>{item.barcode}</code></td>
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
              <h3>Алдаа</h3>
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
