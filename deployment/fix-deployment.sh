#!/bin/bash

# Fix deployment issues on EC2
# This script fixes the git repository and PM2 process issues

set -e

echo "=========================================="
echo "Fixing BSEB Backend Deployment"
echo "=========================================="

# Configuration
SERVER_IP="65.2.113.83"
SSH_KEY="./bseb-key-1764063616.pem"

echo "🔧 Connecting to server to fix deployment..."

ssh -i "${SSH_KEY}" ec2-user@${SERVER_IP} << 'ENDSSH'
    echo "📍 Current location: $(pwd)"

    # First, let's check what's in the home directory
    echo "📂 Checking home directory for git repo..."
    cd ~

    if [ -d "bseb-connect" ]; then
        echo "✅ Found bseb-connect repository in home directory"
        cd bseb-connect

        echo "📥 Pulling latest changes..."
        git pull origin main

        echo "📦 Installing Twilio in the git repository..."
        cd backend
        npm install twilio

        echo "🏗️ Building the application..."
        npm run build

        echo "📋 Copying built files to production directory..."
        sudo cp -r dist/* /var/www/bseb-backend/dist/
        sudo cp package.json /var/www/bseb-backend/
        sudo cp package-lock.json /var/www/bseb-backend/

        echo "📦 Installing dependencies in production directory..."
        cd /var/www/bseb-backend
        sudo npm install twilio

    else
        echo "⚠️ Git repository not found in home, setting up fresh..."

        # Clone the repository
        echo "📥 Cloning repository..."
        git clone https://github.com/thenishantgiri/bseb-connect.git

        cd bseb-connect/backend

        echo "📦 Installing all dependencies..."
        npm install

        echo "🏗️ Building the application..."
        npm run build

        echo "📋 Copying to production directory..."
        sudo cp -r dist/* /var/www/bseb-backend/dist/
        sudo cp package.json /var/www/bseb-backend/
        sudo cp package-lock.json /var/www/bseb-backend/
        sudo cp -r node_modules /var/www/bseb-backend/
    fi

    echo "🔍 Checking PM2 processes..."
    sudo pm2 list

    # Check if the process exists
    if sudo pm2 list | grep -q "bseb-backend"; then
        echo "♻️ Restarting existing PM2 process..."
        sudo pm2 restart bseb-backend
    else
        echo "🚀 Starting new PM2 process..."
        cd /var/www/bseb-backend

        # Create PM2 ecosystem file if it doesn't exist
        if [ ! -f ecosystem.config.js ]; then
            echo "📝 Creating PM2 ecosystem file..."
            sudo tee ecosystem.config.js > /dev/null << 'EOF'
module.exports = {
  apps: [{
    name: 'bseb-backend',
    script: 'dist/src/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF
        fi

        # Start the application with PM2
        sudo pm2 start ecosystem.config.js

        # Save PM2 configuration
        sudo pm2 save

        # Set up PM2 to start on boot
        sudo pm2 startup systemd -u root --hp /root
    fi

    echo "📊 Checking PM2 status..."
    sudo pm2 status

    echo "📝 Checking PM2 logs (last 20 lines)..."
    sudo pm2 logs bseb-backend --lines 20 --nostream

    echo "✅ Deployment fixed!"
    echo ""
    echo "🔍 Quick status check:"

    # Test if the backend is responding
    echo "Testing backend health..."
    curl -s http://localhost:3000 || echo "Backend might need a moment to start..."

    echo ""
    echo "📌 Next steps:"
    echo "1. Update /var/www/bseb-backend/.env with Twilio credentials"
    echo "2. Run: sudo pm2 restart bseb-backend"
    echo "3. Check logs: sudo pm2 logs bseb-backend"

ENDSSH

echo "=========================================="
echo "✅ Fix deployment script completed!"
echo "=========================================="