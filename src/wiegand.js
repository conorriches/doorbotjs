"use strict";

import WiegandReader from "wiegand-node";

export default class Wiegand {
  constructor({ pinD0, pinD1, validateCallback }) {
    this.fobReader = new WiegandReader({ d0: pinD0, d1: pinD1 });
    this.fobReader.begin();

    this.fobReader.on("reader", (idDec, idRFID, idHex) => {
      validateCallback(this.convert(idDec));
    });
  }

  convert(decimal){
    let hex = decimal.toString(16);
    hex = hex.replace(/^(.(..)*)$/, "0$1");
    let arr = hex.match(/../g);
    arr.reverse();
    return arr.join("")
  }
}
