# Quick Start - Deploy BSEB Backend to AWS

## 🚀 5-Minute Deployment

### Prerequisites
- AWS CLI installed and configured (`aws configure`)
- Unix-based terminal (Linux/macOS/WSL)

### Step 1: Deploy to AWS
```bash
cd backend/deployment
chmod +x deploy-to-aws.sh
./deploy-to-aws.sh
```

This will:
- Create EC2 t2.micro instance (smallest/cheapest)
- Set up all required software
- Provide you with connection details

### Step 2: Note the Output
After deployment, you'll see:
- **Public IP**: Your server's address
- **SSH Key**: `bseb-connect-key.pem` (keep this safe!)
- **Info File**: `deployment-info.txt` with all details

### Step 3: Upload Your Code
```bash
chmod +x upload-to-server.sh
./upload-to-server.sh
```

### Step 4: Configure Environment
```bash
# SSH into server
ssh -i bseb-connect-key.pem ubuntu@YOUR_IP

# Edit environment variables
nano /var/www/bseb-backend/.env.production
```

Update these critical values:
- Database password
- JWT secrets
- SMS credentials (Twilio)
- Any API keys

### Step 5: Verify Deployment
```bash
# Check if app is running
curl http://YOUR_IP:3000/health

# View logs
ssh -i bseb-connect-key.pem ubuntu@YOUR_IP 'pm2 logs'
```

## 📱 Connect Flutter App

In your Flutter app, update the base URL:

```dart
// lib/config/environment.dart
static String get baseUrl {
  switch (current) {
    case _dev:
      return 'http://YOUR_EC2_IP:3000/';  // Update this
    case _prod:
      return 'https://api.yourdomain.com/';  // Your domain
  }
}
```

## 🔧 Common Commands

### Check Status
```bash
ssh -i bseb-connect-key.pem ubuntu@YOUR_IP 'pm2 status'
```

### View Logs
```bash
ssh -i bseb-connect-key.pem ubuntu@YOUR_IP 'pm2 logs'
```

### Restart App
```bash
ssh -i bseb-connect-key.pem ubuntu@YOUR_IP 'pm2 restart bseb-backend'
```

### Update Code
```bash
./upload-to-server.sh
```

## 💰 Cost Information

**t2.micro instance costs:**
- First year: FREE (AWS Free Tier - 750 hours/month)
- After free tier: ~$8.50/month
- Storage (20GB): ~$2/month
- **Total: ~$10-15/month**

## ⚠️ Important Notes

1. **Save your SSH key**: The `bseb-connect-key.pem` file is critical. Back it up!

2. **Security Group**: By default, ports 22 (SSH), 80 (HTTP), 443 (HTTPS), and 3000 (Node) are open

3. **Database**: PostgreSQL is installed locally with:
   - Database: `bseb_connect`
   - User: `bseb_user`
   - Password: `BsebSecurePass2024!` (CHANGE THIS!)

4. **Monitoring**: The server auto-restarts the app if it crashes

## 🛠️ Troubleshooting

### Can't connect to server?
```bash
# Check instance status
aws ec2 describe-instances --filters "Name=tag:Name,Values=BSEB-Connect-Backend"
```

### App not running?
```bash
ssh -i bseb-connect-key.pem ubuntu@YOUR_IP
pm2 logs  # Check error logs
pm2 restart bseb-backend  # Restart app
```

### Out of memory?
t2.micro has only 1GB RAM. Monitor with:
```bash
ssh -i bseb-connect-key.pem ubuntu@YOUR_IP 'free -m'
```

## 📈 Next Steps

1. **Domain Name**: Point your domain to the Elastic IP
2. **SSL Certificate**: Run `sudo certbot --nginx -d yourdomain.com`
3. **Monitoring**: Set up CloudWatch or similar
4. **Backup**: Enable automated database backups

## 🆘 Need Help?

Check the full documentation: [README.md](README.md)

Server setup logs: `/var/www/setup-complete.txt`
Application logs: `pm2 logs`
System logs: `journalctl -u bseb-backend`