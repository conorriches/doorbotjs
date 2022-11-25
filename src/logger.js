"use strict";

import { transports, createLogger, format } from "winston";
const { combine, timestamp, label, printf } = format;
import "winston-daily-rotate-file";

class Logger {
  constructor() {
    const myFormat = printf(({ message, action, timestamp, input }) => {
      const inputStr = input ? ` [INPUT: ${input}]` : "";
      return `${timestamp} [${action}]${inputStr}: ${message}`;
    });

    this.logger = createLogger({
      format: combine(timestamp(), myFormat),
      transports: [
        new transports.DailyRotateFile({
          level: "info",
          filename: "./logs/info/%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxFiles: "30d",
        }),
      ],
    });
  }

  info(params) {
    this.logger.info(params);
  }
}

export default Logger;
