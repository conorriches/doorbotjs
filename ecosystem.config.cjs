module.exports = {
  apps: [
    {
      name: "access",
      script: "./access.js",
      error_file: "logs/error/access.log"
    },
    {
      name: "updatememberlist",
      script: "./updatememberlist.js",
      error_file: "logs/error/updatememberlist.log",
      cron_restart: "*/15 * * * *",
      autorestart: false,
      instances: 1,
    },
  ],
};
