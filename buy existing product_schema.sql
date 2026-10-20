ALTER TABLE manufacturer_product_listings
DROP FOREIGN KEY fk_listing_manufacturer_product;

CREATE TABLE manufacturer_product_listings (
    listing_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    manufacturer_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,

    title VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    about_item TEXT,
    long_description TEXT,

    price DECIMAL(12,2) NOT NULL,

    discount_type ENUM(
        'none',
        'percentage',
        'fixed_amount'
    ) NOT NULL DEFAULT 'none',

    discount_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    emi_available BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_type ENUM(
        'free',
        'paid'
    ) NOT NULL DEFAULT 'free',

    delivery_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    cod_available BOOLEAN NOT NULL DEFAULT TRUE,
    online_payment_available BOOLEAN NOT NULL DEFAULT TRUE,

    is_returnable BOOLEAN NOT NULL DEFAULT FALSE,
    return_period_days SMALLINT UNSIGNED DEFAULT NULL,

    weight DECIMAL(10,3) DEFAULT NULL,
    weight_unit ENUM('g', 'kg', 'ml', 'l') DEFAULT NULL,

    dimensions JSON DEFAULT NULL,
    specifications JSON DEFAULT NULL,

    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,

    listing_status ENUM(
        'draft',
        'active',
        'inactive'
    ) NOT NULL DEFAULT 'draft',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_listing_manufacturer_product
        FOREIGN KEY (manufacturer_id, product_id)
        REFERENCES manufacturer_products (manufacturer_id, product_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_listing_price
        CHECK (price >= 0),

    CONSTRAINT chk_listing_discount
        CHECK (
            discount_value >= 0
            AND (
                (discount_type = 'percentage'
                    AND discount_value <= 100)
                OR discount_type IN ('none', 'fixed_amount')
            )
            AND (
                discount_type <> 'fixed_amount'
                OR discount_value <= price
            )
        ),

    CONSTRAINT chk_listing_delivery
        CHECK (
            delivery_cost >= 0
            AND (
                (delivery_type = 'free' AND delivery_cost = 0)
                OR delivery_type = 'paid'
            )
        ),

    CONSTRAINT chk_listing_returns
        CHECK (
            (is_returnable = TRUE AND return_period_days IS NOT NULL
                AND return_period_days > 0)
            OR
            (is_returnable = FALSE AND return_period_days IS NULL)
        ),

    INDEX idx_listing_product (product_id),
    INDEX idx_listing_manufacturer_status (
        manufacturer_id,
        listing_status
    )
);

CREATE TABLE manufacturer_product_media (
    media_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    listing_id BIGINT UNSIGNED NOT NULL,

    media_type ENUM(
        'image',
        'video'
    ) NOT NULL DEFAULT 'image',

    media_url VARCHAR(500) NOT NULL,

    display_order INT UNSIGNED NOT NULL DEFAULT 1,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_media_listing
        FOREIGN KEY (listing_id)
        REFERENCES manufacturer_product_listings (listing_id)
        ON DELETE CASCADE,

    INDEX idx_media_listing_order (
        listing_id,
        display_order
    )
);

CREATE TABLE cart_items (
    cart_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    buyer_id BIGINT UNSIGNED NOT NULL,
    listing_id BIGINT UNSIGNED NOT NULL,

    quantity INT UNSIGNED NOT NULL DEFAULT 1,

    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cart_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES buyer_profiles (buyer_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_listing
        FOREIGN KEY (listing_id)
        REFERENCES manufacturer_product_listings (listing_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_cart_quantity
        CHECK (quantity >= 1),

    CONSTRAINT uq_buyer_listing
        UNIQUE (buyer_id, listing_id),

    INDEX idx_cart_buyer (buyer_id)
);

CREATE TABLE orders (
    order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    buyer_id BIGINT UNSIGNED NOT NULL,

    -- Buyer information
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,

    -- Delivery address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255) DEFAULT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(15) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',

    -- Price summary
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,

    -- Payment information
    payment_method ENUM(
        'cod',
        'online'
    ) NOT NULL,

    payment_status ENUM(
        'pending',
        'paid',
        'failed',
        'refunded'
    ) NOT NULL DEFAULT 'pending',

    -- Order tracking
    order_status ENUM(
        'placed',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
    ) NOT NULL DEFAULT 'placed',

    buyer_notes TEXT DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES buyer_profiles (buyer_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_order_amounts
        CHECK (
            subtotal >= 0
            AND discount_amount >= 0
            AND discount_amount <= subtotal
            AND delivery_charge >= 0
            AND total_amount =
                subtotal - discount_amount + delivery_charge
        )
);

CREATE TABLE order_items (
    order_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL,
    listing_id BIGINT UNSIGNED NOT NULL,

    -- Product information snapshot
    product_title VARCHAR(200) NOT NULL,

    -- Purchase details
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(12,2) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders (order_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_items_listing
        FOREIGN KEY (listing_id)
        REFERENCES manufacturer_product_listings (listing_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_order_item_quantity
        CHECK (quantity >= 1),

    CONSTRAINT chk_order_item_prices
        CHECK (
            unit_price >= 0
            AND discount_amount >= 0
            AND discount_amount <= unit_price * quantity
            AND line_total = (unit_price * quantity) - discount_amount
        )
);