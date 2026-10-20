const express = require("express");
const { pool } = require("../config/db.js");

const router = express.Router();

// POST /repair_item/order
router.post("/order", async (req, res) => {
  let connection;

  try {
    const {
      buyer_id,
      manufacturer_id,
      buyer_name,
      buyer_phone,
      buyer_address,
      buyer_profile_link,
      item_name,
      product_details,
      damage,
      requirements_questions,
      media = [],
    } = req.body;

    // 1. Validate required fields
    if (
      buyer_id == null ||
      manufacturer_id == null ||
      typeof buyer_name !== "string" ||
      !buyer_name.trim() ||
      typeof buyer_phone !== "string" ||
      !buyer_phone.trim() ||
      typeof buyer_address !== "string" ||
      !buyer_address.trim() ||
      typeof item_name !== "string" ||
      !item_name.trim() ||
      typeof product_details !== "string" ||
      !product_details.trim() ||
      typeof damage !== "string" ||
      !damage.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Buyer ID, manufacturer ID, buyer name, phone, address, item name, product details and damage description are required.",
      });
    }

    // 2. Validate IDs
    const isValidId = (value) =>
      (typeof value === "number" ||
        (typeof value === "string" && /^\d+$/.test(value))) &&
      Number.isSafeInteger(Number(value)) &&
      Number(value) > 0;

    if (!isValidId(buyer_id) || !isValidId(manufacturer_id)) {
      return res.status(400).json({
        success: false,
        message: "Buyer ID or manufacturer ID is invalid.",
      });
    }

    // 3. Validate optional fields
    if (buyer_profile_link != null && typeof buyer_profile_link !== "string") {
      return res.status(400).json({
        success: false,
        message: "Buyer profile link must be a string.",
      });
    }

    if (
      requirements_questions != null &&
      typeof requirements_questions !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Requirements/questions must be a string.",
      });
    }

    // 4. Validate media array
    if (!Array.isArray(media)) {
      return res.status(400).json({
        success: false,
        message: "Media must be an array.",
      });
    }

    // Prevent excessively large requests
    if (media.length > 20) {
      return res.status(400).json({
        success: false,
        message: "A maximum of 20 media files is allowed per request.",
      });
    }

    for (const file of media) {
      if (
        !file ||
        !["image", "video"].includes(file.media_type) ||
        typeof file.media_url !== "string" ||
        !file.media_url.trim() ||
        file.media_url.length > 2048
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each media item must have a valid image/video type and URL.",
        });
      }

      if (
        file.original_file_name != null &&
        (typeof file.original_file_name !== "string" ||
          file.original_file_name.length > 255)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid original file name.",
        });
      }
    }

    // 5. Acquire a database connection
    connection = await pool.promise().getConnection();

    // 6. Begin transaction
    await connection.beginTransaction();

    // 7. Insert the repair request
    const [requestResult] = await connection.execute(
      `INSERT INTO repair_requests (
        buyer_id,
        manufacturer_id,
        buyer_name,
        buyer_phone,
        buyer_address,
        buyer_profile_link,
        item_name,
        product_details,
        damage,
        requirements_questions,
        request_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        buyer_id,
        manufacturer_id,
        buyer_name.trim(),
        buyer_phone.trim(),
        buyer_address.trim(),
        buyer_profile_link?.trim() || null,
        item_name.trim(),
        product_details.trim(),
        damage.trim(),
        requirements_questions?.trim() || null,
        "submitted",
      ],
    );

    const requestId = requestResult.insertId;

    // 8. Insert image/video records
    for (const file of media) {
      await connection.execute(
        `INSERT INTO repair_request_media (
          request_id,
          media_type,
          media_url,
          original_file_name
        ) VALUES (?, ?, ?, ?)`,
        [
          requestId,
          file.media_type,
          file.media_url.trim(),
          file.original_file_name?.trim() || null,
        ],
      );
    }

    // 9. Commit all inserts together
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Repair request submitted successfully.",
      request_id: requestId,
      request_status: "submitted",
      media_count: media.length,
    });
  } catch (error) {
    // Roll back if anything failed
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Transaction rollback error:", rollbackError);
      }
    }

    console.error("Repair item order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit repair request.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
