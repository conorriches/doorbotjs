"use strict";

import axios from "axios";
import dns from "node:dns";
import os from "node:os";

const options = { family: 4 };

export default class FreeKiosk {
  constructor({ baseURL }) {
    this.myIP;

    this.client = axios.create({
      baseURL: baseURL,
    });

    this.client.post("/api/restart-ui");

    dns.lookup(os.hostname(), options, (err, addr) => {
      if (!err) {
        this.myIP = addr;
        console.log(`IPv4 address: ${addr}`);
      }
    });
  }

  announceEntry({ username, customSound }) {
    if (!this.myIP) return;

    this.client.post("/api/rotation/stop");

    const entryScreenData = new FormData();
    entryScreenData.append("url", `http://${this.myIP}:8080/screen/entry`);

    this.client.post("/api/navigate", {
      data: entryScreenData,
    });

    //TODO, get port number instead of hardcoding
    const entrySoundData = new FormData();
    entrySoundData.append(
      "url",
      `http://${this.myIP}:8080/screen/audio/entrance.wav`
    );

    this.client.post("/api/audio/play", {
      data: entrySoundData,
    });

    //TODO, THEN this after N seconds
    this.client.post("/api/rotation/start");
  }
}
