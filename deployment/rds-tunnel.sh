#!/bin/bash

# SSH Tunnel to RDS via EC2
# This script creates a secure tunnel to access RDS through EC2

echo "🔐 Creating SSH Tunnel to RDS..."

# Configuration
EC2_HOST="65.2.113.83"
EC2_USER="ec2-user"
SSH_KEY="/Users/thenishantgiri/Work/bseb_connect-main/backend/deployment/bseb-key-1764063616.pem"
RDS_ENDPOINT="bseb-connect-db.cdsuqos2ot35.ap-south-1.rds.amazonaws.com"
LOCAL_PORT=5433
REMOTE_PORT=5432

# Kill any existing tunnel on the same port
echo "Cleaning up any existing tunnels..."
lsof -ti:$LOCAL_PORT | xargs kill -9 2>/dev/null

# Create SSH tunnel
echo "Establishing tunnel to RDS via EC2..."
ssh -i "$SSH_KEY" \
    -L $LOCAL_PORT:$RDS_ENDPOINT:$REMOTE_PORT \
    -o StrictHostKeyChecking=no \
    -N -f $EC2_USER@$EC2_HOST

if [ $? -eq 0 ]; then
    echo "✅ SSH Tunnel established successfully!"
    echo ""
    echo "You can now connect to RDS using:"
    echo "  Host: localhost"
    echo "  Port: $LOCAL_PORT"
    echo "  Database: bseb_connect"
    echo "  Username: bsebadmin"
    echo "  Password: BSEBConnect2024"
    echo ""
    echo "To test connection:"
    echo "  PGPASSWORD='BSEBConnect2024' psql -h localhost -p $LOCAL_PORT -U bsebadmin -d bseb_connect"
    echo ""
    echo "To stop the tunnel:"
    echo "  lsof -ti:$LOCAL_PORT | xargs kill -9"
else
    echo "❌ Failed to establish SSH tunnel"
    exit 1
fi