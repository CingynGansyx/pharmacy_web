import client from './client';
import type { User } from './auth';

export function getAllUsers() {
  return client.get<User[]>('/users');
}

export function getUser(id: string) {
  return client.get<User>(`/users/${id}`);
}

export function depositWallet(id: string, amount: number) {
  return client.post(`/users/${id}/wallet/deposit`, { amount });
}

export function withdrawWallet(id: string, amount: number) {
  return client.post(`/users/${id}/wallet/withdraw`, { amount });
}

export function getUserTransactions(id: string) {
  return client.get(`/users/${id}/transactions`);
}
