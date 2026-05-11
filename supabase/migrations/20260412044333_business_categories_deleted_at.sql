-- Migration: Add soft delete support to business tables

-- 1. Update business_types
ALTER TABLE business_types 
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX idx_business_types_deleted_at ON business_types (deleted_at) 
WHERE deleted_at IS NULL;

-- 2. Update business_categories
ALTER TABLE business_categories 
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX idx_business_categories_deleted_at ON business_categories (deleted_at) 
WHERE deleted_at IS NULL;