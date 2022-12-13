"use strict";

import { Gpio } from "onoff";

export default class Buzzer {
  constructor({ pin, duration = 50 }) {
    this.timeout = 0;
    this.buzzer = new Gpio(pin, "high", "none", { activeLow: true });
    this.duration = duration;
    this.blocked = false;
  }

  beep({ duration, blocking }) {
    if (this.blocked) return;
    if (blocking) this.blocked = true;
    if (this.timeout) clearTimeout(this.timeout);

    this.buzzer.write(1, () => {
      this.timeout = setTimeout(() => {
        this.buzzer.write(0);
        this.timeout = 0;
        this.blocked = false;
      }, duration || this.duration);
    });
  }
}
