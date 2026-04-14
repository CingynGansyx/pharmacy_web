import client from './client';

export interface User {
  id: number;
  username: string;
  fullName: string;
  phone: string;
  email: string;
  role: 'CUSTOMER' | 'STAFF';
  wallet: { balance: number };
  bonusPoints: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export function login(data: LoginRequest) {
  return client.post<User>('/auth/login', data);
}
