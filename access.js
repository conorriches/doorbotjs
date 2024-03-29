/**
 * ACCESS.js runs the access system. This is the main file.
 *
 * Take a look at the README for information on how this file works and is used.
 * Note that due to how different libraries work, some pins are in BOARD mode, others BCM mode.
 *
 * Written by Conor, 2022. License in package.json.
 */

import fs from "fs";
import config from "config";
import { Gpio } from "onoff";
import { parse } from "csv-parse";
import axios from "axios";
import ical from "node-ical";

import Wiegand from "./src/wiegand.js";
import TimedOutput from "./src/timed_output.js";
import Telegram from "./src/telegram.js";
import Logger from "./src/logger.js";
import Lcd from "./src/lcd.js";

/**
 * System variables
 */
let errors = {
  errorLog: { status: false, notified: false },
  memberList: { status: false, notified: false },
};

/**
 * Pin Numbers!
 * Specify here where each thing is connected to.
 * IMPORTANT - NOTE whether it's a board pin number, or BCM pin number. lol.
 */

// Fob Reader - the Wiegand library uses *** BCM mode ***
const p_rfid_d0 = 4;
const p_rfid_d1 = 17;
const p_rfid_beep = 24; // This beeper is loud but can't be used in short bursts
const p_rfid_led = 25; // Inbuilt fob reader LED. Red when low, Green when high.

// Auxiliary - uses *** BCM mode ***
const p_relay_1 = 8; // To gate lock (short release)
const p_relay_2 = 9; // To strike lock (long release) (for future)
const p_input_doorbell = 23;
const p_input_rex = 27; // Request To Exit

// Led status - uses *** BCM mode ***
const p_led_error = 5;
const p_led_run = 7;

/**
 * Set up audit log
 * This logs to level INFO only - e.g. entry logs are recorded to a rotating log
 * ERROR logs are managed my PM2 as this will include the whole program crashing
 */
const logger = new Logger({ process: "access" });

/**
 * Log that we have life
 */
logger.info({
  action: "START",
  message: "Doorbot was started",
});

/**
 * Announce to telegram on key events:
 * - Entry
 * - startup
 * - doorbell (eventually also door opened)
 * - initial error - when an error log first appears, notify.
 */
const telegram = new Telegram({
  apiKey: config.get("telegram.apikey"),
  chatId: config.get("telegram.chatid"),
});
telegram.announceStartup();

/**
 * Set up API for membership system
 */
const membershipSystem = axios.create({
  baseURL: "members.hacman.org.uk",
  timeout: 5000,
  headers: {
    ApiKey: config.get("members.apikey"),
  },
});

/**
 * Locally used GPIO
 * For GPIO used in this file, set up onoff
 * Other pins above may be used by libraries only
 */
const gpio_doorbell = new Gpio(p_input_doorbell, "in", "falling", {
  debounceTimeout: 100,
});
const gpio_rex = new Gpio(p_input_rex, "in", "falling", {
  debounceTimeout: 100,
});
const gpio_led_error = new Gpio(p_led_error, "out");
const gpio_led_run = new Gpio(p_led_run, "out");

/**
 * Instantiate Items
 */
const buzzer_outside = new TimedOutput({ pin: p_rfid_beep });
const led_outside = new TimedOutput({ pin: p_rfid_led });
const lock = new TimedOutput({
  pin: p_relay_1,
  duration: config.get("locks.gate.duration"),
});
const strike = new TimedOutput({
  pin: p_relay_2,
  duration: config.get("locks.strike.duration"),
});
const fobReader = new Wiegand({
  pinD0: p_rfid_d0,
  pinD1: p_rfid_d1,
  validateCallback: (code, isKeycode) => validate({ entryCode: code, isKeycode}),
});
const lcdDisplay = new Lcd();

/**
 * Watch inputs
 */
gpio_doorbell.watch((err) => {
  if (err) throw err;

  ringDoorbell();
});

gpio_rex.watch((err) => {
  if (err) throw err;

  requestToExit();
});

const grantEntry = () => {
  lock.trigger();
  strike.trigger();
  led_outside.trigger({ duration: 5000, blocking: true });
  setTimeout(() => buzzer_outside.trigger({ duration: 50 }), 100);
  setTimeout(() => buzzer_outside.trigger({ duration: 50 }), 200);
  setTimeout(() => buzzer_outside.trigger({ duration: 50 }), 300);
};

const denyEntry = () => {
  buzzer_outside.trigger({ duration: 5000, blocking: true });
};

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
const entryCodeExistsInMemberlist = ({ entryCode, isKeycode = false }) => {
  return new Promise((resolve, reject) => {
    fs.readFile("members.csv", "utf8", (err, data) => {
      if (err) {
        logger.info({
          action: "CHECKMEMBERS",
          message: "Couldn't read members file",
        });
        reject();
      }

      parse(data, function (err, records) {
        if (err) {
          logger.info({
            action: "CHECKMEMBERS",
            message: "Couldn't parse members file",
          });
          reject();
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
            if (memberCodeId.slice(0, 6) == entryCode.slice(0, 6)) {
              resolve({
                memberCodeId,
                announceName,
                memberId,
              });
            }
          }
        });

        // No records were found
        reject("no record found");

	lcdDisplay.showMessage({
		line1: 'Unknown fob!',
		line2: entryCode,
		duration: 20000
	});

      });
    });
  });
};

/**
 * Validates a given entrycode against members.csv
 * Grants or denies entry accordingly
 * @param {string} entryCode the code to validate
 */
const validate = ({ entryCode, isKeycode }) => {
  if (entryCode.length < 6) {
    denyEntry();
    return;
  }

  const entryDevice = isKeycode ? "keypad" : "fob reader";

  logger.info({
    action: "VALIDATE",
    message: `Validating an entrycode from ${entryDevice}`,
    input: entryCode,
  });

  entryCodeExistsInMemberlist({
    entryCode: entryCode.toLowerCase(),
    isKeycode: isKeycode,
  })
    .then((memberRecord) => {
      logger.info({
        action: "ENTRY",
        message: `Valid entry code from ${entryDevice}, unlocking door`,
        input: memberRecord.memberId || memberRecord.memberCodeId,
      });
      grantEntry();

      lcdDisplay.welcomeMember(memberRecord.announceName);

      const anonymous = ["anon", "Anon", "anonymous", "Anonymous"];
      if (
        !!memberRecord.announceName &&
        anonymous.indexOf(memberRecord.announceName) == -1
      ) {
        telegram.announceEntry(memberRecord.announceName);
      }

      membershipSystem
        .post("acs/activity", {
          tagId: memberRecord.memberCodeId,
          device: entryDevice,
          occurredAt: "0",
        })
        .catch((error) => {});
    })
    .catch((e) => {
      console.log("Entry denied or error granting entry", e);
      denyEntry();
    });
};

/**
 * TODO - add a speaker and get this to play a ding dong sound
 * Maybe add an easter egg - 1/10 chance it also plays a chicken squark :D
 */
const ringDoorbell = () => {
  telegram.announceDoorbell();
  logger.info({ action: "DOORBELL", message: "The doorbell was rung" });
};

/**
 * When someone presses the REX button inside, release the door.
 * The door can (indeed MUST) still be opened mechanically if this fails
 */
const requestToExit = () => {
  logger.info({ action: "REX", message: "A request to exit was made" });
  grantEntry();
  lcdDisplay.showMessage({
    line1: "Goodbye!",
    line2: "See you soon",
    duration: 8000,
  });
};

/**
 * Monitors errors of differing types and announces new error types as they happen
 *
 * Types:
 * - errorLog - an error log file is written
 * - memberList - member list file is out of date
 */
const monitorError = ({ type, isInError, errorMessage = "" }) => {
  errors[type]["status"] = isInError;

  if (errors[type]["status"] && !errors[type]["notified"]) {
    telegram
      .announceError({ type: type, details: errorMessage })
      .then((_) => {
        errors[type]["notified"] = true;
        lcdDisplay.setErrorType(type);
      })
      .catch((_) => {
        console.log("Error reporting error to telegram");
      });
  }

  // Handle resetting of status
  if (!errors[type]["status"] && errors[type]["notified"]) {
    errors[type]["notified"] = false;
    lcdDisplay.setErrorType();
  }
};

/**
 * Sets the error variables based on file system activity
 * - Log file
 * - Outdated member list
 */
const checkForErrors = () => {
  // Raise error if there's a log file with content
  fs.stat("logs/error/access.log", (err, stats) => {
    if (!err) {
      const { size } = stats;

      monitorError({
        type: "errorLog",
        isInError: !!size,
        errorMessage:
          "Content has been written to the error log. Run `pm2 logs` on the doorbot for info.",
      });
    }
  });

  // Raise error if member list is over 6 hours old
  fs.stat("members.csv", (err, stats) => {
    if (!err) {
      const { mtime } = stats;

      const memberListAge = Math.abs(new Date() - mtime);
      const diffHours = Math.ceil(memberListAge / (1000 * 60 * 60));

      monitorError({
        type: "memberList",
        isInError: diffHours > 6,
        errorMessage: "members.csv is over 6 hours old",
      });
    }
  });
};

/**
 * Lets the membership system know we're alive
 */
const sendHeartbeat = () => {
  membershipSystem.post("acs/node/heartbeat").catch((error) => {});
};

/**
 *  Returns the index of which error is active
 */
const errorStatus = () => {
  return Object.values(errors).findIndex((v) => v.status);
};

/**
 * Update LED status on front panel
 * RUN led blinks every second, to show life
 * ERROR led illuminates on the presence of an error log
 */
setInterval(() => {
  const d = new Date();
  const seconds = d.getSeconds();
  const millis = d.getMilliseconds();
  let flash = false;

  // Blink Status LED
  gpio_led_run.write(seconds % 2);
  if (millis < 50 && seconds % 10 ==0) led_outside.trigger({duration: 20});
  // Blink error LED
  const activeErrors = errorStatus();
  if (activeErrors > -1) {
    const blinkCount = activeErrors + 2;
    const interval = 300;
    const len = interval * blinkCount;
    flash =
      seconds % 2 &&
      millis < len &&
      millis.toString().padStart(3, "0").charAt(0) % 3 === 0;
  }

  gpio_led_error.write(errors["errorLog"] ? +flash : 0);
}, 50);

/**
 * Every few minutes, check to see if there's an error log
 */
setInterval(() => {
  checkForErrors();
}, 1000 * 60 * 5);

/**
 * Sent heartbeat to the membership system every few minutes
 * This helps debug if the doorbot goes offline
 */
setInterval(() => {
  sendHeartbeat();
}, 1000 * 60 * 5);


// This is a bodge!!!!! Not committed to GH yet
const nastyFootballAlertHack = async () => {
  const data = await ical.async.fromURL(
    "https://ics.fixtur.es/v2/home/manchester-city.ics"
  );
  try {
    for (let k in data) {
      if (data.hasOwnProperty(k)) {
        const event = data[k];
        if (event.type == "VEVENT") {
          if (new Date(event.start).setHours(0,0,0,0) == new Date().setHours(0,0,0,0)) {
            const e = {
              date: new Date(event.start).toLocaleDateString("en-GB"),
              start: new Date(event.start).toLocaleTimeString(),
              end: new Date(event.end).toLocaleTimeString(),
              title: event.summary
            };

            if(new Date() < new Date(event.end)){
              telegram.announceMessage(`<b>Football Notice!</b>\nA football match is on today at the Etihad! \n\n<b>${e.title}</b> \n\n<b>Date:</b> ${e.date} \n<b>Start time:</b> ${e.start} \n<b>End time:</b> ${e.end} \n\n<i>Roads and public transport will be extremely busy before and after the event, and on street parking will be extremely limited.</i>`)
            }
          }
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
};

setInterval(nastyFootballAlertHack, 1000 * 60 * 60 * 8)
await nastyFootballAlertHack()


/**
 * Startup activities
 */
checkForErrors();
sendHeartbeat();
