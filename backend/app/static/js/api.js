export const API_BASE_URL = "http://127.0.0.1:8000/api/v1";
export function getToken(){ return localStorage.getItem("access_token"); }
export function clearToken(){ localStorage.removeItem("access_token"); }
