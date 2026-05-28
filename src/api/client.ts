import axios from "axios";

const API_BASE = "https://pharmacy-production-b3d1.up.railway.app/api";

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export default client;
