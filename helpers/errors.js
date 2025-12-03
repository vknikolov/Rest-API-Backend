// Sets error status to 500 if not already set and passes it to the callback
// Used in catch blocks to handle unexpected errors
exports.status500 = (error, cb) => {
  if (!error.statusCode) {
    error.statusCode = 500;
  }
  cb(error);
};

// Creates a custom error with a message and status code
// Can be used with throw inside promises or with return next() outside promises
exports.errorMessageAndStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};
