// Libraries
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");

// Models
const User = require("../models/user");

// Helpers
const { status500, errorMessageAndStatus } = require("../helpers/errors");

// SIGNUP ------------------------------------------
exports.signup = async (request, response, next) => {
  const errors = validationResult(request);

  if (!errors.isEmpty()) {
    return next(errorMessageAndStatus("Validation failed.", 422));
  }

  const email = request.body.email;
  const name = request.body.name;
  const password = request.body.password;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      password: hashedPassword,
      name: name,
    });
    const result = await user.save();
    if (!result) {
      throw errorMessageAndStatus("User creation failed.", 500);
    }
    response.status(201).json({ message: "User crated", userId: result._id });
  } catch (error) {
    if (!error.statusCode) {
      status500(error, next);
    }
  }
};

// LOGIN ------------------------------------------
exports.login = async (request, response, next) => {
  const email = request.body.email;
  const password = request.body.password;
  let loadedUser;
  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      throw errorMessageAndStatus("User with this email is not found!.", 401);
    }

    loadedUser = user;

    const isEqual = await bcrypt.compare(password, user.password);

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
    if (!token) {
      throw errorMessageAndStatus("Could not create token.", 500);
    }
    response
      .status(200)
      .json({ token: token, userId: loadedUser._id.toString() });
  } catch (error) {
    if (!error.statusCode) {
      status500(error, next);
    }
  }
};

// GET STATUS ------------------------------------------
exports.getUserStatus = async (request, response, next) => {
  try {
    const user = await User.findById(request.userId);
    if (!user) {
      throw errorMessageAndStatus("User not found.", 404);
    }
    response.status(200).json({ status: user.status });
  } catch (error) {
    status500(error, next);
  }
};

// UPDATE STATUS ------------------------------------------
exports.updateUserStatus = async (request, response, next) => {
  const newStatus = request.body.status;
  try {
    const user = await User.findById(request.userId);
    if (!user) {
      throw errorMessageAndStatus("User not found.", 404);
    }
    user.status = newStatus;
    const result = await user.save();
    if (!result) {
      throw errorMessageAndStatus("Could not update status.", 500);
    }

    response
      .status(200)
      .json({ message: "User status updated.", user: result });
  } catch (error) {
    status500(error, next);
  }
};
