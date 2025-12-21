"use strict";

import config from "config";
import ical from "node-ical";
import { JSDOM } from "jsdom";
import Telegram from "../src/telegram.js";

const COOPLIVE = "CO-OP Live";
const ETIHAD = "Etihad Campus";

const telegram = new Telegram({
  apiKey: config.get("telegram.apikey"),
  chatId: config.get("telegram.chatid"),
});

const getCoopLiveEvents = async ({ date }) => {
  const toReturn = [];
  const refDate = new Date(date).setHours(0, 0, 0, 0);

  try {
    const dom = await JSDOM.fromURL("https://www.cooplive.com/events");
    const document = dom.window.document;

    document.querySelectorAll(".listItemWrapper").forEach((elem) => {
      // Scrape the page - this may need updating as their site updates!
      const eventDateStr = elem.querySelector(".start").innerHTML.trim();
      const eventTimeStr = elem.querySelector(".time").innerHTML.trim();
      const eventTitle = elem.querySelector(".title").innerHTML.trim();

      const eventDateTime = new Date(`${eventDateStr} ${eventTimeStr}`);
      const eventRefDate = new Date(eventDateTime).setHours(0, 0, 0, 0);

      if (eventRefDate === refDate) {
        toReturn.push({
          date: eventDateTime.toLocaleDateString("en-GB"),
          start: eventDateTime.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          end: false,
          title: eventTitle,
          venue: COOPLIVE,
        });
      }
    });
  } catch (e) {
    return false;
  }

  return toReturn;
};

const getIcalEvents = async ({ icalUrl, date }) => {
  const refDate = new Date(date).setHours(0, 0, 0, 0);
  const toReturn = [];

  try {
    const data = await ical.async.fromURL(icalUrl);

    for (let k in data) {
      if (data.hasOwnProperty(k)) {
        const event = data[k];
        if (event.type == "VEVENT") {
          if (new Date(event.start).setHours(0, 0, 0, 0) == refDate) {
            if (date < new Date(event.end)) {
              toReturn.push({
                date: new Date(event.start).toLocaleDateString("en-GB"),
                start: new Date(event.start).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                end: new Date(event.end).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                title: event.summary,
                venue: ETIHAD,
              });
            }
          }
        }
      }
    }
    return toReturn;
  } catch (e) {
    return false;
  }
};

const buildMessage = (events) => {
  const title =
    events.length === 1
      ? "There is <b>1</b> event on today:"
      : `There are <b>${events.length}</b> events on today:`;

  let message = `⚠️ Event notice for today, ${new Date().toLocaleDateString()}\n\n`;
  message += title;

  events.forEach((e) => {
    const icon = e.venue === COOPLIVE ? "🎤" : "⚽";
    let eventMessage = `\n\n${icon} <b>${e.title}</b>\n`;
    eventMessage += `<b>Start: </b>${e.start}\n`;
    if (e.end) eventMessage += `<b>End: </b>${e.end}\n`;
    eventMessage += `<b>Venue:</b> ${e.venue}`;
    message += eventMessage;
  });

  message +=
    "\n\n🚦 All transport will be busier than usual before and after the event, and public parking may be limited.";

  return message;
};

const checkEvents = async () => {
  let events = [];

  const icalEventsToday = await getIcalEvents({
    icalUrl: "https://ics.fixtur.es/v2/home/manchester-city.ics",
    date: new Date(),
  });

  const coopLiveEventsToday = await getCoopLiveEvents({
    date: new Date(),
  });

  if (icalEventsToday) events = events.concat(icalEventsToday);
  if (coopLiveEventsToday) events = events.concat(coopLiveEventsToday);

  if (events.length) {
    const message = buildMessage(events);
    telegram.announceMessage(message);
  }

  const errorMessage = (venue) =>
    `🟡 Checking for events at ${venue} was unsuccessful today`;

  if (icalEventsToday === false) {
    telegram.announceMessage(errorMessage(ETIHAD));
  }

  if (coopLiveEventsToday === false) {
    telegram.announceMessage(errorMessage(COOPLIVE));
  }
};

checkEvents();
