FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# prisma generate builds the client from schema; --hostname 0.0.0.0 makes Next.js
# bind to all interfaces so the mapped host port is reachable.
CMD ["sh", "-c", "npx prisma generate && npx next dev --hostname 0.0.0.0"]
