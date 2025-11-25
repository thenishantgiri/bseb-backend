#!/bin/bash

# Twilio Integration Deployment Script for BSEB Connect
# This script deploys the Twilio OTP integration to the EC2 instance

set -e

echo "=========================================="
echo "Twilio Integration Deployment Script"
echo "=========================================="

# Configuration
SERVER_IP="65.2.113.83"
SSH_KEY="./bseb-key-1764063616.pem"
REMOTE_DIR="/var/www/bseb-backend"

echo ""
echo "📋 Deployment Steps:"
echo "1. Connect to EC2 instance"
echo "2. Pull latest code from GitHub"
echo "3. Install Twilio dependencies"
echo "4. Update environment variables"
echo "5. Rebuild the application"
echo "6. Restart PM2 process"
echo ""

# SSH into server and run deployment commands
echo "🚀 Starting deployment to ${SERVER_IP}..."

ssh -i "${SSH_KEY}" ec2-user@${SERVER_IP} << 'ENDSSH'
    set -e

    echo "📂 Navigating to backend directory..."
    cd /var/www/bseb-backend

    echo "📥 Pulling latest code from GitHub..."
    sudo git pull origin main

    echo "📦 Installing Twilio dependencies..."
    sudo npm install twilio

    echo "🔧 Creating Twilio environment variables file..."
    # Create a temporary Twilio config file
    sudo tee -a .env.twilio > /dev/null << 'EOF'
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+14155238886

# OTP Settings
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6

# Development Settings (set to true for testing without actual SMS)
ENABLE_TEST_OTP=false
TEST_OTP_CODE=123456
EOF

    echo ""
    echo "⚠️  IMPORTANT: Twilio Configuration Required!"
    echo "============================================"
    echo "Please update the .env file with your actual Twilio credentials:"
    echo ""
    echo "1. TWILIO_ACCOUNT_SID - Get from Twilio Console > Account Info"
    echo "2. TWILIO_AUTH_TOKEN - Get from Twilio Console > Account Info"
    echo "3. TWILIO_VERIFY_SERVICE_SID - Create at Console > Verify > Services"
    echo "4. TWILIO_PHONE_NUMBER - Your Twilio phone number (optional)"
    echo ""
    echo "To create a Verify Service:"
    echo "1. Go to https://console.twilio.com/us1/develop/verify/services"
    echo "2. Click 'Create Service'"
    echo "3. Name it 'BSEB Connect'"
    echo "4. Copy the Service SID"
    echo ""
    echo "To edit the .env file, run:"
    echo "sudo nano /var/www/bseb-backend/.env"
    echo ""

    # Check if .env file exists and merge Twilio config
    if [ -f .env ]; then
        echo "📝 Updating .env file with Twilio configuration..."

        # Remove old MSG91 config if it exists
        sudo sed -i '/# MSG91 Configuration/,/^$/d' .env
        sudo sed -i '/MSG91_/d' .env

        # Add Twilio config
        echo "" | sudo tee -a .env > /dev/null
        echo "# Twilio Configuration (Added on $(date))" | sudo tee -a .env > /dev/null
        sudo cat .env.twilio | sudo tee -a .env > /dev/null
        sudo rm .env.twilio
    else
        echo "⚠️  No .env file found. Creating new one with Twilio config..."
        sudo mv .env.twilio .env
    fi

    echo "🏗️  Building the application..."
    sudo npm run build

    echo "🔄 Restarting PM2 process..."
    sudo pm2 restart bseb-backend

    echo "📊 Checking PM2 status..."
    sudo pm2 status bseb-backend

    echo ""
    echo "✅ Twilio Integration deployed successfully!"
    echo ""
    echo "🧪 Test the OTP endpoints:"
    echo "----------------------------"
    echo "1. Send OTP (SMS):"
    echo "   POST http://${SERVER_IP}/api/auth/send-otp"
    echo "   Body: {\"identifier\": \"9876543210\", \"type\": \"login\"}"
    echo ""
    echo "2. Send OTP (WhatsApp):"
    echo "   POST http://${SERVER_IP}/api/auth/send-otp/whatsapp"
    echo "   Body: {\"identifier\": \"9876543210\"}"
    echo ""
    echo "3. Verify OTP:"
    echo "   POST http://${SERVER_IP}/api/auth/verify-otp"
    echo "   Body: {\"identifier\": \"9876543210\", \"otp\": \"123456\"}"
    echo ""
    echo "4. Resend OTP (with voice option):"
    echo "   POST http://${SERVER_IP}/api/auth/resend-otp"
    echo "   Body: {\"identifier\": \"9876543210\", \"channel\": \"call\"}"
    echo ""
    echo "📱 Twilio Features Available:"
    echo "- SMS OTP"
    echo "- Voice Call OTP"
    echo "- WhatsApp OTP"
    echo "- Email OTP"
    echo ""

ENDSSH

echo ""
echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
echo "📌 Next Steps:"
echo "1. SSH into the server and update Twilio credentials in .env file"
echo "2. Create a Twilio Verify Service at https://console.twilio.com"
echo "3. Test the OTP endpoints using Postman"
echo "4. Update Flutter app to use the new endpoints"
echo ""
echo "🔐 To update Twilio credentials:"
echo "ssh -i ${SSH_KEY} ec2-user@${SERVER_IP}"
echo "sudo nano /var/www/bseb-backend/.env"
echo ""
echo "📚 Twilio Setup Guide:"
echo "1. Sign up at https://www.twilio.com/try-twilio"
echo "2. Get free trial credits (includes phone number)"
echo "3. Create Verify Service for OTP"
echo "4. Enable WhatsApp sandbox for testing (optional)"
echo ""