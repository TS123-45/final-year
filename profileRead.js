const express = require("express");
const { queryDatabase } = require("../config/db.js");
// const {authMiddleware} = require("../middleware/auth_mw.js");

const router = express.Router();

// read a buyer profile (GET /account/buyerProfile?user_id=1)
router.get("/buyerProfile", async (req, res) => {
  try {
    const { user_id } = req.query;

    // 1. Validate user_id
    if (!user_id || !/^\d+$/.test(user_id) || Number(user_id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid user_id is required.",
      });
    }

    // 2. Read buyer profile
    const profileSql = `
      SELECT
        buyer_id,
        user_id,
        full_name,
        profile_image_url,
        phone_number,
        date_of_birth,
        gender,
        preferred_language,
        created_at,
        updated_at
      FROM buyer_profiles
      WHERE user_id = ?
    `;

    const profiles = await queryDatabase(profileSql, [Number(user_id)]);

    // 3. Check whether profile exists
    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Buyer profile not found.",
      });
    }

    const buyer = profiles[0];

    // 4. Read the buyer's saved addresses
    const addressSql = `
      SELECT
        address_id,
        buyer_id,
        address_type,
        phone_number,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        created_at,
        updated_at
      FROM buyer_addresses
      WHERE buyer_id = ?
      ORDER BY address_id DESC
    `;

    const addresses = await queryDatabase(addressSql, [buyer.buyer_id]);

    // 5. Return profile and addresses
    return res.status(200).json({
      success: true,
      message: "Buyer profile retrieved successfully.",
      data: {
        ...buyer,
        addresses,
      },
    });
  } catch (error) {
    console.error("Read buyer profile error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
    });
  }
});


// read manufacturer profile (GET /account/manufacturerProfile)
router.get("/manufacturerProfile", async (req, res) => {
  try {
    const { user_id } = req.query;

    // 1. Validate user_id
    if (!user_id || !/^\d+$/.test(user_id) || Number(user_id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid user_id is required.",
      });
    }

    // 2. Fetch manufacturer profile
    const profileSql = `
      SELECT
        manufacturer_id,
        user_id,
        business_name,
        owner_name,
        business_logo_url,
        business_description,
        business_email,
        business_phone,
        business_type,
        business_scale,
        business_address_line1,
        business_address_line2,
        city,
        state,
        postal_code,
        country,
        manufacturing_strategy,
        supports_customization,
        verification_status,
        verified_at,
        website_url,
        accepts_rental,
        accepts_donations,
        accepts_repair,
        sells_scrap,
        created_at,
        updated_at
      FROM manufacturer_profiles
      WHERE user_id = ?
    `;

    const profiles = await queryDatabase(profileSql, [
      Number(user_id),
    ]);

    // 3. Check whether profile exists
    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Manufacturer profile not found.",
      });
    }

    const manufacturer = profiles[0];

    // 4. Fetch manufacturer's service areas
    const serviceAreaSql = `
      SELECT
        service_area_id,
        manufacturer_id,
        city,
        state,
        postal_code,
        country,
        created_at
      FROM manufacturer_service_areas
      WHERE manufacturer_id = ?
      ORDER BY service_area_id ASC
    `;

    const serviceAreas = await queryDatabase(serviceAreaSql, [
      manufacturer.manufacturer_id,
    ]);

    // 5. Return profile and service areas
    return res.status(200).json({
      success: true,
      message: "Manufacturer profile retrieved successfully.",
      data: {
        ...manufacturer,
        service_areas: serviceAreas,
      },
    });
  } catch (error) {
    console.error("Read manufacturer profile error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
    });
  }
});

module.exports = router;

// we will do role based access control for the above routes in the future.
