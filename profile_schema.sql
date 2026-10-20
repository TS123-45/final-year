CREATE DATABASE c2m_d2c;
USE c2m_d2c;

#users table

CREATE TABLE users (
    user_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL,

    role ENUM(
        'buyer',
        'manufacturer',
        'admin',
        'scrap_collector'
    ) NOT NULL,

    provider ENUM('local', 'google')
        NOT NULL DEFAULT 'local',

    account_status ENUM(
        'active',
        'suspended',
        'pending_deletion'
    ) NOT NULL DEFAULT 'active',

    deletion_date DATETIME NULL,

    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


-- 2. buyer PROFILES
CREATE TABLE buyer_profiles (
    buyer_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    profile_image_url VARCHAR(2048) NULL,
    phone_number VARCHAR(20) NULL,
    date_of_birth DATE NULL,
    gender VARCHAR(30) NULL,
    preferred_language VARCHAR(10) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_customer_profile_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

select * from buyer_profiles;

-- 3. CUSTOMER ADDRESSES
CREATE TABLE buyer_addresses (
    address_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    buyer_id BIGINT UNSIGNED NOT NULL,
    address_type VARCHAR(20) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(12) NOT NULL,
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_address_customer FOREIGN KEY (buyer_id) REFERENCES buyer_profiles(buyer_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. MANUFACTURER PROFILES
CREATE TABLE manufacturer_profiles (
    manufacturer_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    business_name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    business_logo_url VARCHAR(2048) NULL,
    business_description TEXT NULL,
    business_email VARCHAR(254) NOT NULL,
    business_phone VARCHAR(20) NOT NULL,
    business_type VARCHAR(30) NOT NULL,
    business_scale VARCHAR(20) NULL,
    business_address_line1 VARCHAR(255) NOT NULL,
    business_address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(12) NOT NULL,
    country VARCHAR(100) NOT NULL,
    manufacturing_strategy ENUM('make_to_order', 'batch', 'both') NOT NULL,
    supports_customization BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status ENUM('pending', 'verified', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
    verified_at DATETIME NULL,
    website_url VARCHAR(2048) NULL,
    accepts_rental BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_donations BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_repair BOOLEAN NOT NULL DEFAULT FALSE,
    sells_scrap BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_manufacturer_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. MANUFACTURER SERVICE AREAS
CREATE TABLE manufacturer_service_areas (
    service_area_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    manufacturer_id BIGINT UNSIGNED NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(12) NULL,
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_service_area_manufacturer
        FOREIGN KEY (manufacturer_id)
        REFERENCES manufacturer_profiles(manufacturer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 6. SECTORS
CREATE TABLE sectors (
    sector_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sector_name VARCHAR(100) NOT NULL UNIQUE,
    sector_description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sector_id INT UNSIGNED NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_categories_sector
        FOREIGN KEY (sector_id)
        REFERENCES sectors(sector_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_sector_category
        UNIQUE (sector_id, category_name)
);

CREATE TABLE item (
    item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(150) NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE RESTRICT,

    INDEX idx_products_category (category_id)
);

-- 8. MANUFACTURER SECTORS
CREATE TABLE manufacturer_sectors (
    manufacturer_id BIGINT UNSIGNED NOT NULL,
    sector_id INT UNSIGNED NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (manufacturer_id, sector_id),

    CONSTRAINT fk_ms_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturer_profiles(manufacturer_id) ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_ms_sector FOREIGN KEY (sector_id) REFERENCES sectors(sector_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE manufacturer_categories (
    manufacturer_id BIGINT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (manufacturer_id, category_id),

    CONSTRAINT fk_mc_manufacturer
        FOREIGN KEY (manufacturer_id)
        REFERENCES manufacturer_profiles(manufacturer_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mc_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE CASCADE,

    INDEX idx_mc_category_id (category_id)
);

select * from manufacturer_item;

-- 9. manufacturer_items
CREATE TABLE manufacturer_item (
    manufacturer_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (manufacturer_id, item_id),

    CONSTRAINT fk_mpr_manufacturer
        FOREIGN KEY (manufacturer_id)
        REFERENCES manufacturer_profiles(manufacturer_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mr_product
        FOREIGN KEY (item_id)
        REFERENCES item(item_id)
        ON DELETE CASCADE
);

show tables;
