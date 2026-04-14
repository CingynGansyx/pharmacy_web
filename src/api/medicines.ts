import client from './client';

export interface Medicine {
  barcode: string;
  name: string;
  tag: string;
  description: string;
  price: number;
  quantity: number;
  manufacturer: string;
  category: string;
  expiryDate: string;
  prescriptionRequired: boolean;
}

export interface MedicinePage {
  items: Medicine[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface ImportedRow {
  row: number;
  barcode: string;
  name: string;
  action: string;
  quantity: number;
}

export interface ImportError {
  row: number;
  error: string;
}

export interface ImportResult {
  totalImported: number;
  totalErrors: number;
  imported: ImportedRow[];
  errors: ImportError[];
}

export interface MedicineParams {
  q?: string;
  category?: string;
  manufacturer?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  prescriptionRequired?: string;
  sort?: string;
  order?: string;
  page?: number;
  size?: number;
}

export function getMedicines(params?: MedicineParams) {
  return client.get<MedicinePage>('/medicines', { params });
}

export function searchMedicines(q: string) {
  return client.get<Medicine[]>('/medicines/search', { params: { q } });
}

export function getMedicine(barcode: string) {
  return client.get<Medicine>(`/medicines/${barcode}`);
}

export function createMedicine(data: Partial<Medicine>) {
  return client.post<Medicine>('/medicines', data);
}

export function addStock(barcode: string, amount: number) {
  return client.post<Medicine>(`/medicines/${barcode}/stock`, { amount });
}

export function importExcel(file: File) {
  const form = new FormData();
  form.append('file', file);
  return client.post<ImportResult>('/medicines/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
