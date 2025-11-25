#!/bin/bash

# BSEB Backend Nginx Setup Script
# Run this script on the EC2 instance to configure Nginx

set -e

echo "🔧 BSEB Backend Nginx Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root or with sudo"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
apt-get update -qq

# Install Nginx
print_status "Installing Nginx..."
apt-get install -y nginx

# Stop Nginx temporarily
print_status "Stopping Nginx for configuration..."
systemctl stop nginx

# Backup default Nginx configuration
if [ -f /etc/nginx/nginx.conf ]; then
    print_status "Backing up default Nginx configuration..."
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
fi

# Create necessary directories
print_status "Creating required directories..."
mkdir -p /var/www/bseb-backend/{static,uploads}
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Set proper permissions
chown -R www-data:www-data /var/www/bseb-backend
chmod -R 755 /var/www/bseb-backend

# Copy the site configuration
print_status "Setting up BSEB backend site configuration..."

# Create the site configuration
cat > /etc/nginx/sites-available/bseb-backend << 'EOF'
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

        # Disable buffering for SSE
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Auth endpoints with stricter limits
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

# Remove default site if it exists
if [ -L /etc/nginx/sites-enabled/default ]; then
    print_status "Removing default Nginx site..."
    rm /etc/nginx/sites-enabled/default
fi

# Enable the BSEB backend site
print_status "Enabling BSEB backend site..."
ln -sf /etc/nginx/sites-available/bseb-backend /etc/nginx/sites-enabled/

# Test Nginx configuration
print_status "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Start and enable Nginx
print_status "Starting Nginx..."
systemctl start nginx
systemctl enable nginx

# Configure firewall (if UFW is installed)
if command -v ufw &> /dev/null; then
    print_status "Configuring firewall..."
    ufw allow 'Nginx Full'
    ufw allow 22/tcp
    ufw --force enable
fi

# Check if NestJS app is running
print_status "Checking NestJS application status..."
if pm2 list | grep -q "bseb-backend"; then
    print_status "NestJS application is running"
else
    print_warning "NestJS application is not running. Please start it with: pm2 start ecosystem.config.js"
fi

# Display status
print_status "Nginx setup completed!"
echo ""
echo "======================================"
echo "📊 Nginx Status:"
systemctl status nginx --no-pager | head -10
echo ""
echo "======================================"
echo "🔗 Your backend is now available at:"
echo "   http://bseb-backend.mvpl.info"
echo ""
echo "📝 Nginx Commands:"
echo "   systemctl status nginx    - Check status"
echo "   systemctl restart nginx   - Restart Nginx"
echo "   nginx -t                  - Test configuration"
echo "   tail -f /var/log/nginx/bseb-backend.error.log - View error logs"
echo "   tail -f /var/log/nginx/bseb-backend.access.log - View access logs"
echo ""
echo "🔐 To enable HTTPS with Let's Encrypt:"
echo "   sudo apt-get install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d bseb-backend.mvpl.info"
echo "======================================"