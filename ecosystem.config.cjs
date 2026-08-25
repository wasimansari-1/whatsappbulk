/**
 * PM2 Production Ecosystem Configuration
 * Enterprise WhatsApp Marketing, CRM & Communication SaaS Platform
 */

module.exports = {
  apps: [
    {
      name: 'whatsapp-user-api',
      script: './apps/user-api/src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        USER_API_PORT: 5001
      },
      max_memory_restart: '500M',
      autorestart: true,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      listen_timeout: 10000,
      error_file: './logs/pm2-user-api-error.log',
      out_file: './logs/pm2-user-api-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'whatsapp-admin-api',
      script: './apps/admin-api/src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        ADMIN_API_PORT: 5002
      },
      max_memory_restart: '300M',
      autorestart: true,
      restart_delay: 3000,
      error_file: './logs/pm2-admin-api-error.log',
      out_file: './logs/pm2-admin-api-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'whatsapp-campaign-worker',
      script: './apps/user-api/src/workers/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '500M',
      autorestart: true,
      restart_delay: 3000,
      error_file: './logs/pm2-worker-error.log',
      out_file: './logs/pm2-worker-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'whatsapp-user-web',
      script: './apps/user-web/server.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '200M',
      autorestart: true,
      error_file: './logs/pm2-user-web-error.log',
      out_file: './logs/pm2-user-web-out.log',
      time: true
    }
  ]
};
