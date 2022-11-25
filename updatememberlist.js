import https from "https"; // or 'https' for https:// URLs
import fs from "fs";
import config from "config";
import Logger from "./src/logger.js";
import { parse } from "csv-parse";

const logger = new Logger();
const tempFile = "temp/members.csv";
const membersFile = "members.csv";
const key = config.get("members.querykey");

/**
 * Download file to temporary file for checking
 * This prevents a 404/500 page replacing the memberlist
 */
https.get(
  `https://members.hacman.org.uk/query2.php?key=${key}`,
  function (response) {
    if (response.statusCode != 200) {
      logger.info({
        action: "DOWNLOAD",
        message: "Memberlist response wasn't a 200",
      });
    }

    const file = fs.createWriteStream(tempFile);
    response.pipe(file);

    file.on("finish", () => {
      file.close();
      verifyFile();
    });
  }
);

/**
 * Verify what we downloaded looks legit
 * Can't be 0 length (blank page means bad api key)
 * Must parse as a CSV
 */
const verifyFile = () => {
  fs.readFile(tempFile, "utf8", (err, data) => {
    if (err) {
      logger.info({
        action: "DOWNLOAD",
        message: "Couldn't read temporary members file",
      });
      return;
    }

    if (data.length == 0) {
      logger.info({
        action: "DOWNLOAD",
        message: "Memberlist length was 0 (incorrect API key?)",
      });
      return;
    }

    parse(data, function (err, records) {
      if (!err) {
        fs.writeFile(membersFile, data, (err) => {
          if (err) {
            logger.info({
              action: "DOWNLOAD",
              message: "Error writing new members file",
            });
          }
        });
      }
    });
  });
};

/**
 * log error if memberlist is too old ( > 2h)
 */