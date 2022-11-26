module.exports = {
  apps: [
    {
      name: "access",
      script: "./access.js",
      error_file: "logs/error/access.log",
      instance_var: 'INSTANCE_ID',
    },
    {
      name: "updatememberlist",
      script: "./updatememberlist.js",
      error_file: "logs/error/updatememberlist.log",
      cron_restart: "*/15 * * * *",
      autorestart: false,
      instances: 1,
      instance_var: 'INSTANCE_ID',
    },
  ],
};
