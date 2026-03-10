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

    this.client.post("/api/rotation/stop").then(() => {
      this.client
        .post("/api/navigate", {
          url: `http://${this.myIP}:3000/screen/entry?u=${username}`,
        })
        .then(() => {
          //TODO, get port number instead of hardcoding
          this.client.post("/api/audio/play", {
            url: `http://${this.myIP}:3000/screen/audio/entrance.wav`,
          });

          //TODO, THEN this after N seconds
          this.client.post("/api/rotation/start");
        });
    });
  }
}
