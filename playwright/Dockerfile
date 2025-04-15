FROM mcr.microsoft.com/playwright:v1.51.1-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create directory for logs
RUN mkdir -p /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV TARGET_URL=http://localhost:3000
ENV CONCURRENT_SESSIONS=5
ENV TEST_DURATION=300000
ENV THINK_TIME=2000

# Expose metrics port
EXPOSE 3000

# Run the load test
CMD ["npm", "test"]