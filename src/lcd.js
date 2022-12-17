"use strict";

import LCD from "raspberrypi-liquid-crystal";

export default class Lcd {
  static ERR_LOG_FILE = "errorLog";
  static ERR_OLD_MEMBER_LIST = "memberList";

  constructor() {
    try {
      this.lcd = new LCD(1, 0x27, 16, 2);
      this.checkConnected();

      this.showMessage({
        line1: "HELLO WORLD",
        line2: "I'm alive!",
        duration: 5000,
      });
    } catch (e) {}

    this.errorType = "";
    this.timeout = 0;
  }

  begin() {
    try {
      this.lcd.beginSync();
      this.lcd.clearSync();
    } catch (_) {}
  }
  /**
   * Try to connect if not connected.
   */
  checkConnected() {
    try {
      if (!this.lcd.began) {
        this.begin();
      } else {
        try {
          // Check the i2c bus is actually functioning
          this.lcd.clearSync();
        } catch (e) {
          this.begin();
        }
      }
    } catch (_) {}
  }

  setErrorType(errorType = "") {
    this.checkConnected();

    this.errorType = errorType;
    this.showDefaultScreen();
  }

  showMessage({ line1 = "", line2 = "", duration = 20000 }) {
    this.checkConnected();
    clearTimeout(this.timeout);

    this.lcd.clearSync();
    this.lcd.printLineSync(0, line1);
    this.lcd.printLineSync(1, line2);
    this.lcd.displaySync();

    this.timeout = setTimeout(() => {
      this.timeout = 0;
      this.showDefaultScreen();
    }, duration);
  }

  welcomeMember(announceName) {
    this.checkConnected();
    const greetings = ["Howdy", "Hello", "Heya", "Hi", "Greeting", "Welcome"];
    this.showMessage({
      line1: greetings[Math.floor(Math.random() * greetings.length)] + ",",
      line2: announceName,
    });
  }

  showDefaultScreen() {
    this.checkConnected();
    // Don't interrupt a message being shown
    if (this.timeout) return;

    this.lcd.clearSync();
    if (this.errorType) {
      switch (this.errorType) {
        case this.ERR_LOG_FILE:
          this.lcd.printLineSync(0, "Errors logged");
          this.lcd.printLineSync(1, "Exec pm2 logs");
          break;
        case this.ERR_OLD_MEMBER_LIST:
          this.lcd.printLineSync(0, "Old member list");
          this.lcd.printLineSync(1, "Check internet");
          break;
        default:
          this.lcd.printLineSync(0, "Error occurred:");
          this.lcd.printLineSync(1, this.errorType);
      }
      this.lcd.display();
    } else {
      this.lcd.noDisplay();
    }
  }
}
