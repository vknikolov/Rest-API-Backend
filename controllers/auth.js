// Libraries
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");

// Models
const User = require("../models/user");

// Helpers
const { status500, errorMessageAndStatus } = require("../helpers/errors");

// SIGNUP ------------------------------------------
exports.signup = (request, response, next) => {
  const errors = validationResult(request);

  if (!errors.isEmpty()) {
    return next(errorMessageAndStatus("Validation failed.", 422));
  }

  const email = request.body.email;
  const name = request.body.name;
  const password = request.body.password;
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        name: name,
      });
      return user.save();
    })
    .then((result) => {
      response.status(201).json({ message: "User crated", userId: result._id });
    })
    .catch((error) => {
      if (!error.statusCode) {
        status500(error, next);
      }
    });
};

// LOGIN ------------------------------------------
exports.login = (request, response, next) => {
  const email = request.body.email;
  const password = request.body.password;
  let loadedUser;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        throw errorMessageAndStatus("User with this email is not found!.", 401);
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        throw errorMessageAndStatus("Wrong password.", 401);
      }
      const token = JWT.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        "somesupersecretsecret",
        { expiresIn: "1h" }
      );
      response
        .status(200)
        .json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch((error) => {
      if (!error.statusCode) {
        status500(error, next);
      }
    });
};

// GET STATUS ------------------------------------------
exports.getUserStatus = (request, response, next) => {
  User.findById(request.userId)
    .then((user) => {
      if (!user) {
        throw errorMessageAndStatus("User not found.", 404);
      }
      response.status(200).json({ status: user.status });
    })
    .catch((error) => {
      status500(error, next);
    });
};

// UPDATE STATUS ------------------------------------------
exports.updateUserStatus = (request, response, next) => {
  const newStatus = request.body.status;

  User.findById(request.userId)
    .then((user) => {
      if (!user) {
        throw errorMessageAndStatus("User not found.", 404);
      }
      user.status = newStatus;
      return user.save();
    })
    .then((result) => {
      response
        .status(200)
        .json({ message: "User status updated.", user: result });
    })
    .catch((error) => {
      status500(error, next);
    });
};
