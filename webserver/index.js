import express from "express";
import partials from "express-partials";
import fileUpload from "express-fileupload";
import flash from "express-flash-message";
import session from "express-session";
import { fileTypeFromBuffer } from "file-type";
import pm2 from "pm2";

import Logger from "../src/logger.js";
import { entryCodeExistsInMemberlist } from "../helpers/memberList.js";
const port = 3000;
const app = express();

app.set("views", "webserver/views/");
app.set("view engine", "ejs");

app.use(express.static("webserver/public"));
app.use(partials());
app.use(express.json());
app.use(express.urlencoded());
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

app.get("/admin", (req, res) => {
  let accessRunning = false;
  let connected = false;
  let hasError = false;

  pm2.connect(function (err) {
    if (err) {
      console.error(err);
      process.exit(2);
    }

    connected = true;

    pm2.describe("access", function (err, processes) {
      accessRunning =
        processes[0].pm2_env.status === "online" &&
        Date.now() - processes[0].pm2_env.pm_uptime > 10000;

      const locals = {
        menu: "admin",
        connected,
        accessRunning,
        hasError,
      };
      res.render("admin", locals);
    });
  });
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
  console.log(`Example app listening on port ${port}`);
});
