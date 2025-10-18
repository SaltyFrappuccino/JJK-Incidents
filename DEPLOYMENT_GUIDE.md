# 🚀 Инструкция по деплою JJK Incidents

## ✅ Что уже сделано

### Backend (95.81.121.225:4000)
- ✅ Порт изменён на 4000
- ✅ CORS настроен для Vercel (`https://jjk-incidents.vercel.app`)
- ✅ Socket.io настроен с поддержкой polling

### Frontend
- ✅ Создан `vercel.json` с rewrites для проксирования
- ✅ `config.ts` использует относительные пути
- ✅ `SocketContext.tsx` подключается к текущему origin
- ✅ `vite.config.ts` с proxy для локальной разработки
- ✅ Добавлены Vite зависимости в `package.json`

---

## 📋 Что нужно сделать

### 1. Установить зависимости на фронтенде

```bash
cd frontend
npm install
# или
yarn install
# или
pnpm install
```

Это установит все необходимые зависимости включая Vite.

### 2. Проверить локально (опционально)

```bash
# В одном терминале - бэкенд
cd backend
npm run dev

# В другом терминале - фронтенд
cd frontend
npm run dev
```

Фронтенд будет работать на `http://localhost:5173` (Vite по умолчанию) и проксировать запросы к бэкенду через `vite.config.ts`.

### 3. Задеплоить на Vercel

#### Через Vercel CLI:
```bash
cd frontend
npm run build
vercel --prod
```

#### Через GitHub:
1. Закоммитить изменения:
```bash
git add .
git commit -m "Migrate from Bun to Vite + setup Vercel proxy"
git push
```

2. В Vercel Dashboard:
   - Подключить репозиторий
   - Root Directory: `frontend`
   - Framework Preset: `Vite`
   - Build Command: `npm run build` (или `yarn build`)
   - Output Directory: `dist`
   - Install Command: `npm install` (или оставить пустым для автоопределения)

### 4. Проверить что бэкенд запущен

```bash
# На сервере 95.81.121.225
cd ~/jjk-incidents/backend
npm run dev
```

Должно быть:
```
🚀 Jujutsu Incidents server running on port 4000
📊 Database initialized at: ./src/database/missions.db
🌐 CORS enabled for: ...
🔌 Socket.io server ready for connections
```

---

## 🔍 Как это работает

### Локальная разработка
```
Browser → http://localhost:5173/api/... 
       → Vite Proxy 
       → http://95.81.121.225:4000/api/...
```

### Продакшен на Vercel
```
Browser → https://jjk-incidents.vercel.app/api/...
       → Vercel Rewrites
       → http://95.81.121.225:4000/api/...
```

**Важно:** Vercel rewrites обходят Mixed Content Security Policy, потому что запросы идут через серверную часть Vercel, а не напрямую из браузера.

---

## 🐛 Проблемы и решения

### WebSocket не подключается
- **Проблема:** Vercel не поддерживает WebSocket rewrites (serverless ограничение)
- **Решение:** Socket.io использует **только HTTP long-polling** через `/socket.io/*` rewrite
- **Важно:** В `SocketContext.tsx` указан `transports: ['polling']` - это нормально и работает!

### Ошибка CORS
- **Проблема:** Backend блокирует запросы
- **Решение:** Убедитесь что в `backend/src/server.ts` есть Vercel домен в `allowedOrigins`

### 404 на /api запросах
- **Проблема:** Vercel не видит rewrites
- **Решение:** Проверьте что `vercel.json` находится в корне фронтенда

---

## 📝 Примечания

- **Бэкенд должен быть всегда запущен** на `95.81.121.225:4000`
- **Vercel rewrites работают только в продакшене**, локально используется Vite proxy
- **Socket.io использует только HTTP long-polling** (Vercel не поддерживает WebSocket rewrites)
- Polling работает отлично для игры - задержка ~100-200ms вместо <50ms WebSocket
- Для полноценного WebSocket нужен SSL на бэкенде (Caddy + домен) + прямое подключение

---

## 🎯 Следующие шаги (опционально)

Для улучшения производительности и безопасности:

1. Получить домен (например, `api.jjk-incidents.ru`)
2. Настроить DNS: A-запись → `95.81.121.225`
3. Установить Caddy:
```bash
sudo apt install caddy
```

4. Настроить Caddyfile:
```
api.jjk-incidents.ru {
    reverse_proxy localhost:4000
}
```

5. Обновить `frontend/src/config.ts`:
```ts
export const API_URL = 'https://api.jjk-incidents.ru';
export const WS_URL = 'https://api.jjk-incidents.ru';
```

6. Удалить `vercel.json` (прямые запросы будут работать через HTTPS)

