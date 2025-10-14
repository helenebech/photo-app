FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - this ensures sharp is built for Linux
RUN npm install

# Copy the rest of the application
COPY . .

# Rebuild sharp specifically for the container's architecture
RUN npm rebuild sharp

EXPOSE 3001

CMD ["node", "server.js"]
