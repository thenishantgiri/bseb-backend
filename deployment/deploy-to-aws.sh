#!/bin/bash

# AWS EC2 Deployment Script for BSEB Connect Backend
# This script deploys the NestJS backend to AWS EC2 using the smallest instance type
# Prerequisites: AWS CLI configured with appropriate credentials

set -e

# Configuration Variables
INSTANCE_TYPE="t2.micro"  # Smallest instance type (1 vCPU, 1 GB RAM)
AMI_ID="ami-0e53db6fd757e38c7"  # Ubuntu 22.04 LTS in ap-south-1 (Mumbai)
KEY_NAME="bseb-connect-key"
SECURITY_GROUP_NAME="bseb-connect-sg"
INSTANCE_NAME="BSEB-Connect-Backend"
REGION="ap-south-1"  # Mumbai region for better latency in India
ELASTIC_IP_ALLOCATION=""  # Will be set after allocation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting BSEB Connect Backend AWS Deployment${NC}"

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ AWS CLI is installed${NC}"
}

# Function to check AWS credentials
check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}AWS credentials not configured. Run 'aws configure' first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ AWS credentials configured${NC}"
}

# Create key pair if it doesn't exist
create_key_pair() {
    echo -e "${YELLOW}Creating EC2 key pair...${NC}"

    if aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION &> /dev/null; then
        echo -e "${YELLOW}Key pair $KEY_NAME already exists${NC}"
    else
        aws ec2 create-key-pair \
            --key-name $KEY_NAME \
            --region $REGION \
            --query 'KeyMaterial' \
            --output text > ${KEY_NAME}.pem

        chmod 400 ${KEY_NAME}.pem
        echo -e "${GREEN}✓ Key pair created: ${KEY_NAME}.pem${NC}"
        echo -e "${YELLOW}IMPORTANT: Save ${KEY_NAME}.pem file securely. You'll need it to SSH into the instance.${NC}"
    fi
}

# Create security group
create_security_group() {
    echo -e "${YELLOW}Creating security group...${NC}"

    # Check if security group exists
    SG_ID=$(aws ec2 describe-security-groups \
        --group-names $SECURITY_GROUP_NAME \
        --region $REGION \
        --query 'SecurityGroups[0].GroupId' \
        --output text 2>/dev/null || echo "")

    if [ -z "$SG_ID" ] || [ "$SG_ID" == "None" ]; then
        # Create security group
        SG_ID=$(aws ec2 create-security-group \
            --group-name $SECURITY_GROUP_NAME \
            --description "Security group for BSEB Connect Backend" \
            --region $REGION \
            --query 'GroupId' \
            --output text)

        echo -e "${GREEN}✓ Security group created: $SG_ID${NC}"

        # Add inbound rules
        # SSH access (restrict to your IP in production)
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 22 \
            --cidr 0.0.0.0/0 \
            --region $REGION

        # HTTP access
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0 \
            --region $REGION

        # HTTPS access
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 443 \
            --cidr 0.0.0.0/0 \
            --region $REGION

        # Node.js app port (for direct access during development)
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 3000 \
            --cidr 0.0.0.0/0 \
            --region $REGION

        echo -e "${GREEN}✓ Security group rules added${NC}"
    else
        echo -e "${YELLOW}Security group already exists: $SG_ID${NC}"
    fi
}

# Launch EC2 instance
launch_instance() {
    echo -e "${YELLOW}Launching EC2 instance...${NC}"

    # Read user data script
    USER_DATA=$(base64 < ec2-user-data.sh)

    # Launch instance
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-group-ids $SG_ID \
        --region $REGION \
        --user-data "$USER_DATA" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME},{Key=Environment,Value=production},{Key=Application,Value=bseb-connect-backend}]" \
        --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":20,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]" \
        --query 'Instances[0].InstanceId' \
        --output text)

    echo -e "${GREEN}✓ Instance launched: $INSTANCE_ID${NC}"

    # Wait for instance to be running
    echo -e "${YELLOW}Waiting for instance to be running...${NC}"
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

    # Get instance details
    INSTANCE_INFO=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].[PublicIpAddress,PrivateIpAddress,PublicDnsName]' \
        --output text)

    PUBLIC_IP=$(echo $INSTANCE_INFO | awk '{print $1}')
    PRIVATE_IP=$(echo $INSTANCE_INFO | awk '{print $2}')
    PUBLIC_DNS=$(echo $INSTANCE_INFO | awk '{print $3}')

    echo -e "${GREEN}✓ Instance is running${NC}"
    echo -e "${GREEN}  Public IP: $PUBLIC_IP${NC}"
    echo -e "${GREEN}  Private IP: $PRIVATE_IP${NC}"
    echo -e "${GREEN}  Public DNS: $PUBLIC_DNS${NC}"
}

# Allocate and associate Elastic IP (optional but recommended)
allocate_elastic_ip() {
    echo -e "${YELLOW}Allocating Elastic IP...${NC}"

    ALLOCATION_ID=$(aws ec2 allocate-address \
        --domain vpc \
        --region $REGION \
        --query 'AllocationId' \
        --output text)

    ELASTIC_IP=$(aws ec2 describe-addresses \
        --allocation-ids $ALLOCATION_ID \
        --region $REGION \
        --query 'Addresses[0].PublicIp' \
        --output text)

    echo -e "${GREEN}✓ Elastic IP allocated: $ELASTIC_IP${NC}"

    # Associate with instance
    aws ec2 associate-address \
        --instance-id $INSTANCE_ID \
        --allocation-id $ALLOCATION_ID \
        --region $REGION

    echo -e "${GREEN}✓ Elastic IP associated with instance${NC}"

    PUBLIC_IP=$ELASTIC_IP
}

# Create deployment info file
save_deployment_info() {
    cat > deployment-info.txt <<EOF
BSEB Connect Backend Deployment Information
==========================================
Date: $(date)
Region: $REGION
Instance ID: $INSTANCE_ID
Instance Type: $INSTANCE_TYPE
Security Group ID: $SG_ID
Public IP: $PUBLIC_IP
Private IP: $PRIVATE_IP
Public DNS: $PUBLIC_DNS
SSH Key: ${KEY_NAME}.pem

SSH Connection:
ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP

Application URL:
http://$PUBLIC_IP:3000

Next Steps:
1. Wait 5-10 minutes for the server to be fully configured
2. SSH into the server to check status: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP
3. Check application logs: pm2 logs
4. Configure domain name to point to: $PUBLIC_IP
5. Set up SSL certificate using Let's Encrypt

Important Commands:
- Check app status: pm2 status
- View logs: pm2 logs
- Restart app: pm2 restart bseb-backend
- Monitor resources: htop
EOF

    echo -e "${GREEN}✓ Deployment information saved to deployment-info.txt${NC}"
}

# Main deployment flow
main() {
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}   BSEB Connect Backend AWS Deployment${NC}"
    echo -e "${GREEN}===========================================${NC}"

    check_aws_cli
    check_aws_credentials
    create_key_pair
    create_security_group
    launch_instance
    allocate_elastic_ip
    save_deployment_info

    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${YELLOW}Public IP: $PUBLIC_IP${NC}"
    echo -e "${YELLOW}SSH: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP${NC}"
    echo -e "${YELLOW}App URL: http://$PUBLIC_IP:3000${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${YELLOW}Note: The server will take 5-10 minutes to complete setup.${NC}"
    echo -e "${YELLOW}Check deployment-info.txt for full details.${NC}"
}

# Run main function
main