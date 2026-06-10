# 1. Usar una imagen oficial de Node.js
FROM node:20-alpine

# 2. Crear y definir el directorio de trabajo dentro del contenedor
WORKDIR /App

# 3. Copiar los archivos de dependencias
COPY package*.json ./

# 4. Instalar las dependencias de la aplicación
RUN npm install

# 5. Copiar el resto del código de la API
COPY . .

# 6. Exponer el puerto que usa tu API internamente
EXPOSE 5000

# 7. Comando para arrancar tu API
CMD ["npm", "start"]
