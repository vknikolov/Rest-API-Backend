const express = require("express");
const { body } = require("express-validator");

const feedController = require("../controllers/feed");
const isAuthenticated = require("../middleware/is-auth");

const router = express.Router();

// GET /feed/posts
router.get("/posts", isAuthenticated, feedController.getPosts);

// POST /feed/post
router.post(
  "/post",
  isAuthenticated,
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.createPost
);

// POST /feed/post/:postID
router.get("/post/:postID", isAuthenticated, feedController.getPost);

// PUT /feed/post/:postID
router.put(
  "/post/:postID",
  isAuthenticated,
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.editPost
);

// DELETE /feed/post/:postID
router.delete("/post/:postID", isAuthenticated, feedController.deletePost);

module.exports = router;
