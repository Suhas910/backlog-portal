import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

export function getAdminToken() {
  return sessionStorage.getItem("adminToken");
}

export function getAdminHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default api;
