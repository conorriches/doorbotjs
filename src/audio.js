"use strict";

import fs from "fs";
import path from "path";

import player from "node-wav-player";

export default class Audio {
  constructor() {
    this.soundDirectory = "../sounds";
    this.customSoundDirectory = "custom";
    this.entrySound = "metrolink.wav";
    this.wakeSound = "wake.wav";
  }

  // Whenever anyone enters
  playEntrySound() {
    player.play({
      path: path.join(this.soundDirectory, this.entrySound),
    });
  }

  // Wake the bluetooth speaker up to stop it sleeping
  playWakeSound() {
    player.play({
      path: path.join(this.soundDirectory, this.wakeSound),
    });
  }

  playCustomSound(fileName) {
    const filePath = path.join(
      this.soundDirectory,
      this.customSoundDirectory,
      fileName
    );

    fs.access(filePath, fs.F_OK, (err) => {
      if (err) {
        console.log(err);
        return;
      }

      player.play({
        path: filePath,
      });
    });
  }
}
