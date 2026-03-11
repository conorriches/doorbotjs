import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
//import entranceSound from "../../sounds/metrolink.wav"; //TODO, rename to entrance.wav

const router = express.Router();

router.use(bodyParser.raw({ type: "audio/wav", limit: "50mb" }));

router.use(express.static("../../sounds"));

router.use((req, res, next) => {
  res.locals.layout = "layout_screen";
  next();
});

router.get("/audio/entrance.wav", (req, res) => {
  res.set("Content-Disposition", "inline;filename=metrolink.wav");
  res.set("Content-Type", "application/octet-stream");
  const stat = fs.statSync("sounds/metrolink.wav");

  res.set("Content-Length", stat.size);
  res.set("Accept-Ranges", "bytes");

  var readStream = fs.createReadStream("sounds/metrolink.wav");
  readStream.pipe(res);
});

router.get("/:id", (req, res) => {
  res.render(`screen/${req.params.id}`, {
    ...req.locals,
    username: req.query.u,
    layout: "layout_screen",
  });
});

export default router;
