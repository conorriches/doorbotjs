"use strict";

import WiegandReader from "wiegand-node";

export default class Wiegand {
  constructor({ pinD0, pinD1, validateCallback }) {
    this.fobReader = new WiegandReader({ d0: pinD0, d1: pinD1 });
    this.fobReader.begin();

    this.fobReader.on("reader", (idDec, idRFID, idHex) => {
      console.log(idDec); // RAW data
      console.log(idRFID); // EM format
      console.log(idHex); // Mifare format

      validateCallback(idHex);
    });
  }
}
