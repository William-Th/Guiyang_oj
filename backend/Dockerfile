# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]