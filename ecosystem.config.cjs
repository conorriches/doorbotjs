module.exports = {
  apps: [
    {
      name: "access",
      script: "./access.js",
      error_file: "logs/error/access.log",
      instance_var: "INSTANCE_ID",
    },
    {
      name: "updatememberlist",
      script: "./jobs/updatememberlist.js",
      error_file: "logs/error/updatememberlist.log",
      cron_restart: "*/5 * * * *",
      autorestart: false,
      instances: 1,
      instance_var: "INSTANCE_ID",
    },
    {
      name: "announceEvents",
      script: "./jobs/announceEvents.js",
      error_file: "logs/error/announceEvents.log",
      cron_restart: "0 6,16 * * *",
      autorestart: false,
      instances: 1,
      instance_var: "INSTANCE_ID",
    },
    {
      name: "webview",
      script: "./webserver/index.js",
      error_file: "logs/error/webview.log",
    },
  ],
};
