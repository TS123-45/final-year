const express = require("express");
const { queryDatabase } = require("../config/db.js");

const router = express.Router();

// Get a manufacturer's product listings
router.get("/products/list", async (req, res) => {
  try {
    // 1. Get manufacturer ID from query parameters
    const manufacturerId = req.query.manufacturer_id;

    // 2. Validate manufacturer ID
    if (!manufacturerId || !/^[1-9]\d*$/.test(manufacturerId)) {
      return res.status(400).json({
        success: false,
        message: "A valid manufacturer_id is required.",
      });
    }

    // 3. Retrieve only the fields needed for product cards
    const sql = `
            SELECT
                l.listing_id,
                l.title,
                l.price,
                l.discount_type,
                l.discount_value,
                (
                    SELECT m.media_url
                    FROM manufacturer_product_media AS m
                    WHERE m.listing_id = l.listing_id
                      AND m.media_type = 'image'
                    ORDER BY
                        m.is_primary DESC,
                        m.display_order ASC,
                        m.media_id ASC
                    LIMIT 1
                ) AS first_image

            FROM manufacturer_product_listings AS l

            WHERE l.manufacturer_id = ?
              AND l.listing_status = 'active'

            ORDER BY l.created_at DESC
        `;

    // 4. Execute the query safely
    const products = await queryDatabase(sql, [manufacturerId]);

    // 5. Return the product list
    return res.status(200).json({
      success: true,
      manufacturer_id: Number(manufacturerId),
      product_count: products.length,
      products,
    });
  } catch (error) {
    console.error("Product list error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve product listings.",
    });
  }
});

// Get detailed information about a specific product listing
router.get("/products/details", async (req, res) => {
  try {
    // 1. Get listing ID from query parameters
    const { listing_id } = req.query;

    // 2. Validate listing ID
    if (!listing_id || !/^[1-9]\d*$/.test(listing_id)) {
      return res.status(400).json({
        success: false,
        message: "A valid listing_id is required.",
      });
    }

    // 3. Retrieve complete product details
    const productSql = `
            SELECT
                listing_id,
                manufacturer_id,
                product_id,
                title,
                description,
                about_item,
                long_description,
                price,
                discount_type,
                discount_value,
                emi_available,
                delivery_type,
                delivery_cost,
                cod_available,
                online_payment_available,
                is_returnable,
                return_period_days,
                weight,
                weight_unit,
                dimensions,
                specifications,
                stock_quantity,
                listing_status,
                created_at,
                updated_at
            FROM manufacturer_product_listings
            WHERE listing_id = ?
              AND listing_status = 'active'
            LIMIT 1
        `;

    const products = await queryDatabase(productSql, [listing_id]);

    // 4. Check whether the product exists
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found or unavailable.",
      });
    }

    const product = products[0];

    // 5. Retrieve all images and videos for this listing
    const mediaSql = `
            SELECT
                media_id,
                media_type,
                media_url,
                display_order,
                is_primary
            FROM manufacturer_product_media
            WHERE listing_id = ?
            ORDER BY
                is_primary DESC,
                display_order ASC,
                media_id ASC
        `;

    const media = await queryDatabase(mediaSql, [listing_id]);

    // 6. Return complete product details and media
    return res.status(200).json({
      success: true,
      product: {
        ...product,
        media,
      },
    });
  } catch (error) {
    console.error("Product details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve product details.",
    });
  }
});

module.exports = router;
