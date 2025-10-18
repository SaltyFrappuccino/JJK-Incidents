# JJK Incidents - Frontend

Фронтенд для социальной дедукционной игры "Инциденты Дзюдзюцу".

## 🛠️ Технологии

- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик и dev-сервер
- **Socket.io** - real-time коммуникация

## 🚀 Запуск локально

### Установка зависимостей

```bash
npm install
# или
yarn install
# или
pnpm install
```

### Запуск dev-сервера

```bash
npm run dev
```

Откроется `http://localhost:5173`

Vite автоматически проксирует запросы к бэкенду (настроено в `vite.config.ts`):
- `/api/*` → `http://95.81.121.225:4000/api/*`
- `/socket.io/*` → `http://95.81.121.225:4000/socket.io/*`

### Сборка для продакшена

```bash
npm run build
```

Результат в `dist/`

### Предпросмотр prod-сборки

```bash
npm run preview
```

## 📦 Деплой на Vercel

### Через CLI

```bash
npm run build
vercel --prod
```

### Через GitHub

1. Подключите репозиторий в Vercel Dashboard
2. Настройки:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

Vercel автоматически проксирует запросы через `vercel.json`:
- `/api/*` → бэкенд
- `/socket.io/*` → бэкенд WebSocket

## 🌐 Production URLs

- **Frontend:** https://jjk-incidents.vercel.app
- **Backend:** http://95.81.121.225:4000

## 📝 Структура проекта

```
frontend/
├── src/
│   ├── components/      # React компоненты
│   │   ├── Game/       # Игровые компоненты
│   │   └── Lobby/      # Лобби компоненты
│   ├── contexts/       # React contexts (Socket, Game, Music)
│   ├── admin/          # Админ-панель
│   ├── config.ts       # Конфигурация API URLs
│   ├── App.tsx         # Главный компонент
│   └── frontend.tsx    # Entry point
├── public/             # Статичные файлы
├── index.html          # HTML entry point
├── vite.config.ts      # Vite конфигурация
├── vercel.json         # Vercel rewrites
└── package.json        # Зависимости и скрипты
```

## 🐛 Отладка

### Проблемы с WebSocket

Проверьте консоль браузера:
```
Connecting to WebSocket server: <URL>
```

Если видите ошибки CORS или Mixed Content - убедитесь что:
1. Бэкенд запущен на `95.81.121.225:4000`
2. В `backend/src/server.ts` есть ваш домен в `allowedOrigins`

**Примечание:** Socket.io использует только HTTP long-polling (не WebSocket), потому что Vercel не поддерживает WebSocket rewrites. Это нормально и работает отлично!

### API запросы не работают

Проверьте:
1. `vercel.json` - rewrites настроены
2. `vite.config.ts` - proxy настроен (для локальной разработки)
3. `src/config.ts` - пути корректные (`''` для продакшена)

## 📚 Полезные ссылки

- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [Vercel Docs](https://vercel.com/docs)
