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

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  phone?: string;
  email?: string;
  role?: 'CUSTOMER' | 'STAFF';
}

export function login(data: LoginRequest) {
  return client.post<User>('/auth/login', data);
}

export function register(data: RegisterRequest) {
  return client.post<User>('/auth/register', data);
}
