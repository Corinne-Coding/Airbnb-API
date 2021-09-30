const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

const Room = require("../models/Room");
const User = require("../models/User");

const isAuthenticated = require("../middlewares/isAuthenticated");
const noModification = require("../middlewares/noModification");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* Get all rooms */
router.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find().populate({
      path: "user",
      select: "account.photo.url",
    });

    res.json(rooms);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* Get rooms around user */
router.get("/rooms/around", async (req, res) => {
  const { longitude, latitude } = req.query;

  try {
    if (longitude && latitude) {
      const rooms = await Room.find({
        location: {
          $near: [latitude, longitude],
          $maxDistance: 0.2,
        },
      });
      res.json(rooms);
    } else {
      const rooms = await Room.find();
      res.json(rooms);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* Get one room */
router.get("/rooms/:id", async (req, res) => {
  const { id } = req.params;
  if (id) {
    try {
      const room = await Room.findById(id).populate({
        path: "user",
        select: "account",
      });
      if (room) {
        res.json(room);
      } else {
        res.json({ message: "Room not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing room id" });
  }
});

module.exports = router;
