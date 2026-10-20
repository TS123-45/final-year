const express = require("express");
const router = express.Router();
const { pool } = require("../config/db.js");

router.get("/", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({
        message: "Database connection failed",
        error: err.message,
      });
    }

    connection.release();

    return res.status(200).json({
      message: "Database connected successfully!",
    });
  });
});

module.exports = router;
 