import { parse } from "csv-parse";
import fs from "fs";

/**
 * Checks if a given entrycode exists in members.csv
 * accommodates keycodes and fobcodes
 *
 * returns false if there's no match
 * returns an object if there is
 *
 * @param {string} entryCode The entrycode to validate
 * @param {boolean} isKeycode Whether it's a keycode
 */
export const entryCodeExistsInMemberlist = ({
  logger,
  entryCode,
  isKeycode = false,
}) => {
  return new Promise((resolve, reject) => {
    fs.readFile("members.csv", "utf8", (err, data) => {
      if (err) {
        logger.info({
          action: "CHECKMEMBERS",
          message: "Couldn't read members file",
        });
        reject(-1);
      }

      parse(data, function (err, records) {
        if (err) {
          logger.info({
            action: "CHECKMEMBERS",
            message: "Couldn't parse members file",
          });
          reject(-1);
        }

        records.forEach((record) => {
          // Note! memberId could be null as this may not be implemented immediately!
          const [memberCodeId, announceName, memberId] = record;

          if (isKeycode && memberCodeId.startsWith("ff")) {
            if (memberCodeId.slice(2) === entryCode) {
              resolve({
                memberCodeId,
                announceName,
                memberId,
              });
            }
          }

          if (!isKeycode && !memberCodeId.startsWith("ff")) {
            if (
              memberCodeId.slice(0, 6).toLowerCase() ==
              entryCode.slice(0, 6).toLowerCase()
            ) {
              resolve({
                memberCodeId,
                announceName,
                memberId,
              });
            }
          }
        });

        // No records were found
        reject(0);
      });
    });
  });
};
