import axios from "axios";

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 30000,
});

export default api;
