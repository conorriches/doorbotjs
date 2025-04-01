"use strict";

import axios from "axios";
import axiosRetry from "axios-retry";

export default class Telegram {
  constructor({ apiKey, chatId }) {
    this.client = axios.create({
      baseURL: `https://api.telegram.org/bot${apiKey}/`,
    });
    axiosRetry(this.client, { retryDelay: axiosRetry.exponentialDelay });

    this.chatId = chatId;
    this.lastEnteredName = "";
    this.lastMessageString = "";
    this.lastMessageId = 0;
  }

  announceStartup() {
    this.client
      .post("/sendMessage", {
        chat_id: this.chatId,
        text: "🤖 The doorbot was started!",
      })
      .catch(() => {});
  }

  announceMessage(text) {
    this.client.post("/sendMessage", {
      chat_id: this.chatId,
      parse_mode: "HTML",
      text,
    });
  }

  announceEmergencyEntry() {
    this.client.post("/sendMessage", {
      chat_id: this.chatId,
      parse_mode: "HTML",
      text: "🚨 Emergency code used",
    });
  }

  /**
   * Announces the entry of a user. If the user was the same as the user in the last message,
   * it'll update the previous message rather than send another one. This reduces notifications.
   * @param {string} user
   */
  announceEntry(user) {
    const d = new Date();
    const time =
      ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

    // Edit message if the same person has re-entered
    if (user == this.lastEnteredName && this.lastMessageId) {
      const newString = `${this.lastMessageString} (${time})`;
      this.lastMessageString = newString;

      this.client
        .post("/editMessageText", {
          chat_id: this.chatId,
          message_id: this.lastMessageId,
          text: newString,
        })
        .catch(() => {});
    } else {
      const greeting = `🔑 ${decodeURIComponent(user)} (${time})`;

      this.client
        .post("/sendMessage", {
          chat_id: this.chatId,
          text: greeting,
          disable_notification: true,
        })
        .then((msg) => {
          this.lastMessageId = msg.data.result.message_id;
          this.lastMessageString = greeting;
          this.lastEnteredName = user;
        })
        .catch(() => {});
    }
  }

  announceDoorbell() {
    this.client.post("/sendMessage", {
      chat_id: this.chatId,
      text: "🔔 Doorbell!",
    });
  }

  announceError({ type = "", details = "" }) {
    const typeStr = type ? `[${type}] ` : "";
    const detailsStr = details
      ? `\nExtra information on the error below: \n\n${details}`
      : "";

    return this.client.post("/sendMessage", {
      chat_id: this.chatId,
      text: `🛑 ${typeStr}An error was encountered with the entry system.${detailsStr}`,
    });
  }

  announceFootballEvent(event) {
    this.announceMessage(
      `<b>Football Notice!</b>\nA football match is on today at the Etihad! \n\n<b>${event.title}</b> \n\n<b>Date:</b> ${event.date} \n<b>Start time:</b> ${event.start} \n<b>End time:</b> ${event.end} \n\n<i>Roads and public transport will be extremely busy before and after the event, and on street parking will be extremely limited.</i>`
    );
  }
}
