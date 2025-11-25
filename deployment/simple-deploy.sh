#!/bin/bash

# Simple EC2 deployment without complex user data

echo "🚀 Creating simple EC2 instance..."

# Launch instance without user data
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0e53db6fd757e38c7 \
    --instance-type t2.micro \
    --key-name bseb-connect-key \
    --security-group-ids sg-0ca3d0ee678ee59a4 \
    --region ap-south-1 \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=BSEB-Backend-Simple}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance created: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region ap-south-1

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region ap-south-1 \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "✅ Instance is running!"
echo "📍 Public IP: $PUBLIC_IP"
echo ""
echo "To connect:"
echo "ssh -i bseb-connect-key.pem ubuntu@$PUBLIC_IP"

# Save info
cat > simple-instance-info.txt <<EOF
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
SSH: ssh -i bseb-connect-key.pem ubuntu@$PUBLIC_IP
Date: $(date)
EOF

echo ""
echo "Instance info saved to simple-instance-info.txt"