# 🚀 Инструкция по деплою JJK Incidents

## ⚠️ ВАЖНО: Socket.io + Vercel = Проблема!

**Vercel rewrites НЕ поддерживают Socket.io**, потому что Socket.io требует сложный handshake через `/socket.io/` эндпоинт.

### ✅ Решение: Прямое подключение + HTTPS на бэкенде

Frontend подключается напрямую к бэкенду, поэтому **ОБЯЗАТЕЛЬНО нужен HTTPS** на бэкенде!

### Backend (95.81.121.225:4000)
- ✅ Порт изменён на 4000
- ✅ CORS настроен для Vercel (`https://jjk-incidents.vercel.app`)
- ✅ Socket.io настроен
- ❌ **НУЖЕН SSL сертификат!** (см. ниже)

### Frontend
- ✅ `config.ts` - прямое подключение к бэкенду
- ✅ `SocketContext.tsx` - Socket.io client
- ✅ `vite.config.ts` с proxy для локальной разработки
- ✅ Добавлены Vite зависимости в `package.json`

---

## 📋 Что нужно сделать

### ⚡ СРОЧНО: Настроить HTTPS на бэкенде

Без HTTPS браузер будет блокировать подключение (Mixed Content).

#### Вариант 1: Caddy (САМОЕ ПРОСТОЕ)

```bash
# На сервере 95.81.121.225
sudo apt install caddy

# Создать Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Содержимое Caddyfile:
```
api.jjk-incidents.ru {
    reverse_proxy localhost:4000
}
```

Запустить:
```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

**Важно:** Нужен домен (например, `api.jjk-incidents.ru`) с A-записью на `95.81.121.225`

#### Вариант 2: Nginx + Certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Создать конфиг
sudo nano /etc/nginx/sites-available/jjk-api
```

Содержимое:
```nginx
server {
    listen 80;
    server_name api.jjk-incidents.ru;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/jjk-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Получить SSL
sudo certbot --nginx -d api.jjk-incidents.ru
```

#### После настройки HTTPS:

Обновить `frontend/src/config.ts`:
```ts
export const API_URL = 'https://api.jjk-incidents.ru';
export const WS_URL = 'https://api.jjk-incidents.ru';
```

---

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
- **Socket.io НЕ работает через Vercel rewrites** - используется прямое подключение
- **ОБЯЗАТЕЛЬНО нужен HTTPS на бэкенде** - иначе браузер блокирует Mixed Content
- Без SSL игра **НЕ БУДЕТ работать** на продакшене (HTTPS → HTTP блокируется)
- Vite proxy используется только для локальной разработки

---

## 🎯 Краткий чеклист

- [ ] **Получить домен** (например, через Cloudflare, Namecheap)
- [ ] **Настроить DNS:** A-запись `api.jjk-incidents.ru` → `95.81.121.225`
- [ ] **Установить Caddy** на сервере: `sudo apt install caddy`
- [ ] **Создать Caddyfile** с конфигом reverse proxy
- [ ] **Обновить `frontend/src/config.ts`** на HTTPS URL
- [ ] **Закоммитить и задеплоить** на Vercel
- [ ] **Протестировать** подключение

**После этого игра будет работать на продакшене!** 🎮✨

