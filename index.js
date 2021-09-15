const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const formidableMiddleware = require("express-formidable");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

app.use(helmet());
app.use(formidableMiddleware());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/airbnb-api", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

const userRoutes = require("./routes/user");
const roomsRoutes = require("./routes/room");
const dbRoutes = require("./routes/db");
app.use(userRoutes);
app.use(roomsRoutes);
app.use(dbRoutes);

app.get("/", function (req, res) {
  res.send("Welcome to the Airbnb API.");
});

app.all("*", function (req, res) {
  res.status(404).json({ error: "Page not found" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server has started");
});
