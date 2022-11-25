"use strict";

export default class Lock {
  constructor({ gpio, failsafe = false, duration = 50 }) {
    this.lock = gpio
    this.failsafe = !!failsafe;
    this.duration = parseInt(duration);
  }

  /**
   * In failsafe mode (e.g. magnet), this will energise the lock.
   * Otherwise (e.g. strike), it will ensure the output is off, which it should already be
   */
  set() {
    this.lock.writeSync(failsafe ? 1 : 0);
  }

  /**
   * In failsafe mode (e.g. magnet), this will de-energise the lock
   * Otherwise (e.g. strike), it will set the lock
   */
  unset() {
    this.lock.writeSync(failsafe ? 0 : 1);
  }

  trigger() {
    this.unset();
    setTimeout(this.duration, () => this.set());
  }
}
