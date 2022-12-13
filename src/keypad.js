"use strict";

import RpiKeypad from "rpi-keypad";

export default class Keypad {
  constructor({
    rowPins,
    colPins,
    validateCallback,
    beepCallback,
    keypadTimeout = 30000,
  }) {
    this.code = [];
    this.lastUsed = 0;
    this.timeout = keypadTimeout;
    this.beep = beepCallback;
    this.validateCallback = validateCallback;
    this.keypad = new RpiKeypad.default(
      [
        ["1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9"],
        ["*", "0", "#"],
      ],
      rowPins,
      colPins,
      true, // use key press events
      50 // interval in ms to poll for key events
    );

    this.keypad.on("keypress", (key) => {
      this.keyPressed(key);
    });

    setInterval(this.checkTimeout, 1000);
  }

  keyPressed(key) {
    this.beep();
    
    if (key === "#") { // Enter
      this.validateCallback(this.code);
      this.clear();
    } else if(key == "*"){ // Clear
      this.beep();
      this.clear();
    } else {
      this.code.push(key);
    }
  }

  // Clears keypad code after some time of inactivity
  checkTimeout() {
    if (this.lastUsed) {
      if (Date.now() - this.lastUsed > this.timeout) {
        code = [];
      }
    }
  }

  clear() {
    this.code = [];
  }
}
