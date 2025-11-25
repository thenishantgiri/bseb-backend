module.exports = {
  apps: [{
    // Application configuration
    name: 'bseb-backend',
    script: './dist/main.js',
    cwd: '/var/www/bseb-backend',

    // Instance configuration for t2.micro (1 vCPU, 1 GB RAM)
    instances: 1,  // Single instance for t2.micro
    exec_mode: 'fork',  // Fork mode for single instance

    // Memory management
    max_memory_restart: '800M',  // Restart if memory exceeds 800MB (leaving 200MB for system)

    // Restart policies
    autorestart: true,
    watch: false,  // Disable in production
    max_restarts: 10,
    min_uptime: '10s',

    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=768'  // Limit Node.js memory usage
    },

    // Logging configuration
    error_file: '/var/www/bseb-backend/logs/error.log',
    out_file: '/var/www/bseb-backend/logs/out.log',
    log_file: '/var/www/bseb-backend/logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    log_type: 'json',

    // Advanced features
    instance_var: 'INSTANCE_ID',
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true,

    // Monitoring
    monitoring: {
      http: true,
      https: false,
      transactions: true,
      http_latency: 0.6,
      http_code: 500,
      alert_enabled: true,
      custom_probes: true,
      network: true,
      ports: true
    }
  }],

  // Deploy configuration (optional - for automated deployments)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'YOUR_EC2_IP',
      key: '/path/to/bseb-connect-key.pem',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/bseb-backend.git',
      path: '/var/www/bseb-backend',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'pnpm install && pnpm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};