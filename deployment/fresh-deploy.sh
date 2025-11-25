#!/bin/bash

echo "🚀 Fresh EC2 Deployment with New Key"

# Generate unique key name with timestamp
KEY_NAME="bseb-key-$(date +%s)"
echo "Creating new key pair: $KEY_NAME"

# Create new key pair
aws ec2 create-key-pair \
    --key-name $KEY_NAME \
    --region ap-south-1 \
    --query 'KeyMaterial' \
    --output text > ${KEY_NAME}.pem

chmod 400 ${KEY_NAME}.pem
echo "✅ Key created: ${KEY_NAME}.pem"

# Launch instance with new key
echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0e53db6fd757e38c7 \
    --instance-type t2.micro \
    --key-name $KEY_NAME \
    --security-group-ids sg-0ca3d0ee678ee59a4 \
    --region ap-south-1 \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=BSEB-Production},{Key=Environment,Value=production}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance launched: $INSTANCE_ID"

# Wait for instance
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region ap-south-1

# Get instance details
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region ap-south-1 \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "=====================================

"
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "====================================="
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "SSH Key: ${KEY_NAME}.pem"
echo ""
echo "To connect:"
echo "ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP"
echo "====================================="

# Save deployment info
cat > production-deploy.txt <<EOF
BSEB Production Server
======================
Date: $(date)
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Key File: ${KEY_NAME}.pem
Region: ap-south-1

SSH Command:
ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP

Next Steps:
1. SSH into server
2. Install Node.js, PostgreSQL, Redis
3. Upload and configure backend
EOF

echo ""
echo "Deployment info saved to production-deploy.txt"