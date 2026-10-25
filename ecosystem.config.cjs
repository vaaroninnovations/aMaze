module.exports = {
  apps: [
    {
      name: "amaze",
      script: "server/index.mjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      time: true,
    },
  ],
};
