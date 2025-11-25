#!/bin/bash

# Complete Server Setup Script with Nginx
# Run this on a fresh Ubuntu EC2 instance

set -e

echo "🚀 BSEB Backend Complete Server Setup"
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Update system
print_status "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20
print_status "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build essentials
print_status "Installing build tools..."
sudo apt-get install -y build-essential git

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Install PostgreSQL
print_status "Installing PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib

# Configure PostgreSQL
print_status "Configuring PostgreSQL..."
sudo -u postgres psql << EOF
CREATE USER bsebuser WITH PASSWORD 'BSEBConnect@2024';
CREATE DATABASE bseb_connect OWNER bsebuser;
GRANT ALL PRIVILEGES ON DATABASE bseb_connect TO bsebuser;
EOF

# Install Redis
print_status "Installing Redis..."
sudo apt-get install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install Nginx
print_status "Installing Nginx..."
sudo apt-get install -y nginx

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p /var/www/bseb-backend
sudo chown -R ubuntu:ubuntu /var/www/bseb-backend

# Create Nginx directories
sudo mkdir -p /var/www/bseb-backend/{static,uploads}
sudo chown -R www-data:www-data /var/www/bseb-backend

# Configure Nginx for BSEB Backend
print_status "Configuring Nginx..."

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/bseb-backend > /dev/null << 'EOF'
# BSEB Backend Nginx Configuration
upstream bseb_backend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=bseb_api:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=bseb_auth:10m rate=5r/s;

server {
    listen 80;
    listen [::]:80;
    server_name bseb-backend.mvpl.info;

    # Logs
    access_log /var/log/nginx/bseb-backend.access.log;
    error_log /var/log/nginx/bseb-backend.error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS for Flutter app
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH" always;
    add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization, x-refresh-token" always;
    add_header Access-Control-Expose-Headers "x-access-token, x-refresh-token" always;

    # Handle OPTIONS
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH";
        add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization, x-refresh-token";
        add_header Access-Control-Max-Age 1728000;
        add_header Content-Type "text/plain; charset=utf-8";
        add_header Content-Length 0;
        return 204;
    }

    # Client body size for file uploads
    client_max_body_size 50M;

    # Main API proxy
    location / {
        limit_req zone=bseb_api burst=50 nodelay;

        proxy_pass http://bseb_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Auth endpoints
    location ~ ^/api/auth/ {
        limit_req zone=bseb_auth burst=10 nodelay;

        proxy_pass http://bseb_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://bseb_backend/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check
    location /health {
        proxy_pass http://bseb_backend/health;
        access_log off;
    }
}
EOF

# Remove default site and enable BSEB backend
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/bseb-backend /etc/nginx/sites-enabled/

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Clone repository (placeholder - replace with actual repo)
print_status "Setting up application code..."
cd /var/www/bseb-backend

# Create .env file
print_status "Creating environment configuration..."
cat > /var/www/bseb-backend/.env << 'EOF'
# Database
DATABASE_URL="postgresql://bsebuser:BSEBConnect@2024@localhost:5432/bseb_connect"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets
JWT_SECRET="bseb-jwt-secret-key-2024"
JWT_REFRESH_SECRET="bseb-refresh-secret-key-2024"

# Server
PORT=3000
NODE_ENV=production

# MinIO (if needed)
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL=false
EOF

# Create ecosystem file for PM2
print_status "Creating PM2 ecosystem file..."
cat > /var/www/bseb-backend/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'bseb-backend',
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p /var/www/bseb-backend/logs

# Set permissions
sudo chown -R ubuntu:ubuntu /var/www/bseb-backend

# Display final status
print_status "Server setup completed!"
echo ""
echo "======================================"
echo "🎉 SETUP COMPLETE!"
echo "======================================"
echo ""
echo "📋 Next Steps:"
echo "1. Upload your backend code to /var/www/bseb-backend"
echo "2. Run: cd /var/www/bseb-backend && npm install"
echo "3. Run: npm run build"
echo "4. Run: npx prisma migrate deploy"
echo "5. Run: pm2 start ecosystem.config.js"
echo "6. Run: pm2 save && pm2 startup"
echo ""
echo "🔗 Access Points:"
echo "   Backend API: http://bseb-backend.mvpl.info"
echo "   Server IP: $(curl -s ifconfig.me)"
echo ""
echo "📝 Useful Commands:"
echo "   pm2 status         - Check app status"
echo "   pm2 logs           - View application logs"
echo "   pm2 restart all    - Restart application"
echo "   nginx -t           - Test Nginx config"
echo "   systemctl status nginx - Check Nginx status"
echo ""
echo "🔐 To enable HTTPS:"
echo "   sudo apt-get install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d bseb-backend.mvpl.info"
echo "======================================"