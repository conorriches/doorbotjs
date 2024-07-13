"use strict";

import fs from "fs";
import path from "path";

import player from "node-wav-player";

export default class Audio {
  constructor() {
    this.soundDirectory = "sounds";
    this.customSoundDirectory = "custom";
    this.entrySound = "metrolink.wav";
    this.wakeSound = "wake.wav";
    this.minutesCoolOff = 5;

    // e.g. [{ fileName: "", lastPlayed: Date.now() }]
    this.rateLimitedFiles = [];
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

  // Play a random exit sound
  playExitSound() {
    let shutdownSound;
    let p = Math.floor(Math.random() * 10);

    switch(p){
      case 1:
      case 2:
        shutdownSound = "logoff.wav";
        break;
      case 3:
      case 4:
	shutdownSound = "toodleoo.wav";
    	break;
      case 5:
      case 6:
 	shutdownSound = "goodbye.wav";
	break;
      default:
    	shutdownSound = "shutdown.wav";
    }

    player.play({
      path: path.join(this.soundDirectory, shutdownSound),
    });
  }

  // Rate limited playing of custom sounds
  playCustomSound(fileName) {
    this.updateRateLimitedFiles();

    // Don't play file if it's within rate limit
    if (this.rateLimitedFileIndex(fileName) > -1) return;

    const filePath = path.join(
      this.soundDirectory,
      this.customSoundDirectory,
      fileName
    );

    fs.access(filePath, fs.F_OK, (err) => {
      if (err) return; // File doesn't exist

      player.play({
        path: filePath,
      });

      // Mark file as played
      this.rateLimitedFiles.push({
        fileName: fileName,
        lastPlayed: Date.now(),
      });
    });
  }

  /**
   * Updates the internal list of recently played (thus banned) files
   */
  updateRateLimitedFiles() {
    this.rateLimitedFiles = this.rateLimitedFiles.filter((record) => {
      Date.now - record.lastPlayed < this.minutesCoolOff * 1000 * 60;
    });
  }

  /**
   * @param {string} fileName
   * @returns index of the file or -1 if it's not recorded
   */
  rateLimitedFileIndex(fileName) {
    let index = this.rateLimitedFiles.findIndex(
      (obj) => obj.fileName == fileName
    );

    return index;
  }
}
