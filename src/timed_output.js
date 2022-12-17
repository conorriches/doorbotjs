"use strict";

import { Gpio } from "onoff";

export default class TimedOutput {
  constructor({ pin, duration = 50 }) {
    this.timeout = 0;
    this.output = new Gpio(pin, "high", "none", { activeLow: true });
    this.duration = duration;
    this.blocked = false;
  }

  trigger({ duration = 0, blocking = false }) {
    if (this.blocked) return;
    if (blocking) this.blocked = true;
    if (this.timeout) clearTimeout(this.timeout);

    this.output.write(1, () => {
      this.timeout = setTimeout(() => {
        this.output.write(0);
        this.timeout = 0;
        this.blocked = false;
      }, duration || this.duration);
    });
  }
}
