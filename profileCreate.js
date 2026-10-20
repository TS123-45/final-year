const express = require("express");
const { queryDatabase } = require("../config/db.js");
// const {authMiddleware,buyer,manufacturer } = require("../middleware/auth_mw.js");

const router = express.Router();

// Create a buyer profile (POST /account/buyerProfile)
router.post("/buyerProfile", async (req, res) => {
  try {
    const {
      user_id,
      full_name,
      profile_image_url,
      phone_number,
      date_of_birth,
      gender,
      preferred_language,
    } = req.body;

    // 1. Validate required fields
    if (!user_id || !full_name || !full_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "user_id and full_name are required.",
      });
    }

    // 2. Validate user_id
    if (!Number.isSafeInteger(Number(user_id)) || Number(user_id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "user_id must be a valid positive integer.",
      });
    }

    // 3. Insert the buyer profile
    const sql = `
      INSERT INTO buyer_profiles (
        user_id,
        full_name,
        profile_image_url,
        phone_number,
        date_of_birth,
        gender,
        preferred_language
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      Number(user_id),
      full_name.trim(),
      profile_image_url || null,
      phone_number || null,
      date_of_birth || null,
      gender || null,
      preferred_language || null,
    ];

    const result = await queryDatabase(sql, values);

    // 4. Send success response
    return res.status(201).json({
      success: true,
      message: "Buyer profile created successfully.",
      buyer_id: result.insertId,
    });
  } catch (error) {
    console.error("Create buyer profile error:", error);

    // Duplicate user_id: UNIQUE constraint violation
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A buyer profile already exists for this user.",
      });
    }

    // user_id does not exist in the users table
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "The specified user_id does not exist.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
    });
  }
});

// create manufacturer profile (/account/manufacturerProfile)
router.post("/manufacturerProfile" /* , authMiddleware */, async (req, res) => {
  //write code to create manufacturer profile
});

module.exports = router;

// we will do role based access control for the above routes in the future.
