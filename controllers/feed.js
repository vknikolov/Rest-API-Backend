// Libraries
const { validationResult } = require("express-validator");
// Models
const Post = require("../models/post");
const User = require("../models/user");
// Helpers
const { status500, errorMessageAndStatus } = require("../helpers/errors");
const { clearImage } = require("../helpers/helpers.js");

// GET POSTS ------------------------------------------
exports.getPosts = (request, response, next) => {
  const CURRENT_PAGE = request.query.page || 1;
  const PER_PAGE = 2;
  let totalItems;

  Post.find()
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Post.find()
        .skip((CURRENT_PAGE - 1) * PER_PAGE)
        .limit(PER_PAGE);
    })
    .then((posts) => {
      response.status(200).json({
        message: "Fetched posts successfully",
        posts: posts,
        totalItems: totalItems,
      });
    })
    .catch((error) => {
      status500(error, next);
    });
};

// CREATE POST ------------------------------------------
exports.createPost = (request, response, next) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return next(
      errorMessageAndStatus(
        "Validation failed, entered data is incorrect.",
        422
      )
    );
  }

  if (!request.file) {
    return next(errorMessageAndStatus("No image provided", 422));
  }

  const imageUrl = request.file.path;
  const title = request.body.title;
  const content = request.body.content;
  let creator;

  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: request.userId,
  });
  post
    .save()
    .then(() => {
      return User.findById(request.userId);
    })
    .then((user) => {
      // Create relationship between user and post
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then(() => {
      // Respond with created post data
      response.status(201).json({
        message: "Post created successfully!",
        post: post,
        creator: {
          _id: creator._id,
          name: creator.name,
        },
      });
    })
    .catch((error) => {
      status500(error, next);
    });
};

// GET POST ------------------------------------------
exports.getPost = (request, response, next) => {
  const postID = request.params.postID;
  Post.findById(postID)
    .then((post) => {
      if (!post) {
        throw errorMessageAndStatus("Could not find post.", 404);
      }
      response.status(200).json({ message: "Post fetched", post: post });
    })
    .catch((error) => {
      status500(error, next);
    });
};

// EDIT POST ------------------------------------------
exports.editPost = (request, response, next) => {
  const postID = request.params.postID;

  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return next(
      errorMessageAndStatus(
        "Validation failed, entered data is incorrect.",
        422
      )
    );
  }

  // On edit the user is not required to change the image!!
  // if (!request.file) {
  //   return next(errorMessageAndStatus("No image provided", 422));
  // }

  const title = request.body.title;
  const content = request.body.content;
  let imageUrl = request.body.image;

  if (request.file) {
    imageUrl = request.file.path;
  }

  if (!imageUrl) {
    return next(errorMessageAndStatus("No file picked.", 422));
  }

  Post.findById(postID)
    .then((post) => {
      if (!post) {
        throw errorMessageAndStatus("Could not find post.", 404);
      }
      // Check login user to be the creator of the post and only then allow edit
      if (post.creator.toString() !== request.userId) {
        throw errorMessageAndStatus("Not authorized", 403);
      }

      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }

      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then((post) => {
      return response
        .status(200)
        .json({ message: "Post updated!", post: post });
    })
    .catch((error) => {
      status500(error, next);
    });
};

// DELETE POST ------------------------------------------
exports.deletePost = (request, response, next) => {
  const postID = request.params.postID;
  Post.findById(postID)
    .then((post) => {
      if (!post) {
        throw errorMessageAndStatus("Could not find post.", 404);
      }
      // Check login user to be the creator of the post and only then allow edit
      if (post.creator.toString() !== request.userId) {
        throw errorMessageAndStatus("Not authorized", 403);
      }
      // Check login user
      clearImage(post.imageUrl);
      return Post.findByIdAndDelete(postID);
    })
    .then(() => {
      return User.findById(request.userId);
    })
    .then((user) => {
      // Clean up user's posts array relationship
      user.posts.pull(postID);
      return user.save();
    })
    .then(() => {
      return response.status(200).json({ message: "Post deleted!" });
    })
    .catch((error) => {
      status500(error, next);
    });
};
