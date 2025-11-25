#!/bin/bash

# Script to upload backend code to the deployed EC2 instance
# Run this after the EC2 instance is deployed and ready

set -e

# Configuration
KEY_FILE="bseb-connect-key.pem"
REMOTE_USER="ubuntu"
REMOTE_HOST=""  # Will be read from deployment-info.txt or command line
REMOTE_DIR="/var/www/bseb-backend"
LOCAL_BACKEND_DIR="../"  # Path to backend directory

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if deployment info exists
if [ -f "deployment-info.txt" ]; then
    REMOTE_HOST=$(grep "Public IP:" deployment-info.txt | awk '{print $3}')
fi

# Allow override from command line
if [ ! -z "$1" ]; then
    REMOTE_HOST=$1
fi

# Validate inputs
if [ -z "$REMOTE_HOST" ]; then
    echo -e "${RED}Error: No host specified${NC}"
    echo "Usage: $0 <EC2_PUBLIC_IP>"
    echo "Or run deploy-to-aws.sh first to get deployment-info.txt"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}Error: Key file not found: $KEY_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}Uploading Backend to EC2 Instance${NC}"
echo -e "Host: ${YELLOW}$REMOTE_HOST${NC}"

# Create exclude file for rsync
cat > .rsync-exclude <<EOF
node_modules/
.git/
.env
.env.local
.env.development
dist/
logs/
*.log
.DS_Store
coverage/
.nyc_output/
.vscode/
.idea/
*.swp
*.swo
deployment/
EOF

# Ensure correct permissions on key file
chmod 400 $KEY_FILE

# Test SSH connection
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=10 -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo -e "${RED}Cannot connect to server. Please check:${NC}"
    echo "1. The instance is running"
    echo "2. Security group allows SSH (port 22)"
    echo "3. The IP address is correct"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection successful${NC}"

# Upload backend files
echo -e "${YELLOW}Uploading backend files...${NC}"
rsync -avz --progress \
    --exclude-from=.rsync-exclude \
    -e "ssh -i $KEY_FILE" \
    $LOCAL_BACKEND_DIR/ \
    $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

echo -e "${GREEN}✓ Files uploaded${NC}"

# Install dependencies and build on server
echo -e "${YELLOW}Installing dependencies and building...${NC}"

ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
set -e

cd /var/www/bseb-backend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found"
    exit 1
fi

# Install pnpm if not installed
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install --production

# Check if it's a NestJS project and build if needed
if grep -q "@nestjs/cli" package.json; then
    echo "Building NestJS application..."
    pnpm run build
fi

# Run database migrations if Prisma is used
if [ -f "prisma/schema.prisma" ]; then
    echo "Running database migrations..."
    npx prisma generate
    npx prisma migrate deploy || echo "No pending migrations"
fi

# Copy production environment file if it doesn't exist
if [ ! -f ".env.production" ] && [ -f "/var/www/bseb-backend/deployment/.env.production" ]; then
    cp /var/www/bseb-backend/deployment/.env.production .env.production
    echo "Created .env.production from template"
fi

# Restart the application
echo "Restarting application..."
pm2 delete bseb-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

echo "Application restarted successfully!"

# Show status
pm2 status
ENDSSH

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo -e "${YELLOW}Application URL: http://$REMOTE_HOST:3000${NC}"
echo -e "${YELLOW}Nginx URL: http://$REMOTE_HOST${NC}"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo -e "SSH into server: ${YELLOW}ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST${NC}"
echo -e "View logs: ${YELLOW}ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST 'pm2 logs'${NC}"
echo -e "Check status: ${YELLOW}ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST 'pm2 status'${NC}"

# Clean up
rm -f .rsync-exclude