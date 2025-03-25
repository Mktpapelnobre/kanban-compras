# Use uma imagem Node.js LTS como base
FROM node:18-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos package.json e package-lock.json para o container
COPY package*.json ./

# Instala as dependências do projeto
RUN npm install

# Copia o restante do código do projeto para o diretório de trabalho
COPY . .

# Expõe a porta que sua aplicação irá utilizar
EXPOSE 3000

# Define o comando para iniciar a aplicação
CMD ["npm", "start"]
