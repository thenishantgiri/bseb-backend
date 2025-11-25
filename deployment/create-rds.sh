#!/bin/bash

# Create RDS PostgreSQL Instance for BSEB Connect

echo "🗄️ Creating RDS PostgreSQL Instance..."

# Create DB subnet group (if not exists)
aws rds create-db-subnet-group \
    --db-subnet-group-name bseb-subnet-group \
    --db-subnet-group-description "Subnet group for BSEB Connect RDS" \
    --subnet-ids $(aws ec2 describe-subnets --query 'Subnets[?VpcId==`'$(aws ec2 describe-vpcs --query 'Vpcs[0].VpcId' --output text)'`].SubnetId' --output text) \
    --region ap-south-1 2>/dev/null || echo "Subnet group already exists"

# Create security group for RDS
RDS_SG_ID=$(aws ec2 create-security-group \
    --group-name bseb-rds-sg \
    --description "Security group for BSEB RDS PostgreSQL" \
    --region ap-south-1 \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
        --group-names bseb-rds-sg \
        --region ap-south-1 \
        --query 'SecurityGroups[0].GroupId' \
        --output text)

echo "✅ Security Group: $RDS_SG_ID"

# Get EC2 security group ID
EC2_SG_ID="sg-0ca3d0ee678ee59a4"

# Allow PostgreSQL access from EC2 security group
aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG_ID \
    --protocol tcp \
    --port 5432 \
    --source-group $EC2_SG_ID \
    --region ap-south-1 2>/dev/null || echo "Rule already exists"

# Also allow from anywhere (for development - remove in production)
aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 \
    --region ap-south-1 2>/dev/null || echo "Public rule already exists"

# Create RDS instance
echo "🚀 Creating RDS instance (this will take 5-10 minutes)..."
aws rds create-db-instance \
    --db-instance-identifier bseb-connect-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15 \
    --master-username bsebadmin \
    --master-user-password 'BSEBConnect@2024' \
    --allocated-storage 20 \
    --storage-type gp3 \
    --db-name bseb_connect \
    --vpc-security-group-ids $RDS_SG_ID \
    --backup-retention-period 7 \
    --no-multi-az \
    --publicly-accessible \
    --storage-encrypted false \
    --region ap-south-1 \
    --tags "Key=Name,Value=BSEB-Connect-DB" "Key=Environment,Value=production"

# Wait for RDS to be available
echo "⏳ Waiting for RDS instance to be available..."
aws rds wait db-instance-available \
    --db-instance-identifier bseb-connect-db \
    --region ap-south-1

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier bseb-connect-db \
    --region ap-south-1 \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

echo ""
echo "======================================"
echo "✅ RDS PostgreSQL Created Successfully!"
echo "======================================"
echo "Database Endpoint: $RDS_ENDPOINT"
echo "Database Name: bseb_connect"
echo "Username: bsebadmin"
echo "Password: BSEBConnect@2024"
echo "Port: 5432"
echo ""
echo "Connection String:"
echo "postgresql://bsebadmin:BSEBConnect@2024@$RDS_ENDPOINT:5432/bseb_connect"
echo ""
echo "Test connection:"
echo "PGPASSWORD='BSEBConnect@2024' psql -h $RDS_ENDPOINT -U bsebadmin -d bseb_connect"
echo "======================================"

# Save connection details
cat > rds-connection.txt << EOF
RDS Connection Details
======================
Endpoint: $RDS_ENDPOINT
Database: bseb_connect
Username: bsebadmin
Password: BSEBConnect@2024
Port: 5432

Connection String:
postgresql://bsebadmin:BSEBConnect@2024@$RDS_ENDPOINT:5432/bseb_connect

Environment Variable:
DATABASE_URL="postgresql://bsebadmin:BSEBConnect@2024@$RDS_ENDPOINT:5432/bseb_connect"
EOF

echo ""
echo "Connection details saved to rds-connection.txt"