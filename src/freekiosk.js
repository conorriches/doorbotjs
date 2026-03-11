"use strict";

import axios from "axios";

export default class FreeKiosk {
  constructor({ kioskBaseURL, doorbotDomain }) {
    this.doorbotDomain = doorbotDomain;

    this.kioskClient = axios.create({
      baseURL: kioskBaseURL,
    });

    this.kioskClient.post("/api/restart-ui");
  }

  announceEntry({ username, customSound }) {
    this.kioskClient.post("/api/rotation/stop").then(() => {
      this.kioskClient
        .post("/api/navigate", {
          url: `http://${this.doorbotDomain}:3000/screen/entry?u=${username}`,
        })
        .then(() => {
          //TODO, get port number instead of hardcoding
          this.kioskClient.post("/api/audio/play", {
            url: `http://${this.doorbotDomain}:3000/screen/audio/entrance.wav`,
          });

          //TODO, THEN this after N seconds
          this.kioskClient.post("/api/rotation/start");
        });
    });
  }
}
