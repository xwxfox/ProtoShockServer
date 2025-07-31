FROM node:22-slim
ARG SOCKET_ENV_FILE_CONTENT
ARG WEB_ENV_FILE_CONTENT
ARG DATABASE_ENV_FILE_CONTENT

RUN echo "socket env file content: $SOCKET_ENV_FILE_CONTENT" \
    && echo "web env file content: $WEB_ENV_FILE_CONTENT" \
    && echo "database env file content: $DATABASE_ENV_FILE_CONTENT"

WORKDIR /app

# Install necessary packages
RUN apt-get update && apt-get install -y \
    procps \
    curl \
    git \
    netcat-traditional \
    build-essential

# Prevents cache issues with host node_modules
COPY package.json ./

WORKDIR /app
RUN npm install -g npm@11.5.2
# Install dependencies and force rebuild native modules
RUN npm install --include=optional \
  && npm rebuild lightningcss

# Copy rest of the source to the container
COPY . .

# Install turborepo deps + drizzle-kit and do migrations 
RUN npm install drizzle-kit turbo

WORKDIR /app/packages/database
RUN npm run migrate

WORKDIR /app

# Create empty env files
RUN echo "$SOCKET_ENV_FILE_CONTENT" > /app/apps/socket/.env.production \
    && echo "$WEB_ENV_FILE_CONTENT" > /app/apps/web/.env.production \
    && echo "$DATABASE_ENV_FILE_CONTENT" > /app/packages/database/.env.production \
    && mkdir /app/shared \
    && touch /app/shared/magic.db
    
# Build with turborepo owo
RUN npm run build

EXPOSE 3000 8880

# Make sure the entrypoint script is executable
RUN chmod +x ./entrypoint.sh

# its go time
ENTRYPOINT ["/app/entrypoint.sh"]




