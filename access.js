/**
 * ACCESS.js runs the access system. This is the main file.
 *
 * Take a look at the README for information on how this file works and is used.
 * Note that due to how different libraries work, some pins are in BOARD mode, others BCM mode.
 *
 * Written by Conor, 2022. License in package.json.
 */

import { Gpio } from "onoff";
import { parse } from "csv-parse";
import axios from "axios";
import config from "config";
import fs from "fs";

import Audio from "./src/audio.js";
import FootballCheck from "./src/football_check.js";
import Lcd from "./src/lcd.js";
import Logger from "./src/logger.js";
import Telegram from "./src/telegram.js";
import TimedOutput from "./src/timed_output.js";
import Wiegand from "./src/wiegand.js";

/**
 * Pin Numbers!
 * Specify here where each thing is connected to - uses BCM mode
 */

// Fob Reader - the Wiegand library
const p_rfid_d0 = 4;
const p_rfid_d1 = 17;
const p_rfid_beep = 24; // This beeper is loud but can't be used in short bursts
const p_rfid_led = 25; // Inbuilt fob reader LED. Red when low, Green when high.

// Auxiliary
const p_relay_1 = 8; // To gate lock (short release)
const p_relay_2 = 9; // To strike lock (long release) (for future)
const p_input_doorbell = 23;
const p_input_rex = 27; // Request To Exit

// Led status
const p_led_error = 5;
const p_led_run = 7;

/**
 * System variables
 */
const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;

let errors = {
  errorLog: { status: false, notified: false },
  memberList: { status: false, notified: false },
};

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
  validateCallback: (code, isKeycode) =>
    validate({ entryCode: code, isKeycode }),
});
const lcdDisplay = new Lcd();
const footballCheck = new FootballCheck();
const audio = new Audio();

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

  // Three pips to acknowledge correct code
  setTimeout(() => buzzer_outside.trigger({ duration: 20 }), SECOND);
  setTimeout(() => buzzer_outside.trigger({ duration: 20 }), SECOND * 2);
  setTimeout(() => buzzer_outside.trigger({ duration: 20 }), SECOND * 3);
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
        reject("no record found");

        lcdDisplay.showMessage({
          line1: "Unknown fob!",
          line2: entryCode,
          duration: 20000,
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
        input: memberRecord.memberCodeId,
        memberID: memberRecord.memberId,
      });
      grantEntry();

      lcdDisplay.welcomeMember(memberRecord.announceName);
      audio.playEntrySound();

      // Folk were told they could use anon instead of nothing back when the field was mandatory
      const anonymous = ["anon", "Anon", "anonymous", "Anonymous"];
      if (
        !!memberRecord.announceName &&
        anonymous.indexOf(memberRecord.announceName) == -1
      ) {
        telegram.announceEntry(memberRecord.announceName);
        
        // Play custom sound if member ID is implemented
        if (memberRecord.memberId) {
          setTimeout(
            () => audio.playCustomSound(`${memberRecord.memberId}.wav`),
            SECOND * 2
          );
        }
      }
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
  audio.playExitSound();
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
      const diffHours = Math.ceil(memberListAge / HOUR);

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
  if (millis < 50 && seconds % 10 == 0) led_outside.trigger({ duration: 20 });
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
}, MINUTE * 5);

/**
 * Sent heartbeat to the membership system every few minutes
 * This helps debug if the doorbot goes offline
 */
setInterval(() => {
  sendHeartbeat();
}, MINUTE * 5);

// Shout out if there's a football event on today
const checkFootball = async () => {
  const event = footballCheck.checkFootball();
  if (event) {
   telegram.announceFootballEvent(event);
  }
};

// We need to keep the bluetooth speaker awake, so we play a tiny sound occasionally
const wakeSpeaker = () => {
  //audio.playWakeSound();
};

// Just an easter egg
const playPigeon = () => {
  audio.playCustomSound("pigeon.wav");
};

/**
 * Startup activities
 */
setInterval(wakeSpeaker, MINUTE * 10);
setInterval(playPigeon, MINUTE * 60);
setInterval(checkFootball, HOUR * 8);
playPigeon();
checkForErrors();
sendHeartbeat();
