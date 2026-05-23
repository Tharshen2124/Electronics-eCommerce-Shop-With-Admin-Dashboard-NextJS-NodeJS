FROM node:20-alpine

# /app/server is the server working directory; /app/public is the shared upload
# directory that the upload controller writes to via the relative path ../public/.
WORKDIR /app/server

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

# Ensure the upload target directory exists before the volume is mounted over it.
RUN mkdir -p /app/public

EXPOSE 3001

# prisma migrate deploy applies all pending migrations non-interactively,
# then starts the Express server.
CMD ["sh", "-c", "npx prisma migrate deploy && node app.js"]
