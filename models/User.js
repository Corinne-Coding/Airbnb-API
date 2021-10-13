const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: { type: String, required: true, unique: true },
  token: String,
  hash: String,
  salt: String,
  updatePasswordToken: { type: String, default: null },
  updatePasswordExpiredAt: { type: Number, default: null },
  account: {
    username: { type: String, required: true, unique: true },
    name: String,
    description: String,
    photo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  rooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
  ],
});

module.exports = User;
