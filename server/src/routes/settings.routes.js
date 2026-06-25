const express = require("express");

const router = express.Router();

router.get("/public", (req, res) => {
  res.json({
    success: true,
    message: "Public store settings ready",
    data: {
      storeName: "Darb",
      currency: "EGP",
      categories: ["Men", "Women", "Unisex", "Musk"],
    },
  });
});

module.exports = router;