import express from "express";
import config from "config";
import {
  ensureAuthenticated,
  ensureEntityPermission,
  getEntity,
} from "./middlewares.js";

const apiRouter = express.Router();

apiRouter.get("/", (req, res) => {
  res.json({ message: "Hello World!", api: true, working: "likely" });
});

apiRouter.get("/entity", (req, res, next) => {
  return res.json({
    entities: config.get("server.entities").map((entity) => ({
      id: entity.id,
    })),
  });
});

apiRouter.get("/entity/:entityId", getEntity, (req, res, next) => {
  return res.json({
    success: !!req.entity,
    id: req.entity.id,
    userlist: req.entity.userlist,
  });
});

apiRouter.get(
  "/entity/:entityId/verify/:accessCode",
  [getEntity, ensureAuthenticated, ensureEntityPermission],
  (req, res, next) => {
    return res.json({ success: true, verified: req.verified, user: req.user });
  },
);

export default apiRouter;
