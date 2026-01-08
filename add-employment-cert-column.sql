-- Add employment certificate photo column to temp_user_photos table
-- This is required for institution admin registration verification

ALTER TABLE temp_user_photos 
ADD COLUMN employment_cert_photo VARCHAR(500) NULL 
COMMENT 'Certificate of Employment photo for institution admin verification'
AFTER selfie_photo;

-- Verify the change
DESCRIBE temp_user_photos;
