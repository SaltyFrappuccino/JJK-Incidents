// API Configuration
// Для Socket.io нужно прямое подключение к бэкенду (Vercel rewrites не поддерживают Socket.io)
export const API_URL = import.meta.env?.VITE_API_URL || 'http://95.81.121.225:4000';
export const WS_URL = import.meta.env?.VITE_WS_URL || 'http://95.81.121.225:4000';

