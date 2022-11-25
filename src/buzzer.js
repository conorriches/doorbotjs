"use strict";

import { Gpio } from "onoff";

export default class Buzzer {
  constructor(pin, duration = 50) {
    this.buzzer = new Gpio(pin, "out");
    this.duration = duration;
  }

  beep() {
    this.buzzer.write(1, () => {
      setTimeout(this.duration, () => this.buzzer.write(0));
    });
  }
}
