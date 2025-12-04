// Libraries
const { validationResult } = require("express-validator");
// Socket IO
const { getIO } = require("../socket");

// Models
const Post = require("../models/post");
const User = require("../models/user");
// Helpers
const { status500, errorMessageAndStatus } = require("../helpers/errors");
const { clearImage } = require("../helpers/helpers.js");
const { get } = require("mongoose");

// GET POSTS ------------------------------------------
exports.getPosts = async (request, response, next) => {
  const CURRENT_PAGE = request.query.page || 1;
  const PER_PAGE = 2;
  try {
    const totalItems = await Post.find().countDocuments();

    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 }) // latest post first
      .skip((CURRENT_PAGE - 1) * PER_PAGE)
      .limit(PER_PAGE);

    if (!posts) {
      throw errorMessageAndStatus("Could not fetch posts.", 500);
    }

    response.status(200).json({
      message: "Fetched posts successfully",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (error) {
    status500(error, next);
  }
};

// CREATE POST ------------------------------------------
exports.createPost = async (request, response, next) => {
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
  try {
    await post.save();
    const user = await User.findById(request.userId);
    // Create relationship between user and post
    if (!user) {
      throw errorMessageAndStatus("Could not find user.", 404);
    }
    creator = user;
    user.posts.push(post);
    const createdUser = await user.save();
    if (!createdUser) {
      throw errorMessageAndStatus("Could not update user posts.", 500);
    }
    getIO().emit("posts", {
      action: "create",
      post: {
        ...post._doc,
        creator: { _id: request.userId, name: creator.name },
      },
    });
    // Respond with created post data
    response.status(201).json({
      message: "Post created successfully!",
      post: post,
      creator: {
        _id: creator._id,
        name: creator.name,
      },
    });
  } catch (error) {
    status500(error, next);
  }
};

// GET POST ------------------------------------------
exports.getPost = async (request, response, next) => {
  const postID = request.params.postID;
  try {
    const post = await Post.findById(postID);
    if (!post) {
      throw errorMessageAndStatus("Could not find post.", 404);
    }
    response.status(200).json({ message: "Post fetched", post: post });
  } catch (error) {
    status500(error, next);
  }
};

// EDIT POST ------------------------------------------
exports.editPost = async (request, response, next) => {
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

  try {
    const post = await Post.findById(postID).populate("creator");
    if (!post) {
      throw errorMessageAndStatus("Could not find post.", 404);
    }
    // Check login user to be the creator of the post and only then allow edit
    if (post.creator._id.toString() !== request.userId) {
      throw errorMessageAndStatus("Not authorized", 403);
    }

    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const updatedPost = await post.save();
    if (!updatedPost) {
      throw errorMessageAndStatus("Could not update post.", 500);
    }
    getIO().emit("posts", {
      action: "update",
      post: updatedPost,
    });
    response.status(200).json({ message: "Post updated!", post: updatedPost });
  } catch (error) {
    status500(error, next);
  }
};

// DELETE POST ------------------------------------------
exports.deletePost = async (request, response, next) => {
  const postID = request.params.postID;
  try {
    const post = await Post.findById(postID);
    if (!post) {
      throw errorMessageAndStatus("Could not find post.", 404);
    }
    // Check login user to be the creator of the post and only then allow edit
    if (post.creator.toString() !== request.userId) {
      throw errorMessageAndStatus("Not authorized", 403);
    }
    // Check login user
    clearImage(post.imageUrl);
    await Post.findByIdAndDelete(postID);
    const user = await User.findById(request.userId);
    // Clean up user's posts array relationship
    user.posts.pull(postID);
    const result = await user.save();
    if (!result) {
      throw errorMessageAndStatus("Could not update user posts.", 500);
    }
    getIO().emit("posts", { action: "delete", postID: postID });
    response.status(200).json({ message: "Post deleted!" });
  } catch (error) {
    status500(error, next);
  }
};
