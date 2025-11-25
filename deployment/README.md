# BSEB Connect Backend AWS Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the BSEB Connect Backend to AWS EC2 using the smallest instance type (t2.micro) for cost efficiency.

## Prerequisites

1. **AWS Account**: Active AWS account with billing configured
2. **AWS CLI**: Installed and configured with credentials
   ```bash
   aws --version
   aws configure
   ```
3. **Local Environment**: Unix-based system (Linux/macOS) or WSL on Windows
4. **Repository Access**: Access to the backend source code

## Architecture

The deployment uses the following AWS services and configurations:

- **EC2 Instance**: t2.micro (1 vCPU, 1 GB RAM)
- **Storage**: 20 GB GP3 EBS volume
- **Database**: PostgreSQL 14 (on same instance)
- **Cache**: Redis (on same instance)
- **Web Server**: Nginx (reverse proxy)
- **Process Manager**: PM2
- **Runtime**: Node.js 18 LTS

## Quick Deployment

### 1. Prepare Deployment Files

```bash
cd backend/deployment
chmod +x deploy-to-aws.sh
chmod +x ec2-user-data.sh
```

### 2. Configure AWS Region

Edit `deploy-to-aws.sh` and set your preferred region:
```bash
REGION="us-east-1"  # Change to your preferred region
```

### 3. Run Deployment Script

```bash
./deploy-to-aws.sh
```

This script will:
- Create an EC2 key pair
- Set up security groups
- Launch the EC2 instance
- Allocate an Elastic IP
- Configure the server automatically

### 4. Wait for Setup

The server setup takes 5-10 minutes. You can monitor progress:

```bash
# SSH into the instance
ssh -i bseb-connect-key.pem ubuntu@<ELASTIC_IP>

# Check setup logs
tail -f /var/log/cloud-init-output.log
```

## Manual Deployment Steps

### Step 1: Create Security Group

```bash
# Create security group
aws ec2 create-security-group \
    --group-name bseb-connect-sg \
    --description "Security group for BSEB Connect Backend"

# Add rules
aws ec2 authorize-security-group-ingress \
    --group-name bseb-connect-sg \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name bseb-connect-sg \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name bseb-connect-sg \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0
```

### Step 2: Create Key Pair

```bash
aws ec2 create-key-pair \
    --key-name bseb-connect-key \
    --query 'KeyMaterial' \
    --output text > bseb-connect-key.pem

chmod 400 bseb-connect-key.pem
```

### Step 3: Launch EC2 Instance

```bash
aws ec2 run-instances \
    --image-id ami-0e2c8caa4b6378d8c \
    --instance-type t2.micro \
    --key-name bseb-connect-key \
    --security-groups bseb-connect-sg \
    --user-data file://ec2-user-data.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=BSEB-Backend}]' \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]'
```

## Post-Deployment Configuration

### 1. Upload Your Code

```bash
# SSH into the server
ssh -i bseb-connect-key.pem ubuntu@<ELASTIC_IP>

# Navigate to app directory
cd /var/www/bseb-backend

# Clone your repository (or upload files)
git clone https://github.com/your-org/bseb-backend.git .

# Install dependencies
pnpm install --production

# Build the application
pnpm run build

# Run database migrations
npx prisma migrate deploy
```

### 2. Configure Environment Variables

```bash
# Edit production environment file
nano /var/www/bseb-backend/.env.production

# Update the following:
# - Database password
# - JWT secrets
# - SMS service credentials
# - API keys
```

### 3. Start the Application

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 4. Configure Domain Name

Point your domain to the Elastic IP:
1. Log into your domain registrar
2. Create an A record pointing to the Elastic IP
3. Wait for DNS propagation (5-30 minutes)

### 5. Setup SSL Certificate

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.bsebconnect.in

# Auto-renewal
sudo certbot renew --dry-run
```

## Monitoring and Maintenance

### Application Monitoring

```bash
# Check application status
pm2 status

# View logs
pm2 logs bseb-backend

# Monitor resources
pm2 monit

# Restart application
pm2 restart bseb-backend
```

### System Monitoring

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -m

# Check nginx status
systemctl status nginx

# Check PostgreSQL status
systemctl status postgresql

# Check Redis status
systemctl status redis-server
```

### Database Management

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Connect to specific database
psql -U bseb_user -d bseb_connect

# Backup database
pg_dump -U bseb_user bseb_connect > backup.sql

# Restore database
psql -U bseb_user bseb_connect < backup.sql
```

### Log Management

```bash
# Application logs
tail -f /var/www/bseb-backend/logs/combined.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u bseb-backend -f
```

## Cost Optimization

### t2.micro Instance Limits
- **CPU**: 1 vCPU (burstable)
- **Memory**: 1 GB RAM
- **Network**: Low to Moderate
- **Free Tier**: 750 hours/month (first year)

### Performance Tips
1. **Use Redis caching** aggressively
2. **Optimize database queries** with indexes
3. **Enable Nginx caching** for static content
4. **Use PM2 clustering** carefully (1 instance recommended)
5. **Monitor CPU credits** for t2 instances

### Cost Breakdown (Monthly)
- **EC2 t2.micro**: ~$8.50 (after free tier)
- **EBS Storage (20GB)**: ~$2.00
- **Elastic IP**: Free (when attached)
- **Data Transfer**: Variable (~$0.09/GB)
- **Total**: ~$10-15/month

## Troubleshooting

### Common Issues

#### 1. Cannot SSH into instance
```bash
# Check security group
aws ec2 describe-security-groups --group-names bseb-connect-sg

# Check instance status
aws ec2 describe-instance-status --instance-ids <INSTANCE_ID>
```

#### 2. Application not starting
```bash
# Check PM2 logs
pm2 logs

# Check Node.js version
node --version  # Should be 18.x

# Check dependencies
pnpm install
```

#### 3. Database connection issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l

# Reset database password
sudo -u postgres psql
ALTER USER bseb_user WITH PASSWORD 'new_password';
```

#### 4. Out of memory
```bash
# Check memory usage
free -m

# Restart PM2 with lower memory limit
pm2 delete bseb-backend
pm2 start ecosystem.config.js --max-memory-restart 600M
```

## Backup Strategy

### Automated Backups

Create a backup script:
```bash
#!/bin/bash
# /usr/local/bin/backup-bseb.sh

BACKUP_DIR="/var/backups/bseb"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U bseb_user bseb_connect > $BACKUP_DIR/db_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/bseb-backend

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /usr/local/bin/backup-bseb.sh
```

## Security Best Practices

1. **Regular Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Firewall Configuration**
   ```bash
   sudo ufw status
   ```

3. **SSH Key Security**
   - Never share the private key
   - Use SSH agent forwarding
   - Rotate keys periodically

4. **Environment Variables**
   - Never commit .env files
   - Use strong, unique passwords
   - Rotate secrets regularly

5. **Database Security**
   - Use strong passwords
   - Limit connection sources
   - Regular backups

## Scaling Considerations

When you need to scale:

1. **Vertical Scaling**: Upgrade to t2.small or t2.medium
2. **Horizontal Scaling**: Add load balancer and multiple instances
3. **Database Scaling**: Move to RDS
4. **Caching**: Move to ElastiCache
5. **Storage**: Move to S3 for files

## Support and Maintenance

### Health Checks

The deployment includes automatic health checks:
- PM2 auto-restart on failure
- Cron job checking application health every 5 minutes
- Nginx health endpoint at `/health`

### Updating the Application

```bash
# SSH into server
ssh -i bseb-connect-key.pem ubuntu@<ELASTIC_IP>

# Navigate to app directory
cd /var/www/bseb-backend

# Pull latest code
git pull origin main

# Install new dependencies
pnpm install --production

# Build application
pnpm run build

# Run migrations if needed
npx prisma migrate deploy

# Restart application
pm2 restart bseb-backend
```

## Conclusion

This deployment setup provides a cost-effective solution for running the BSEB Connect Backend on AWS. The t2.micro instance is suitable for development and low-traffic production environments. Monitor performance and scale as needed based on actual usage.

For production environments with higher traffic, consider:
- Upgrading to larger instances
- Implementing auto-scaling
- Using managed services (RDS, ElastiCache)
- Adding CDN (CloudFront)
- Implementing monitoring (CloudWatch, New Relic)