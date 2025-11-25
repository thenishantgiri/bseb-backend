#!/bin/bash

# EC2 User Data Script - Runs on instance initialization
# This script sets up the BSEB Connect Backend on Ubuntu 22.04

set -e

# Update system
apt-get update
apt-get upgrade -y

# Install essential packages
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    nginx \
    redis-server \
    postgresql \
    postgresql-contrib \
    ufw \
    htop \
    vim

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify installations
node --version
npm --version

# Install PM2 globally
npm install -g pm2

# Install pnpm (faster package manager)
npm install -g pnpm

# Configure PostgreSQL
sudo -u postgres psql <<EOF
CREATE DATABASE bseb_connect;
CREATE USER bseb_user WITH ENCRYPTED PASSWORD 'BsebSecurePass2024!';
GRANT ALL PRIVILEGES ON DATABASE bseb_connect TO bseb_user;
ALTER DATABASE bseb_connect OWNER TO bseb_user;
EOF

# Configure Redis
sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
sed -i 's/# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server

# Create app directory
mkdir -p /var/www/bseb-backend
cd /var/www/bseb-backend

# Clone the repository (you'll need to update this with your actual repo)
# For now, we'll create the structure manually
cat > package.json <<'EOPACKAGE'
{
  "name": "bseb-connect-backend",
  "version": "1.0.0",
  "description": "BSEB Connect Student App Backend",
  "author": "BSEB Team",
  "private": true,
  "license": "MIT",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/throttler": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "bcrypt": "^5.1.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "ioredis": "^5.3.0",
    "minio": "^7.1.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.0",
    "passport-local": "^1.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "twilio": "^4.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^3.0.8",
    "@types/passport-local": "^1.0.35",
    "@types/supertest": "^2.0.12",
    "@typescript-eslint/eslint-plugin": "^5.59.11",
    "@typescript-eslint/parser": "^5.59.11",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^8.8.0",
    "eslint-plugin-prettier": "^4.2.1",
    "jest": "^29.5.0",
    "prettier": "^2.8.8",
    "prisma": "^5.0.0",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3"
  }
}
EOPACKAGE

# Create production environment file
cat > .env.production <<'EOENV'
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://bseb_user:BsebSecurePass2024!@localhost:5432/bseb_connect?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-$(openssl rand -hex 32)
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-$(openssl rand -hex 32)
JWT_REFRESH_EXPIRATION=30d

# Twilio (for SMS - update with your credentials)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# MinIO (S3-compatible storage - update if using)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=bseb-connect

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
EOENV

# Create PM2 ecosystem config
cat > ecosystem.config.js <<'EOPM2'
module.exports = {
  apps: [{
    name: 'bseb-backend',
    script: 'dist/main.js',
    instances: 1,  // Use 1 instance for t2.micro
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '900M',  // Restart if memory exceeds 900MB
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOPM2

# Create logs directory
mkdir -p logs

# Configure Nginx
cat > /etc/nginx/sites-available/bseb-backend <<'EONGINX'
upstream backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API endpoints
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://backend/health;
    }

    # Static files (if any)
    location /static {
        alias /var/www/bseb-backend/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EONGINX

# Enable Nginx site
ln -sf /etc/nginx/sites-available/bseb-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# Configure firewall
ufw --force enable
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3000

# Create a simple health check endpoint
mkdir -p src
cat > src/main.ts <<'EOMAIN'
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
EOMAIN

cat > src/app.module.ts <<'EOAPP'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.production',
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
EOMAIN

# Create a startup script
cat > /usr/local/bin/start-backend.sh <<'EOSTART'
#!/bin/bash
cd /var/www/bseb-backend

# Load environment variables
export $(cat .env.production | xargs)

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install --production
fi

# Build the application if needed
if [ ! -d "dist" ]; then
    echo "Building application..."
    pnpm run build
fi

# Run database migrations (if using Prisma)
if [ -f "prisma/schema.prisma" ]; then
    echo "Running database migrations..."
    npx prisma migrate deploy
fi

# Start the application with PM2
pm2 delete bseb-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "Backend started successfully!"
EOSTART

chmod +x /usr/local/bin/start-backend.sh

# Create systemd service for auto-start
cat > /etc/systemd/system/bseb-backend.service <<'EOSERVICE'
[Unit]
Description=BSEB Connect Backend
After=network.target

[Service]
Type=forking
User=ubuntu
WorkingDirectory=/var/www/bseb-backend
ExecStart=/usr/local/bin/start-backend.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOSERVICE

# Set proper permissions
chown -R ubuntu:ubuntu /var/www/bseb-backend

# Enable and start the service
systemctl daemon-reload
systemctl enable bseb-backend
systemctl start bseb-backend

# Create a simple monitoring script
cat > /usr/local/bin/check-backend.sh <<'EOCHECK'
#!/bin/bash
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "Backend is not responding. Restarting..."
    systemctl restart bseb-backend
fi
EOCHECK

chmod +x /usr/local/bin/check-backend.sh

# Add to crontab for monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-backend.sh") | crontab -

# Final message
cat > /var/www/setup-complete.txt <<'EOCOMPLETE'
BSEB Connect Backend Setup Complete!
=====================================

The server has been configured with:
- Node.js 18.x LTS
- PostgreSQL database
- Redis cache
- PM2 process manager
- Nginx reverse proxy
- Firewall configured
- Auto-restart on failure

Database:
- Database: bseb_connect
- User: bseb_user
- Password: BsebSecurePass2024!

Application:
- Location: /var/www/bseb-backend
- Port: 3000
- PM2 app name: bseb-backend

Commands:
- Check status: pm2 status
- View logs: pm2 logs bseb-backend
- Restart app: pm2 restart bseb-backend
- Stop app: pm2 stop bseb-backend

Next Steps:
1. Upload your actual backend code to /var/www/bseb-backend
2. Update .env.production with your actual credentials
3. Run database migrations if needed
4. Configure your domain name
5. Set up SSL with Let's Encrypt

EOCOMPLETE

echo "Setup complete! Check /var/www/setup-complete.txt for details."