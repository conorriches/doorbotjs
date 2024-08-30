import config from "config";
import fs from "fs";
import { parse } from "csv-parse";

export const getEntity = (req, res, next) => {
  const entity = config.get("server.entities").filter((entity) => {
    return entity.id === req.params.entityId;
  })[0];

  if (entity) {
    req.entity = entity;
    return next();
  }

  return res.status(400).json({ success: false, message: "Unknown entity" });
};

export const ensureAuthenticated = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({
      success: false,
      message: "Provide api key as Authorization header",
    });
  }

  if (!req.entity) {
    return res.status(500).json({
      success: false,
      message: "Entity not provided to authentication middleware",
    });
  }

  if (req.entity.apiKey !== req.headers.authorization) {
    return res.status(401).json({ success: false, message: "Invalid api key" });
  }

  next();
};

export const ensureEntityPermission = (req, res, next) => {
  if (!req.entity) {
    return res.status(500).json({
      success: false,
      message: "Entity not provided to permission middleware",
    });
  }

  const userlistName = req.entity.userlist;
  const userlistLocation = config.get("server.userlists").filter((userlist) => {
    return userlist.id === userlistName;
  })[0];

  if (!userlistLocation) {
    return res
      .status(500)
      .json({ success: false, message: "Invalid userlist name specified" });
  }

  fs.readFile(
    `./userlists/${userlistLocation.userlist}`,
    "utf8",
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Couldn't open userlist" });
      }

      parse(data, function (err, records) {
        if (err) {
          return res
            .status(500)
            .json({ success: false, message: "Couldn't parse data" });
        }

        let user = false;
        records.forEach((record) => {
          // Note! memberId could be null as this may not be implemented immediately!
          const [memberCodeId, announceName, memberId] = record;
          if (memberCodeId === req.params.accessCode) {
            user = {
              announceName,
              memberId,
            };
            return;
          }
        });

        req.user = user;
        req.verified = !!user;
        next();
      });
    },
  );
};
