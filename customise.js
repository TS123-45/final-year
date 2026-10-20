const express = require("express");
const { pool } = require("../config/db.js");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

const router = express.Router();

// Project root/uploads/customization
const uploadDir = path.join(__dirname, "../../uploads/customization");

fs.mkdirSync(uploadDir, { recursive: true });

// Allowed customization forms and their image field names.
const formTypes = [
  "dimensions",
  "color",
  "material",
  "shape_design",
  "components",
  "personalization",
  "comfort",
  "functionality",
  "strength_durability",
  "decorative_details",
  "quantity",
];

const imageSupportedForms = [
  "dimensions",
  "color",
  "shape_design",
  "personalization",
  "functionality",
  "decorative_details",
];

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per image
    files: 50,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WEBP and GIF images are allowed."));
    }

    cb(null, true);
  },
});

// Helpers
const removeUploadedFiles = (files = []) => {
  for (const file of files) {
    if (file.path) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        // Ignore missing files during cleanup.
      }
    }
  }
};

const getText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const getOptionalId = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return number;
};

const uploadMiddleware = (req, res, next) => {
  upload.any()(req, res, (error) => {
    if (error) {
      removeUploadedFiles(req.files || []);

      const statusCode = error instanceof multer.MulterError ? 400 : 400;

      return res.status(statusCode).json({
        success: false,
        message: error.message || "Image upload failed.",
      });
    }

    next();
  });
};

// POST /customise/order
router.post("/order", uploadMiddleware, async (req, res) => {
  const uploadedFiles = req.files || [];
  let connection;
  let transactionStarted = false;

  try {
    // -----------------------------------------------
    // STEP 1: Read buyer and item details
    // -----------------------------------------------

    const buyer_id = getOptionalId(req.body.buyer_id, "buyer_id");
    const manufacturer_id = getOptionalId(
      req.body.manufacturer_id,
      "manufacturer_id",
    );

    const listing_id = getOptionalId(req.body.listing_id, "listing_id");

    const item_id = getOptionalId(req.body.item_id, "item_id");

    const request_type = getText(req.body.request_type);
    const item_name = getText(req.body.item_name);
    const item_description = getText(req.body.item_description);

    const buyer_name = getText(req.body.buyer_name);
    const buyer_phone = getText(req.body.buyer_phone);
    const buyer_address = getText(req.body.buyer_address);
    const buyer_profile_link = getText(req.body.buyer_profile_link);

    const allowedRequestTypes = [
      "manufacturer_product",
      "buyer_owned_product",
      "from_scratch",
    ];

    if (
      !manufacturer_id ||
      !allowedRequestTypes.includes(request_type) ||
      !item_name ||
      !buyer_name ||
      !buyer_phone ||
      !buyer_address
    ) {
      removeUploadedFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message:
          "manufacturer_id, valid request_type, item_name, buyer_name, buyer_phone and buyer_address are required.",
      });
    }

    // A manufacturer product request must identify its listing.
    if (request_type === "manufacturer_product" && !listing_id) {
      removeUploadedFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message:
          "listing_id is required when customizing a manufacturer's existing product.",
      });
    }

    // -----------------------------------------------
    // STEP 2: Validate uploaded image field names
    // Expected names: dimensions_images, color_images, etc.
    // -----------------------------------------------

    const allowedImageFields = imageSupportedForms.map(
      (formType) => `${formType}_images`,
    );

    for (const file of uploadedFiles) {
      if (!allowedImageFields.includes(file.fieldname)) {
        throw new Error(
          `Invalid image field "${file.fieldname}". Use: ${allowedImageFields.join(", ")}.`,
        );
      }
    }

    // Group uploaded files by customization form.
    const filesByForm = {};

    for (const formType of formTypes) {
      filesByForm[formType] = [];
    }

    for (const file of uploadedFiles) {
      const formType = file.fieldname.replace(/_images$/, "");
      filesByForm[formType].push(file);
    }

    // -----------------------------------------------
    // STEP 3: Collect the text from forms 2–12
    // Expected names: dimensions_text, color_text, etc.
    // -----------------------------------------------

    const responses = [];

    for (const formType of formTypes) {
      const responseText = getText(req.body[`${formType}_text`]);

      const formFiles = filesByForm[formType];

      // The buyer may skip a form.
      // Save a response only when text or images are provided.
      if (responseText || formFiles.length > 0) {
        responses.push({
          formType,
          responseText: responseText || null,
          files: formFiles,
        });
      }
    }

    if (responses.length === 0) {
      throw new Error(
        "Please provide text or upload at least one image in a customization form.",
      );
    }

    // -----------------------------------------------
    // STEP 4: Start the MySQL transaction
    // -----------------------------------------------

    connection = await pool.promise().getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // -----------------------------------------------
    // STEP 5: Save buyer and item details
    // -----------------------------------------------

    const [requestResult] = await connection.execute(
      `INSERT INTO customization_requests (
        buyer_id,
        manufacturer_id,
        request_type,
        listing_id,
        item_id,
        item_name,
        item_description,
        buyer_name,
        buyer_phone,
        buyer_address,
        buyer_profile_link
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        buyer_id,
        manufacturer_id,
        request_type,
        listing_id,
        item_id,
        item_name,
        item_description || null,
        buyer_name,
        buyer_phone,
        buyer_address,
        buyer_profile_link || null,
      ],
    );

    const request_id = requestResult.insertId;

    // -----------------------------------------------
    // STEP 6: Save each submitted customization form
    // -----------------------------------------------

    let savedResponseCount = 0;
    let savedImageCount = 0;

    for (const response of responses) {
      const [responseResult] = await connection.execute(
        `INSERT INTO customization_form_responses (
          request_id,
          form_type,
          response_text
        ) VALUES (?, ?, ?)`,
        [request_id, response.formType, response.responseText],
      );

      const response_id = responseResult.insertId;
      savedResponseCount++;

      // ---------------------------------------------
      // STEP 7: Save every image for this form
      // ---------------------------------------------

      let displayOrder = 1;

      for (const file of response.files) {
        // Store a relative URL/path, not an absolute PC path.
        const image_url = `/uploads/customization/${file.filename}`;

        await connection.execute(
          `INSERT INTO customization_form_media (
            response_id,
            image_url,
            original_filename,
            mime_type,
            file_size_bytes,
            display_order
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            response_id,
            image_url,
            path.basename(file.originalname),
            file.mimetype,
            file.size,
            displayOrder,
          ],
        );

        displayOrder++;
        savedImageCount++;
      }
    }

    // -----------------------------------------------
    // STEP 8: Commit transaction
    // -----------------------------------------------

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Customization request submitted successfully.",
      data: {
        request_id,
        request_status: "pending",
        request_type,
        item_name,
        forms_saved: savedResponseCount,
        images_saved: savedImageCount,
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Transaction rollback failed:", rollbackError);
      }
    }

    // Remove uploaded images if the database transaction failed.
    removeUploadedFiles(uploadedFiles);

    console.error("Create customization request error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to submit customization request.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
