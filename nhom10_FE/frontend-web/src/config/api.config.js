const DEFAULT_BACKEND_URL = "http://localhost:3000";

export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL
).replace(/\/$/, "");

export const API_BASE_URL = `${BACKEND_URL}/api`;
