"use strict";

import TelegramBot from "node-telegram-bot-api";

export default class Telegram {
  constructor({ apiKey, chatId }) {
    this.bot = new TelegramBot(apiKey, { polling: true });
    this.chatId = chatId;
    this.lastEnteredName = "";
    this.lastMessageString = "";
    this.lastMessageId = 0;
  }

  /**
   * Announces the entry of a user. If the user was the same as the user in the last message,
   * it'll update the previous message rather than send another one. This reduces notifications.
   * @param {string} user
   */
  announceEntry(user) {
    const d = Date.now();
    const time =
      ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

    if (user == this.lastEnteredName && this.lastMessageId) {
      this.bot.editMessageText(`${this.lastMessageString} (${time})`, {
        chat_id: this.chatId,
        message_id: lastMessageId,
      });
    } else {
      const greeting = `🔑 ${user} entered the space! (${time})`;
      this.bot.sendMessage(this.chatId, greeting).then((msg) => {
        this.lastMessageId = msg.message_id;
        this.lastMessageString = greeting;
        this.lastEnteredName = user;
      });
    }
  }

  announceDoorbell() {
    this.bot.sendMessage(this.chatId, "🔔 Doorbell!");
  }

  announceStartup() {
    this.bot.sendMessage(this.chatId, "🤖 The doorbot was started!");
  }

  announceError() {
    this.bot.sendMessage(
      this.chatId,
      "🛑 An error was encountered an written to the log file. No more notifications about errors will be sent until the log file is cleared."
    );
  }
}
