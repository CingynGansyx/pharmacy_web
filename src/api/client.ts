import axios from 'axios';

const API_BASE = 'https://nemesis-tribesman-uneven.ngrok-free.dev/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

export default client;
