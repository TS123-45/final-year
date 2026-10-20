const express = require("express");
const { queryDatabase } = require("../config/db.js");

const router = express.Router();


router.get("/search", async (req, res) => {
  try {
    const itemName = req.query.item_name?.trim();
    const filter = req.query.filter?.trim().toLowerCase();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    // Validate input
    if (!itemName || itemName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Please enter an item name (max 100 characters).",
      });
    }

    const allowedFilters = ["rent"];
    if (filter && !allowedFilters.includes(filter)) {
      return res.status(400).json({
        success: false,
        message: "Invalid filter.",
      });
    }

    // Escape LIKE wildcards typed by the user
    const safeName = itemName.replace(/[\\%_]/g, "\\$&");

    // Steps 1 to 3 in a single query
    const manufacturers = await queryDatabase(
      `SELECT
          m.manufacturer_id,
          m.business_name,
          m.business_logo_url,
          m.business_description,
          m.business_type,
          m.business_scale,
          m.city,
          m.state,
          m.manufacturing_strategy,
          m.supports_customization,
          m.accepts_rental,
          GROUP_CONCAT(DISTINCT i.item_name ORDER BY i.item_name SEPARATOR ', ')
            AS matched_items
       FROM item AS i
       INNER JOIN manufacturer_item AS mi
          ON mi.item_id = i.item_id
       INNER JOIN manufacturer_profiles AS m
          ON m.manufacturer_id = mi.manufacturer_id
       INNER JOIN users AS u
          ON u.user_id = m.user_id
       WHERE i.item_name LIKE ?
         AND m.verification_status = 'verified'
         AND u.account_status = 'active'
         ${filter === "rent" ? "AND m.accepts_rental = TRUE" : ""}
       GROUP BY m.manufacturer_id
       ORDER BY m.business_name
       LIMIT ? OFFSET ?`,
      [`%${safeName}%`, limit, offset],
    );

    return res.status(200).json({
      success: true,
      searched_item: itemName,
      filter: filter || null,
      page,
      manufacturer_count: manufacturers.length,
      manufacturers,
    });
  } catch (error) {
    console.error("Manufacturer search error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while searching for manufacturers.",
    });
  }
});

module.exports = router;
