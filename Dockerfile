FROM node:22-slim
WORKDIR /app


# Install necessary packages
RUN apt-get update && apt-get install -y \
    procps \
    curl \
    netcat-traditional \
    build-essential

# Prevents cache issues with host node_modules
COPY package.json package-lock.json* ./

WORKDIR /app
# Install dependencies and force rebuild native modules
RUN npm ci --legacy-peer-deps --include=optional \
  && npm rebuild lightningcss

# Copy rest of the source to the container
COPY . .

# Install turborepo deps + drizzle-kit and do migrations 
RUN npm install drizzle-kit turbo
WORKDIR /app/packages/database
RUN npm run migrate

WORKDIR /app
# Build with turborepo owo
RUN npm run build

EXPOSE 3000 8880

# Make sure the entrypoint script is executable
RUN chmod +x ./entrypoint.sh

# its go time
ENTRYPOINT ["/app/entrypoint.sh"]




