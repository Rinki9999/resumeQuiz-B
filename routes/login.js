const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

router.post("/", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt for:", email);
    console.log("Password received:", password);
    if (!email || !password)
      return res.status(400).json({ error: "Both fields required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ error: "Incorrect password" });

    res.json({
      ok: true,
      msg: "Login successful",
      userId: user._id,
      name: user.name,
      email: user.email
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed", errmessage: err});
  }
});

module.exports = router;