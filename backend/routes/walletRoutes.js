const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Save Wallet Address
router.post("/save-wallet", async (req, res) => {
  const { username, wallet } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { username },
      { wallet },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Wallet updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
