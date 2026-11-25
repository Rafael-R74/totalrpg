const rawEnvUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const BACKEND_ORIGIN: string = rawEnvUrl
  ? rawEnvUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
  : import.meta.env.DEV
  ? 'http://localhost:3333'
  : window.location.origin;

export const API_URL: string = `${BACKEND_ORIGIN}/api`;
