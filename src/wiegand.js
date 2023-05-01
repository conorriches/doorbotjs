"use strict";

import WiegandReader from "wiegand-node";

export default class Wiegand {
  constructor({ pinD0, pinD1, validateCallback }) {
    this.fobReader = new WiegandReader({ d0: pinD0, d1: pinD1, debug: true });
    this.fobReader.begin();
    this.code = [];
    this.lastUsed = 0;
    this.timeout = 30000;

    this.fobReader.on("reader", (idDec, idRFID, idHex) => {
      validateCallback(this.convert(idDec), false);
      this.code = [];
    });

    this.fobReader.on("keypad", (key) => {
      this.lastUsed = Date.now();

      switch(key){
        case 10: // Clear
          this.code = [];
          break;
        case 11: // Enter
          validateCallback(this.code.join(""),true);
          this.code = [];
	  break;
        default:
          this.code.push(key);
      }
    });

    setInterval(this.checkTimeout, 5000);
  }

  checkTimeout() {
    if (this.lastUsed) {
      if (Date.now() - this.lastUsed > this.timeout) {
        this.lastUsed = 0;
        this.code = [];
      }
    }
  }

  convert(decimal){
    let hex = decimal.toString(16);
    hex = hex.replace(/^(.(..)*)$/, "0$1");
    let arr = hex.match(/../g);
    arr.reverse();
    console.log("keyfob arr", arr);
    return arr.join("")
  }
}
