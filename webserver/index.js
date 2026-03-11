import express from "express";
import partials from "express-partials";
import fileUpload from "express-fileupload";
import flash from "express-flash-message";
import session from "express-session";

import adminRouter from "./routes/admin.js";
import screenRouter from "./routes/screen.js";

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

app.use("/admin", adminRouter);
app.use("/screen", screenRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
