const validateEmailFormat = (email) => {
  // email format must be : anything@anything.anything
  const regex = new RegExp("\\S+@\\S+\\.\\S+");
  return regex.test(email);
};

module.exports = validateEmailFormat;
