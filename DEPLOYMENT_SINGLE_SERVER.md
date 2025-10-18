# 🚀 Деплой на одном сервере (95.81.121.225)

## Преимущества этого подхода

✅ **Никаких проблем с CORS** - всё на одном домене
✅ **Socket.io работает отлично** - Caddy проксирует WebSocket
✅ **Простая настройка** - один конфиг, один SSL сертификат
✅ **Быстрее** - нет задержек между Vercel и вашим сервером

---

## 📋 Пошаговая инструкция

### Шаг 1: Получить домен

Зарегистрировать домен (например, `jjk-incidents.ru`) через:
- Cloudflare
- Namecheap
- REG.RU

Настроить DNS:
```
A запись: @ → 95.81.121.225
A запись: www → 95.81.121.225
```

Подождать 5-30 минут пока DNS обновится.

---

### Шаг 2: Установить Caddy на сервере

```bash
# Подключиться к серверу
ssh root@95.81.121.225

# Установить Caddy
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

---

### Шаг 3: Создать директорию для фронтенда

```bash
sudo mkdir -p /var/www/jjk-incidents
sudo chown -R $USER:$USER /var/www/jjk-incidents
```

---

### Шаг 4: Настроить Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

**Содержимое:**

```
jjk-incidents.ru {
    # Логирование
    log {
        output file /var/log/caddy/jjk-incidents.log
    }

    # Проксируем API на бэкенд
    handle /api/* {
        reverse_proxy localhost:4000
    }

    # Проксируем Socket.io на бэкенд
    handle /socket.io/* {
        reverse_proxy localhost:4000 {
            # Важно для WebSocket
            header_up Connection {http.request.header.Connection}
            header_up Upgrade {http.request.header.Upgrade}
        }
    }

    # Раздаем статичный фронтенд
    handle {
        root * /var/www/jjk-incidents
        try_files {path} /index.html
        file_server
    }

    # Сжатие
    encode gzip

    # Кэширование статики
    @static {
        path *.js *.css *.png *.jpg *.svg *.woff *.woff2
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
}
```

Сохранить: `Ctrl+O`, `Enter`, `Ctrl+X`

**Важно:** Замените `jjk-incidents.ru` на ваш реальный домен!

---

### Шаг 5: Собрать фронтенд локально

```bash
# На вашем компьютере
cd frontend
npm install
npm run build
```

Результат будет в `frontend/dist/`

---

### Шаг 6: Загрузить фронтенд на сервер

```bash
# На вашем компьютере (из корня проекта)
scp -r frontend/dist/* root@95.81.121.225:/var/www/jjk-incidents/
```

Или через SFTP/FileZilla/WinSCP - загрузить содержимое `frontend/dist/` в `/var/www/jjk-incidents/`

---

### Шаг 7: Запустить Caddy

```bash
# На сервере
sudo systemctl enable caddy
sudo systemctl restart caddy
sudo systemctl status caddy
```

Проверить логи:
```bash
sudo journalctl -u caddy -f
```

Caddy **автоматически получит SSL сертификат** от Let's Encrypt!

---

### Шаг 8: Запустить бэкенд

```bash
# На сервере
cd ~/jjk-incidents/backend

# Убедиться что .env создан
cat .env

# Запустить
npm run dev
```

Для продакшена используйте PM2:
```bash
sudo npm install -g pm2
pm2 start npm --name "jjk-backend" -- run dev
pm2 save
pm2 startup
```

---

### Шаг 9: Обновить CORS на бэкенде

В `backend/src/server.ts` должно быть:

```ts
const allowedOrigins = [
  'http://localhost:3000',
  'http://95.81.121.225',
  'https://jjk-incidents.ru',
  'https://www.jjk-incidents.ru'
];
```

Перезапустить бэкенд после изменения.

---

## ✅ Проверка

1. Открыть `https://jjk-incidents.ru` в браузере
2. Проверить консоль:
   ```
   Connecting to WebSocket server: https://jjk-incidents.ru
   Connected to server
   ```
3. Создать комнату - всё должно работать!

---

## 🔄 Обновление фронтенда

При каждом изменении фронтенда:

```bash
# Локально
cd frontend
npm run build
scp -r dist/* root@95.81.121.225:/var/www/jjk-incidents/
```

Caddy автоматически начнет раздавать новые файлы!

---

## 🔧 Полезные команды

```bash
# Проверить статус Caddy
sudo systemctl status caddy

# Перезапустить Caddy
sudo systemctl restart caddy

# Посмотреть логи Caddy
sudo journalctl -u caddy -f

# Проверить конфиг Caddy
sudo caddy validate --config /etc/caddy/Caddyfile

# Проверить статус бэкенда (если используется PM2)
pm2 status
pm2 logs jjk-backend
pm2 restart jjk-backend
```

---

## 🐛 Решение проблем

### SSL не работает

```bash
# Проверить что домен резолвится
nslookup jjk-incidents.ru

# Проверить что порты 80 и 443 открыты
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

### Socket.io не подключается

Проверить что в `backend/src/server.ts`:
- Порт 4000
- CORS включает ваш домен
- Socket.io слушает на всех интерфейсах

### Страница не загружается

```bash
# Проверить права на файлы
ls -la /var/www/jjk-incidents/

# Должно быть примерно так:
# drwxr-xr-x user user index.html
# -rw-r--r-- user user index-xxx.js
```

---

## 📊 Итоговая структура

```
Браузер (https://jjk-incidents.ru)
    ↓
Caddy (порты 80, 443)
    ├── /                → /var/www/jjk-incidents/ (статика)
    ├── /api/*           → localhost:4000 (бэкенд API)
    └── /socket.io/*     → localhost:4000 (Socket.io)
         ↓
Backend Node.js (localhost:4000)
    ├── Express API
    └── Socket.io Server
```

---

## 🎯 Преимущества vs Vercel

| Критерий | Vercel | Свой сервер |
|----------|--------|-------------|
| CORS | Проблемы | ✅ Нет проблем |
| Socket.io | ❌ Не работает | ✅ Работает |
| Mixed Content | ❌ Проблема | ✅ Нет проблем |
| Скорость | Зависит от CDN | ✅ Прямое подключение |
| Настройка | Сложно | ✅ Просто |
| Стоимость | Free tier | ✅ Уже есть сервер |

---

**Готово!** Теперь всё работает на одном сервере без головной боли! 🎉

