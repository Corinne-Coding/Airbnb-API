const usersId = [
  "58ff73cc1765a998979a3390",
  "58ff73cc1765a998979a338c",
  "58ff73cc1765a998979a338d",
  "58ff73cc1765a998979a338e",
  "58ff73cc1765a998979a338f",
];

const roomsId = [
  "58ff73d11765a998979a3396",
  "58ff73d11765a998979a3397",
  "58ff73d11765a998979a33a0",
  "58ff73cc1765a99897945391",
  "58ff73cc1765a9979391c532",
];

const usersMail = [
  "alice@airbnb-api.com",
  "charles@airbnb-api.com",
  "astrid@airbnb-api.com",
  "robert@airbnb-api.com",
  "charlene@airbnb-api.com",
];

const noModification = async (req, res, next) => {
  const { id } = req.params;
  const { email } = req.fields;

  if (usersId.indexOf(id) !== -1 || usersMail.indexOf(email) !== -1) {
    return res.status(400).json({ error: "This user is not editable" });
  } else if (roomsId.indexOf(id) !== -1) {
    return res.status(400).json({ error: "This room is not editable" });
  } else {
    return next();
  }
};

module.exports = noModification;
