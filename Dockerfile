FROM node:22-slim
WORKDIR /app

# Copy source to the container
COPY . .

# Make scripts executable.
RUN chmod +x ./setup.sh ./entrypoint.sh

# Update npm to the latest version
RUN npm install -g npm@latest

# Install necessary packages
RUN apt-get update && apt-get install -y \
    procps \
    curl \
    netcat-traditional \
    build-essential \
    python3 \
    python3-pip \
    git \
    pkg-config \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install turborepo deps + drizzle-kit and do migrations 
RUN npm install drizzle-kit turbo
WORKDIR /app/packages/database
RUN npm run migrate

WORKDIR /app
# Install dependencies and force rebuild native modules
RUN npm install --legacy-peer-deps --include=optional \
  && npm rebuild lightningcss

# Build with turborepo owo
RUN npm run build

EXPOSE 3000 8880

# its go time
ENTRYPOINT ["/app/entrypoint.sh"]




