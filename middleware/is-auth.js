// Libraries
const JWT = require("jsonwebtoken");

// Helpers
const { status500, errorMessageAndStatus } = require("../helpers/errors");

// PROTECTED ROUTES / AUTHORIZATION ------------------------------------------
module.exports = (request, response, next) => {
  const authHeader = request.get("Authorization");
  if (!authHeader) {
    return next(errorMessageAndStatus("Not authenticated.", 401));
  }
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = JWT.verify(token, "somesupersecretsecret");
  } catch (error) {
    status500(error, next);
  }

  if (!decodedToken) {
    return next(errorMessageAndStatus("Not authenticated.", 401));
  }

  request.userId = decodedToken.userId;
  next();
};
