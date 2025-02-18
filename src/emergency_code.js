"use strict";

class EmergencyCode {
  constructor({ logger }) {
    this.logger = logger;
  }

  validate(code) {
    return new Promise((resolve, reject) => {
      fs.readFile("emergency_codes.csv", "utf8", (err, data) => {
        if (err) {
          this.logger.info({
            action: "CHECKEMERGENCYCODES",
            message: "Couldn't read emergency codes file",
          });
          reject();
        }

        parse(data, function (err, records) {
          if (err) {
            this.logger.info({
              action: "CHECKEMERGENCYCODES",
              message: "Couldn't parse emergency codes file",
            });
            return reject();
          }

          let accessGranted = false;
          records.map((record) => {
            const [emergencyCode, used] = record;

            if (emergencyCode === code) {
              if (used === "0") {
                accessGranted = true;
                return [emergencyCode, "1"];
              }

              this.logger.info({
                action: "CHECKEMERGENCYCODES",
                message: `Emergency code (${code}) was used but it was already used`,
              });
            }

            return record;
          });

          if (accessGranted) {
            this.logger.info({
              action: "CHECKEMERGENCYCODES",
              message: `Emergency code (${code}) used successfully`,
            });

            resolve();

            fs.writeFile(
              "emergency_codes.csv",
              records,
              "utf8",
              function (err) {
                if (err) {
                  console.log(
                    "Some error occurred - file either not saved or corrupted file saved.",
                  );
                } else {
                  console.log("It's saved!");
                }
              },
            );
          }

          // No records were found
          reject("no emergency code found");
        });
      });
    });
  }
}

export default EmergencyCode;
