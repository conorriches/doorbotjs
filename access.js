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

import Wiegand from "./src/wiegand.js";
import Keypad from "./src/keypad.js";
import Buzzer from "./src/buzzer.js";
import Lock from "./src/lock.js";
import Telegram from "./src/telegram.js";
import Logger from "./src/logger.js";

/**
 * Set up audit log
 * This logs to level INFO only - e.g. entry logs are recorded to a rotating log
 * ERROR logs are managed my PM2 as this will include the whole program crashing
 */
const logger = new Logger();

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
 * Pin Numbers!
 * Specify here where each thing is connected to.
 * IMPORTANT - NOTE whether it's a board pin number, or BCM pin number. lol.
 */

// Keypad - the keypad library uses *** BOARD mode ***
const p_keypad_r1 = 40;
const p_keypad_r2 = 37;
const p_keypad_r3 = 38;
const p_keypad_r4 = 35;
const p_keypad_c1 = 36;
const p_keypad_c2 = 33;
const p_keypad_c3 = 32;

// Fob Reader - the Wiegand library uses *** BCM mode ***
const p_rfid_d0 = 22;
const p_rfid_d1 = 23;
const p_rfid_beep = 24; // This beeper is louder but can't be used in short bursts, so not usable for the keypad.
const p_rfid_led = 25; // Inbuilt fob reader LED. Red when low, Green when high.

// Auxiliary - uses *** BCM mode ***
const p_relay_1 = 14; // To gate lock (short release)
const p_relay_2 = 15; // To strike lock (long release) (for future)
const p_input_doorbell = 4;
const p_input_rex = 27; // Request To Exit
const p_buzz_outside = 18; // Small beeper behind keypad.
const p_buzz_inside = 8; // Small beeper inside the control case.

// Led status - uses *** BCM mode ***
const p_led_error = 5;
const p_led_run = 7;

/**
 * Locally used GPIO
 * For GPIO used in this file, set up onoff
 * Other pins above may be used by libraries only
 */
const gpio_relay_1 = new Gpio(p_relay_1, "out");
const gpio_relay_2 = new Gpio(p_relay_2, "out");
const gpio_doorbell = new Gpio(p_input_doorbell, "in", "rising", {
  debounceTimeout: 1000,
});
const gpio_rex = new Gpio(p_input_rex, "in", "rising", {
  debounceTimeout: 1000,
});
const gpio_rfid_beep = new Gpio(p_rfid_beep, "out");
const gpio_rfid_led = new Gpio(p_rfid_led, "out");
const gpio_led_error = new Gpio(p_led_error, "out");
const gpio_led_run = new Gpio(p_led_run, "out");

/**
 * Instantiate Items
 */
const buzzer_inside = new Buzzer(p_buzz_inside, 100);
const buzzer_outside = new Buzzer(p_buzz_outside);
const lock = new Lock({
  gpio: gpio_relay_1,
  failsafe: config.get("locks.gate.failsafe"),
  duration: config.get("locks.gate.duration"),
});
const strike = new Lock({
  gpio: gpio_relay_2,
  failsafe: config.get("locks.gate.failsafe"),
  duration: config.get("locks.strike.duration"),
});
const keypad = new Keypad({
  rowPins: [p_keypad_r1, p_keypad_r2, p_keypad_r3, p_keypad_r4],
  colPins: [p_keypad_c1, p_keypad_c2, p_keypad_c3],
  validateCallback: (code) => validate({ entryCode: code, isKeycode: true }),
  beepCallback: () => buzzer_outside.beep(), // TODO: not fucking this
});
const fobReader = new Wiegand({
  d0: p_rfid_d0,
  d1: p_rfid_d1,
  validateCallback: (code) => validate({ entryCode: code, isKeycode: false }),
});

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
  gpio_rfid_led.write(1);
  setTimeout(() => gpio_rfid_led.write(0), 3000);
};

const denyEntry = () => {
  gpio_rfid_beep.write(1);
  setTimeout(() => gpio_rfid_beep.write(0), 3000);
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
  fs.readFile("members.csv", "utf8", (err, data) => {
    if (err) {
      logger.info({
        action: "CHECKMEMBERS",
        message: "Couldn't read members file",
      });
      return false;
    }

    parse(data, function (err, records) {
      if (err) {
        logger.info({
          action: "CHECKMEMBERS",
          message: "Couldn't parse members file",
        });
        return false;
      }

      records.forEach((record) => {
        // Note! memberId could be null as this may not be implemented immediately!
        const [memberCodeId, announceName, memberId] = record;

        if (isKeycode && memberCodeId.startsWith("ff")) {
          if (memberCodeId.slice(2) === entryCode) {
            return {
              memberCodeId,
              announceName,
              memberId,
            };
          }
        }

        if (!isKeycode && !memberCodeId.startsWith("ff")) {
          if (memberCodeId.slice(0, 8) == entryCode.slice(0, 8)) {
            return {
              memberCodeId,
              announceName,
              memberId,
            };
          }
        }
      });

      // No records were found
      return false;
    });
  });
};

/**
 * Validates a given entrycode against members.csv
 * Grants or denies entry accordingly
 * @param {string} entryCode the code to validate
 */
const validate = ({ entryCode, isKeycode }) => {
  const entryDevice = isKeycode ? "keypad" : "fob reader";

  logger.info({
    action: "VALIDATE",
    message: `Validating an entrycode from ${entryDevice}`,
    input: entryCode,
  });

  let memberRecord = entryCodeExistsInMemberlist({
    entryCode: entryCode,
    isKeycode: isKeycode,
  });

  if (memberRecord) {
    logger.info({
      action: "ENTRY",
      message: `Valid entry code from ${entryDevice}, unlocking door`,
      input: memberRecord.memberId || memberRecord.memberCodeId,
    });
    grantEntry();
  } else {
    denyEntry();
  }
};

/**
 * TODO - add a speaker and get this to play a ding dong sound
 * Maybe add an easter egg - 1/10 chance it also plays a chicken squark :D 
 */
const ringDoorbell = () => {
  //TODO
  logger.info({ action: "DOORBELL", message: "The doorbell was rung" });
};

/**
 * When someone presses the REX button inside, release the door.
 * The door can (indeed MUST) still be opened mechanically if this fails
 */
const requestToExit = () => {
  logger.info({ action: "REX", message: "A request to exit was made" });
  lock.trigger();
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
  const flash = millis < 100 || millis > 200 && millis < 300 || millis > 400 && millis < 500;

  gpio_led_run.write(seconds % 2);

  fs.access("logs/error/access.log", fs.F_OK, (errReadingErrLog) => {
    gpio_led_error.write(errReadingErrLog ? 0 : flash);
    if (!errReadingErrLog && seconds % 30 == 0) {
      buzzer_inside.beep();
    }
  });
}, 1000);
