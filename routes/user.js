const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;
const nodemailer = require("nodemailer");

const User = require("../models/User");
const Room = require("../models/Room");

const isAuthenticated = require("../middlewares/isAuthenticated");
const noModification = require("../middlewares/noModification");

// Functions
const validateEmailFormat = require("../utils/validateEmailFormat");
const cleanEmail = require("../utils/cleanEmail");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* User signup */
router.post("/user/sign_up", async (req, res) => {
  const { username, password, name, description } = req.fields;
  let { email } = req.fields;
  try {
    if (email && username && password && name && description) {
      const boolean = validateEmailFormat(email);
      if (boolean) {
        email = cleanEmail(email);
        const foundEmail = await User.findOne({ email: email });
        const foundUsername = await User.findOne({
          "account.username": username,
        });
        if (!foundEmail && !foundUsername) {
          const token = uid2(64);
          const salt = uid2(64);
          const hash = SHA256(password + salt).toString(encBase64);

          const newUser = new User({
            email: email,
            token: token,
            salt: salt,
            hash: hash,
            account: {
              username,
              description,
              name,
            },
          });

          await newUser.save();
          res.json({
            _id: newUser._id,
            token: newUser.token,
            email: newUser.email,
            account: {
              username: newUser.account.username,
              description: newUser.account.description,
              name: newUser.account.name,
              photo: newUser.account.photo,
            },
          });
        } else if (foundEmail) {
          res.status(400).json({ error: "This email already has an account." });
        } else if (foundUsername) {
          res
            .status(400)
            .json({ error: "This username already has an account." });
        }
      } else {
        res.status(400).json({ error: "Wrong email format" });
      }
    } else {
      res.status(400).json({ error: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* User login */
router.post("/user/log_in", async (req, res) => {
  const { password } = req.fields;
  let { email } = req.fields;

  if (password && email) {
    email = cleanEmail(email);
    const user = await User.findOne({
      email: email,
    });
    if (user) {
      if (SHA256(password + user.salt).toString(encBase64) === user.hash) {
        res.json({
          _id: user._id,
          token: user.token,
          email: user.email,
          account: {
            username: user.account.username,
            description: user.account.description,
            name: user.account.name,
          },
        });
      } else {
        res.status(401).json({ error: "Unauthorized" });
      }
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  } else {
    res.status(400).json({ error: "Missing parameters" });
  }
});

/* Get one user */
router.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  if (id) {
    try {
      const user = await User.findById(id);
      if (user) {
        res.json({
          _id: user._id,
          account: user.account,
          rooms: user.rooms,
        });
      } else {
        res.status(400).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing id" });
  }
});

/* Update user (username, name, description, picture) */
router.put(
  "/user/update/:id",
  [noModification, isAuthenticated],

  async (req, res) => {
    const { description, username, name } = req.fields;
    const { picture } = req.files;
    const { id } = req.params;

    try {
      if (id) {
        if (description || username || name || picture) {
          if (username && username !== req.user.account.username) {
            // check if username is already in DB
            const foundUsername = await User.findOne({
              "account.username": username,
            });
            if (foundUsername) {
              return res
                .status(400)
                .json({ message: "This username is already used." });
            }
          }

          const userToModify = await User.findById(id);

          if (description || username || name) {
            // update description / username / name
            description && (userToModify.account.description = description);
            username && (userToModify.account.username = username);
            name && (userToModify.account.name = name);
          }

          if (picture) {
            // update picture

            let option = {};
            // setup option for Cloudinary request
            if (!userToModify.account.photo.url) {
              option = {
                folder: `airbnb/users/${id}`,
              };
            } else {
              option = { public_id: userToModify.account.photo.picture_id };
            }

            // upload picture on Cloudinary
            await cloudinary.uploader.upload(
              picture.path,
              option,
              async function (error, result) {
                if (!error) {
                  const extension = result.secure_url.lastIndexOf(".");
                  userToModify.account.photo.url = result.secure_url.slice(
                    0,
                    extension
                  );
                  userToModify.account.photo.picture_id = result.public_id;
                } else {
                  res.status(400).json({ error: error });
                }
              }
            );
          }

          const updatedUser = await userToModify.save();

          res.json({
            account: updatedUser.account,
            email: updatedUser.email,
            _id: updatedUser._id,
          });
        } else {
          res.status(400).json({ error: "Missing parameter(s)" });
        }
      } else {
        res.status(400).json({ error: "Missing user id" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/* User delete picture */
// router.put(
//   "/user/delete_picture/:id",
//   [noModification, isAuthenticated],
//   async (req, res) => {
//     if (req.params.id) {
//       try {
//         const user = await User.findById(req.params.id);

//         if (user) {
//           if (String(user._id) === String(req.user._id)) {
//             if (user.account.photo) {
//               await cloudinary.uploader.destroy(user.account.photo.picture_id);

//               await User.findByIdAndUpdate(req.params.id, {
//                 "account.photo": null,
//               });

//               const userUpdated = await User.findById(req.params.id);
//               res.json({
//                 account: userUpdated.account,
//                 _id: userUpdated._id,
//                 email: userUpdated.email,
//                 rooms: userUpdated.rooms,
//               });
//             } else {
//               res.status(400).json({ message: "No photo found" });
//             }
//           } else {
//             res.status(401).json({ error: "Unauthorized" });
//           }
//         } else {
//           res.status(400).json({ error: "User not found" });
//         }
//       } catch (error) {
//         res.status(400).json({ error: error.message });
//       }
//     } else {
//       // si l'id de l'utilisateur n'a pas été envoyé
//       res.status(400).json({ error: "Missing user id" });
//     }
//   }
// );

/* Update user password */
// router.put(
//   "/user/update_password",
//   [noModification, isAuthenticated],
//   async (req, res) => {
//     if (req.fields.previousPassword && req.fields.newPassword) {
//       try {
//         const user = req.user;

//         if (
//           SHA256(req.fields.previousPassword + user.salt).toString(
//             encBase64
//           ) === user.hash
//         ) {
//           if (
//             SHA256(req.fields.previousPassword + user.salt).toString(
//               encBase64
//             ) !== SHA256(req.fields.newPassword + user.salt).toString(encBase64)
//           ) {
//             const salt = uid2(64);
//             const hash = SHA256(req.fields.newPassword + salt).toString(
//               encBase64
//             );
//             const token = uid2(64);

//             user.salt = salt;
//             user.hash = hash;
//             user.token = token;
//             await user.save();

//             confound = user.email;

//             const mg = mailgun({
//               apiKey: MAILGUN_API_KEY,
//               domain: MAILGUN_DOMAIN,
//             });

//             const data = {
//               from: "Airbnb API <postmaster@" + MAILGUN_DOMAIN + ">",
//               to: userEmail,
//               subject: "Airbnb - password",
//               text: `Your password have been successfully modified.`,
//             };

//             mg.messages().send(data, function (error, body) {
//               if (error) {
//                 res.status(400).json({ error: "An error occurred" });
//               } else {
//                 res.json({
//                   _id: user._id,
//                   token: user.token,
//                   email: user.email,
//                   account: user.account,
//                   rooms: user.rooms,
//                 });
//               }
//             });
//           } else {
//             res.status(400).json({
//               error: "Previous password and new password must be different",
//             });
//           }
//         } else {
//           res.status(400).json({ error: "Wrong previous password" });
//         }
//       } catch (error) {
//         res.status(400).json({ error: error.message });
//       }
//     } else {
//       return res.status(400).json({ message: "Missing parameters" });
//     }
//   }
// );

/* Send link to modify password (when user is not authenticated) */
// router.put("/user/recover_password", noModification, async (req, res) => {
//   let { email } = req.fields;
//   if (email) {
//     try {
//       email = cleanEmail(email);
//       console.log(email);
//       const user = await User.findOne({ email: email });

//       if (user) {
//         const update_password_token = uid2(64);
//         user.updatePasswordToken = update_password_token;

//         const update_password_expiredAt = Date.now();
//         user.updatePasswordExpiredAt = update_password_expiredAt;

//         await user.save();

//         let transporter = nodemailer.createTransport({
//           host: "smtp.outlook.com",
//           auth: {
//             user: process.env.NODEMAILER_USER,
//             pass: process.env.NODEMAILER_PASSWORD,
//           },
//         });

//         let mailOptions = {
//           from: `Airbnb Clone 🏠 <${process.env.NODEMAILER_USER}>`,
//           to: email,
//           subject: "Modify your password on Airbnb clone - by Corinne Pradier",
//           text: `Please, click on the following link to modify your password : https://airbnb/change_password?token=${update_password_token}. You have 15 minutes to modify your password.`,
//         };

//         transporter.sendMail(mailOptions, (error, info) => {
//           if (error) {
//             res.status(400).json({ error: "An error occurred" });
//           } else {
//             res.json({ message: "Mail successfully sent" });
//           }
//         });
//       } else {
//         return res
//           .status(400)
//           .json({ message: "This email does not exist in DB" });
//       }
//     } catch (error) {
//       res.status(400).json({ error: error.message });
//     }
//   } else {
//     return res.status(400).json({ message: "Missing email" });
//   }
// });

/* User reset password */
// router.put("/user/reset_password", noModification, async (req, res) => {
//   if (req.fields.passwordToken && req.fields.password) {
//     try {
//       const user = await User.findOne({
//         updatePasswordToken: req.fields.passwordToken,
//       });

//       if (user) {
//         const date = Date.now();

//         console.log(date);

//         const difference = date - user.updatePasswordExpiredAt;
//         console.log(difference);

//         let isExpired;
//         if (difference < 900000) {
//           isExpired = false;
//         } else {
//           isExpired = true;
//         }

//         if (!isExpired) {
//           const salt = uid2(64);
//           const hash = SHA256(req.fields.password + salt).toString(encBase64);
//           const token = uid2(64);

//           user.salt = salt;
//           user.hash = hash;
//           user.token = token;
//           user.updatePasswordToken = null;
//           user.updatePasswordExpiredAt = null;

//           await user.save();
//           res.json({
//             _id: user._id,
//             token: user.token,
//             email: user.email,
//           });
//         } else {
//           return res.status(400).json({ message: "Time expired" });
//         }
//       } else {
//         res.status(400).json({ error: "User not found" });
//       }
//     } catch (error) {
//       res.status(400).json({ error: error.message });
//     }
//   } else {
//     return res.status(400).json({ message: "Missing parameters" });
//   }
// });

/* Delete user */
// router.delete(
//   "/user/delete",
//   [noModification, isAuthenticated],
//   async (req, res) => {
//     try {
//       const user = req.user;

//       const rooms = await Room.find({ user: user._id });

//       for (let i = 0; i < rooms.length; i++) {
//         await Room.findByIdAndRemove(rooms[i]._id);
//       }

//       await User.findByIdAndRemove(user._id);

//       res.status(200).json({ message: "User deleted" });
//     } catch (error) {
//       res.status(400).json({ error: error.message });
//     }
//   }
// );

/* Get rooms of one user */
// router.get("/user/rooms/:id", async (req, res) => {
//   if (req.params.id) {
//     try {
//       const user = await User.findById(req.params.id);
//       if (user) {
//         const userRooms = user.rooms;

//         if (userRooms.length > 0) {
//           let tab = [];

//           for (let i = 0; i < userRooms.length; i++) {
//             const room = await Room.findById(userRooms[i]);

//             tab.push(room);
//           }

//           res.json(tab);
//         } else {
//           res.status(200).json({ message: "This user has no room" });
//         }
//       } else {
//         res.json({ message: "User not found" });
//       }
//     } catch (error) {
//       res.status(400).json({ error: error.message });
//     }
//   } else {
//     res.status(400).json({ error: "Missing id" });
//   }
// });

module.exports = router;
