import fs from "fs";
import config from "config";
import Logger from "./src/logger.js";
import { parse } from "csv-parse";
import axios from "axios";

const logger = new Logger({process: "updatememberlist"});
const tempFile = "temp/members.csv";
const membersFile = "members.csv";
const key = config.get("members.querykey");

/**
 * Download file to temporary file for checking
 * This prevents a 404/500 page replacing the memberlist
 */
axios
  .get(`https://members.hacman.org.uk/api/keyfobs/csv?api_token=${key}`, {
    responseType: "stream",
  })
  .then((response) => {
    if (response.status != 200) {
      logger.info({
        action: "DOWNLOAD",
        message: "Memberlist response wasn't a 200",
      });
      throw "BadStatus"
    }
    response.data.pipe(fs.createWriteStream(tempFile)).on('close', () => {
      verifyFile();
    });
  }).catch(e => {
    // If we can't get a new memberlist, oh well.
    // access.js will report if the memberlist goes too stale.
    console.log(e);
  });

/**
 * Verify what we downloaded looks legit
 * Can't be 0 length (blank page means bad api key)
 * Must parse as a CSV
 */
const verifyFile = () => {
  fs.readFile(tempFile, "utf8", (err, data) => {
    if (err) {
      logger.info({
        action: "READ",
        message: "Couldn't read temporary members file",
      });
      return;
    }

    if (data.length == 0) {
      logger.info({
        action: "LENGTH",
        message: "Memberlist length was 0 (incorrect API key?)",
      });
      return;
    }

    parse(data, function (err, records) {
      if (err) {
        logger.info({
          action: "PARSE",
          message: `Error parsing new members file: ${err}`,
        });
        return;
      }

      fs.writeFile(membersFile, data, (err) => {
        if (err) {
          logger.info({
            action: "WRITE",
            message: "Error writing new members file",
          });
        }
      });
    });
  });
};
