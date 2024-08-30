/**
 * SERVER.js runs a sever only exposing an API
 *
 * Take a look at the README for information on how this file works and is used.
 * Userlists will need to be updated outside of this file.
 * It relies upon userlists under `/userlists`
 *
 * Written by Conor, 2024. License in package.json.
 */
import express from "express";
import apiRouter from "./server/api.js"

const server = express();

// For the robots
server.use("/api", apiRouter);

// For the humans
server.get("/", (req, res) => {
  res.send('Hello World! The api is at <a href="/api">/api</a>');
});

server.listen(3000, () => console.log("The server is listening on port 3000!"));
