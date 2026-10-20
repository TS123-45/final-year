const express = require("express");
const { queryDatabase } = require("../config/db.js");
// const { authMiddleware, buyer, manufacturer } = require("../middleware/auth_mw.js");

const router = express.Router();

// Create a rental request (POST /rental/requests)
router.post("/requests", async (req, res) => {
  try {
    const {
      buyer_id,
      manufacturer_id,
      listing_id,
      full_name,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      phone,
      email,
      government_id_type,
      government_id_file_key,
      rental_start_date,
      rental_end_date,
    } = req.body;

    // Step 1: Validate required fields
    const requiredFields = {
      buyer_id,
      manufacturer_id,
      listing_id,
      full_name,
      address_line1,
      city,
      state,
      postal_code,
      country,
      phone,
      email,
      government_id_type,
      government_id_file_key,
      rental_start_date,
      rental_end_date,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(
        ([key, value]) =>
          value === undefined ||
          value === null ||
          (typeof value === "string" && !value.trim()),
      )
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
        missing_fields: missingFields,
      });
    }

    // Step 2: Validate IDs
    if (
      !Number.isSafeInteger(Number(buyer_id)) ||
      Number(buyer_id) <= 0 ||
      !Number.isSafeInteger(Number(manufacturer_id)) ||
      Number(manufacturer_id) <= 0 ||
      !Number.isSafeInteger(Number(listing_id)) ||
      Number(listing_id) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid buyer_id, manufacturer_id, or listing_id.",
      });
    }

    // Step 3: Validate email and phone
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (!/^[+]?[\d\s()-]{7,20}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid phone number.",
      });
    }

    // Step 4: Validate rental dates (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    const isValidDate = (date) => {
      if (!datePattern.test(date)) return false;

      const parsed = new Date(`${date}T00:00:00Z`);

      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date
      );
    };

    if (
      !isValidDate(rental_start_date) ||
      !isValidDate(rental_end_date) ||
      rental_end_date <= rental_start_date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide valid dates in YYYY-MM-DD format. The rental end date must be after the start date.",
      });
    }

    // Step 5: Insert the rental request
    const result = await queryDatabase(
      `INSERT INTO rental_requests (
        buyer_id,
        manufacturer_id,
        listing_id,
        full_name,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        phone,
        email,
        government_id_type,
        government_id_file_key,
        rental_start_date,
        rental_end_date
      ) VALUES (?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        buyer_id,
        manufacturer_id,
        listing_id,
        full_name.trim(),
        address_line1.trim(),
        address_line2?.trim() || null,
        city.trim(),
        state.trim(),
        postal_code.trim(),
        country.trim(),
        phone.trim(),
        email.trim(),
        government_id_type.trim(),
        government_id_file_key.trim(),
        rental_start_date,
        rental_end_date,
      ],
    );

    // Step 6: Return success
    return res.status(201).json({
      success: true,
      message: "Rental request created successfully.",
      rental_request_id: result.insertId,
    });
  } catch (error) {
    console.error("Create rental request error:", error);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "The specified buyer does not exist.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the rental request.",
    });
  }
});

module.exports = router;
