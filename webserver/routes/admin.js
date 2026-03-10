import express from "express";
import { fileTypeFromBuffer } from "file-type";
import pm2 from "pm2";

import Logger from "../../src/logger.js";
import { entryCodeExistsInMemberlist } from "../../helpers/memberList.js";

const router = express.Router();

const logger = new Logger({ process: "webserver" });

router.use((req, res, next) => {
  res.locals.layout = "layout_admin";
  next();
});

router.get("/", (req, res) => {
  res.locals = {
    ...res.locals,
    menu: "home",
    title: "Home",
    message: "Hello there!",
  };

  req.layout = "admninnnn";

  res.render("admin/index", res.locals);
});

router.get("/admin", (req, res) => {
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

      req.layout = "admin";
      res.locals = {
        ...res.locals,
        menu: "admin",
        connected,
        accessRunning,
        hasError,
      };
      res.render("admin/admin", res.locals);
    });
  });
});

router.get("/sounds", (req, res) => {
  res.locals = {
    ...res.locals,
    menu: "sounds",
    title: "Home",
    message: "Hello there!",
  };

  res.render("admin/sounds", res.locals);
});

router.post("/sounds", (req, res) => {
  const { fobid, keycode } = req.body;
  const sound = req?.files?.sound;

  if ((!fobid && !keycode) || !sound) {
    res.flash(
      "error",
      "Please provide a fob ID OR keycode, and an audio file."
    );
    return res.redirect("/admin/sounds");
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
        return res.redirect("/admin/sounds");
      }

      fileTypeFromBuffer(newFile.data).then((data) => {
        if (!data || data.ext !== "wav" || data.mime !== "audio/wav") {
          res.flash(
            "error",
            "The uploaded file isn't a WAV file, despite it looking like one."
          );
          return res.redirect("/admin/sounds");
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
            return res.redirect("/admin/sounds");
          }
        });
      });
    })
    .catch((e) => {
      res.flash(
        "error",
        "There was an error verifying your information. Did you enter a correct fob ID or keycode?"
      );
      return res.redirect("/admin/sounds");
    });
});

export default router;
