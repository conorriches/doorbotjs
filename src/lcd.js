"use strict";

import LCD from "raspberrypi-liquid-crystal";

export default class Lcd {
  static ERR_NO_FOB_READER = -1;
  static ERR_OLD_MEMBER_LIST = -2;

  constructor() {
    this.lcd = new LCD(1, 0x27, 16, 2);
    this.errorCode = 0;
    this.timeout = 0;

    this.lcd.beginSync();
    this.lcd.clearSync();
    this.lcd.noDisplay();
    this.lcd.createCharSync(
      0,
      [0x1f, 0x11, 0x17, 0x11, 0x17, 0x11, 0x1f, 0x00]
    );
  }

  setErrorCode(errorCode = 0) {
    this.errorCode = errorCode;
    this.showDefaultScreen();
  }

  showMessage({ line1 = "", line2 = "", duration = 8000 }) {
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

  showDefaultScreen() {
    // Don't interrupt a message being shown
    if(this.timeout) return;

    this.lcd.clearSync();
    if (this.errorCode) {
      switch (this.errorCode) {
        case this.ERR_NO_FOB_READER:
          this.lcd.printLineSync(0, "No Fob reader!");
          this.lcd.printLineSync(1, "Check wiring");
          break;
        case this.ERR_OLD_MEMBER_LIST:
          this.lcd.printLineSync(0, "Old member list");
          this.lcd.printLineSync(1, "Check internet");
          break;
        default:
          this.lcd.printLineSync(0, "Check error logs");
          this.lcd.printLineSync(1, "Error:" + this.errorCode);
      }
      this.lcd.display();
    } else {
      this.lcd.noDisplay();
    }
  }
}
