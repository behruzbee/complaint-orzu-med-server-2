FROM node:20-bullseye-slim

# Установим базовые зависимости для Puppeteer
RUN apt-get update -o Acquire::ForceIPv4=true \
    && apt-get install -y --no-install-recommends \
       ca-certificates fonts-liberation libappindicator3-1 \
       libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
       libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libgtk-3-0 \
       libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 \
       libxrandr2 libxss1 libxtst6 xdg-utils wget \
       libgdk-pixbuf2.0-0 libpango1.0-0 libxshmfence1 libglu1 \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости (Puppeteer скачает Chromium)
RUN npm install

# Копируем весь проект
COPY . .

# Собираем TypeScript
RUN npm run build

# Запуск приложения
CMD ["node", "dist/main.js"]
