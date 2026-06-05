-- CreateTable
CREATE TABLE `system_logs` (
    `id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `method` VARCHAR(191) NULL,
    `url` VARCHAR(191) NULL,
    `request` TEXT NULL,
    `response` TEXT NULL,
    `status_code` INTEGER NULL,
    `exec_time` DOUBLE NULL,
    `request_time` DATETIME(3) NOT NULL,
    `response_time` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `members` (
    `id` VARCHAR(191) NOT NULL,
    `member` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `last_password_change` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `members_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_logs` (
    `id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `detail` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `converted_articles` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `source_filename` VARCHAR(255) NOT NULL,
    `html` LONGTEXT NOT NULL,
    `inventory` JSON NOT NULL,
    `slide_count` INTEGER NOT NULL,
    `accuracy_overall` DOUBLE NOT NULL,
    `accuracy_text` DOUBLE NOT NULL,
    `accuracy_image` DOUBLE NOT NULL,
    `accuracy_coverage` DOUBLE NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversion_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `trigger` VARCHAR(20) NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `files_scanned` INTEGER NOT NULL DEFAULT 0,
    `files_converted` INTEGER NOT NULL DEFAULT 0,
    `files_failed` INTEGER NOT NULL DEFAULT 0,
    `detail` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seed_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seed_name` VARCHAR(255) NOT NULL,
    `executed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `seed_history_seed_name_key`(`seed_name`),
    INDEX `idx_seed_name`(`seed_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
