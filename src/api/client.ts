import axios from "axios";

const API_BASE = "https://pharmacy-kr00.onrender.com/api";

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export default client;
