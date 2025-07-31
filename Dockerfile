FROM node:20-slim
WORKDIR /app

# Copy source to the container
COPY . .

# Make scripts executable.
RUN chmod +x ./setup.sh ./entrypoint.sh

# Install necessary packages
RUN apt-get update && apt-get install -y procps curl netcat-traditional

# Install turborepo deps + drizzle-kit and do migrations
RUN ./setup.sh

# Build with turborepo owo
RUN npm run build

EXPOSE 3000 8880

# its go time
ENTRYPOINT ["/app/entrypoint.sh"]




