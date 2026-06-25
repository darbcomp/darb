const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Category routes ready",
    data: [],
  });
});

module.exports = router;