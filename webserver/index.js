import express from "express";
import partials from "express-partials";
import fileUpload from "express-fileupload";
import flash from "express-flash-message";
import session from "express-session";
import { fileTypeFromBuffer } from "file-type";
import { readFileSync } from "fs";
import pm2 from "pm2";

import Logger from "../src/logger.js";
import { entryCodeExistsInMemberlist } from "../helpers/memberList.js";
import {
  MONITORED_PROCESSES,
  getMembersListStatus,
  getErrorLogStatus,
  getPm2Processes,
  deriveOverallStatus,
} from "./monitoring.js";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
const port = 3002;
const app = express();

app.set("views", "webserver/views/");
app.set("view engine", "ejs");

app.use(express.static("webserver/public"));
app.use(partials());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);
app.use(
  flash({
    sessionKeyName: "express-flash-message",
  })
);

const logger = new Logger({ process: "webserver" });

app.get("/", (req, res) => {
  const locals = {
    menu: "home",
    title: "Home",
    message: "Hello there!",
  };

  res.render("index", locals);
});

app.get("/admin", async (req, res) => {
  const { connected, processes } = await getPm2Processes(pm2);
  const access = processes?.access;
  const accessRunning =
    connected &&
    access?.status === "online" &&
    access?.uptime > 10000;

  res.render("admin", { menu: "admin", connected, accessRunning, hasError: false });
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/status", async (req, res) => {
  try {
    const [pm2Result, membersStatus, ...errorLogs] = await Promise.all([
      getPm2Processes(pm2),
      getMembersListStatus(),
      ...MONITORED_PROCESSES.map((name) => getErrorLogStatus(name)),
    ]);

    const errorLogsByProcess = Object.fromEntries(
      MONITORED_PROCESSES.map((name, i) => [name, errorLogs[i]])
    );

    const accessStatus = pm2Result.processes?.access?.status ?? "not_found";
    const overall = deriveOverallStatus({
      accessStatus,
      membersStatus,
      errorLogs: errorLogsByProcess,
    });

    const body = {
      statusVersion: "1.0",
      generatedAt: new Date().toISOString(),
      source: "doorbot",
      overall,
      processes: pm2Result.processes,
      membersList: {
        present: membersStatus.present,
        fresh: membersStatus.fresh,
        empty: membersStatus.empty,
        count: membersStatus.count,
        ageHours: membersStatus.ageHours,
        maxAgeHours: membersStatus.maxAgeHours,
      },
      errorLogs: errorLogsByProcess,
      extensions: {
        version,
        uptime: process.uptime(),
        pm2Connected: pm2Result.connected,
      },
    };

    res.status(overall.status === "fail" ? 503 : 200).json(body);
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

app.get("/sounds", (req, res) => {
  const locals = {
    menu: "home",
    title: "Home",
    message: "Hello there!",
  };

  res.render("sounds", locals);
});

app.post("/sounds", (req, res) => {
  const { fobid, keycode } = req.body;
  const sound = req?.files?.sound;

  if ((!fobid && !keycode) || !sound) {
    res.flash(
      "error",
      "Please provide a fob ID OR keycode, and an audio file."
    );
    return res.redirect("/sounds");
  }

  entryCodeExistsInMemberlist({
    logger,
    entryCode: fobid || keycode,
    isKeycode: keycode && !fobid,
  })
    .then((record) => {
      const { memberId } = record;

      const newFile = req.files.sound;

      if (newFile.size > 2104474) {
        res.flash(
          "error",
          "The uploaded file was too large. Keep it under 2MB."
        );
        return res.redirect("/sounds");
      }

      fileTypeFromBuffer(newFile.data).then((data) => {
        if (!data || data.ext !== "wav" || data.mime !== "audio/wav") {
          res.flash(
            "error",
            "The uploaded file isn't a WAV file, despite it looking like one."
          );
          return res.redirect("/sounds");
        }

        if (["audio/x-wav", "audio/wav"].indexOf(newFile.mimetype) === -1) {
          res.flash("error", "The uploaded file isn't a WAV file.");
          return res.redirect("/sounds");
        }

        newFile.mv(`./sounds/custom/${memberId}.wav`, function (err) {
          if (!err) {
            res.flash(
              "success",
              "The audio has been uploaded! You may now try it by scanning in."
            );
            return res.redirect("/sounds");
          }
        });
      });
    })
    .catch((e) => {
      res.flash(
        "error",
        "There was an error verifying your information. Did you enter a correct fob ID or keycode?"
      );
      return res.redirect("/sounds");
    });
});

app.listen(port, () => {
  console.log(`Webserver listening on port ${port}`);
});
