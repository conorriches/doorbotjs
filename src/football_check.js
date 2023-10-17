"use strict";

import ical from "node-ical";

export default class FootballCheck {
  constructor() {
    this.url = "https://ics.fixtur.es/v2/home/manchester-city.ics";
  }

  async checkFootball() {
    try {
      const data = await ical.async.fromURL(this.url);

      for (let k in data) {
        if (data.hasOwnProperty(k)) {
          const event = data[k];
          if (event.type == "VEVENT") {
            if (
              new Date(event.start).setHours(0, 0, 0, 0) ==
              new Date().setHours(0, 0, 0, 0)
            ) {
              if (new Date() < new Date(event.end)) {
                return {
                  date: new Date(event.start).toLocaleDateString("en-GB"),
                  start: new Date(event.start).toLocaleTimeString(),
                  end: new Date(event.end).toLocaleTimeString(),
                  title: event.summary,
                };
              }
            }
          }
        }
      }
      return false;

    } catch (e) {
      // It's not critical if this fails, it's informational only
      console.log(e);
      return false;
    }
  }
}
