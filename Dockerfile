FROM node:20

WORKDIR /app

# Устанавливаем зависимости отдельно для лучшего кэширования
COPY package.json package-lock.json ./
RUN npm install

# Копируем остальные файлы
COPY . ./

# Собираем TypeScript
RUN npm run build

# Указываем порт, на котором будет работать приложение
EXPOSE 5000

# Запускаем приложение
CMD ["npm", "start"]
