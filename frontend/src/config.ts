// API Configuration
// В продакшене используем относительные пути (Vercel rewrites)
// В dev-режиме vite.config.ts проксирует на бэкенд
export const API_URL = import.meta.env?.VITE_API_URL || '';
export const WS_URL = import.meta.env?.VITE_WS_URL || '';

