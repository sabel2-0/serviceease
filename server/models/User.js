const db = require('../config/database');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

class User {
    static async findByEmail(email) {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0];
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw new Error('Database error while finding user');
        }
    }

    static async validatePassword(email, password) {
        try {
            const user = await this.findByEmail(email);
            if (!user) {
                return false;
            }

            const isValid = await bcrypt.compare(password, user.password);
            return isValid ? user : false;
        } catch (error) {
            console.error('Error validating password:', error);
            throw new Error('Error validating credentials');
        }
    }

    static async createUser(userData) {
        try {
            const { 
                firstName, 
                lastName, 
                email, 
                password, 
                institutionType,
                institutionName,
                institutionAddress,
                role = 'coordinator' 
            } = userData;
            
            // Debug: Log all received fields
            console.log('Creating user with data:', {
                firstName: firstName || '[MISSING]',
                lastName: lastName || '[MISSING]',
                email: email || '[MISSING]',
                password: password ? `[${password.length} chars]` : '[MISSING]',
                institutionType: institutionType || '[MISSING]',
                institutionName: institutionName || '[MISSING]',
                institutionAddress: institutionAddress || '[MISSING]'
            });
            
            // Validate required fields
            if (!firstName || !lastName || !email || !password) {
                throw new Error('Missing required fields: firstName, lastName, email, and password are required');
            }
            
            if (!password || password.trim() === '') {
                throw new Error('Password is required and cannot be empty');
            }
            
            // Check if user exists
            const existingUser = await this.findByEmail(email);
            if (existingUser) {
                throw new Error('Email already registered');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password.trim(), 10);

            // Insert user with institution details and pending approval status
            const [result] = await db.query(
                `INSERT INTO users (first_name, last_name, email, password, role, is_email_verified, 
                 institution_type, institution_name, institution_address, approval_status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [firstName, lastName, email, hashedPassword, role, false, 
                 institutionType, institutionName, institutionAddress, 'pending']
            );

            return {
                userId: result.insertId,
                email: email
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error(error.message || 'Error creating user');
        }
    }

    static async saveTemporaryPhotos(userId, photoPaths) {
        try {
            const { frontIdPhoto, backIdPhoto, selfiePhoto } = photoPaths;
            
            // Insert or update temporary photos
            await db.query(
                `INSERT INTO temp_user_photos (user_id, front_id_photo, back_id_photo, selfie_photo)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 front_id_photo = VALUES(front_id_photo),
                 back_id_photo = VALUES(back_id_photo),
                 selfie_photo = VALUES(selfie_photo),
                 created_at = CURRENT_TIMESTAMP`,
                [userId, frontIdPhoto, backIdPhoto, selfiePhoto]
            );

            return true;
        } catch (error) {
            console.error('Error saving temporary photos:', error);
            throw new Error('Error saving temporary photos');
        }
    }

    static async getPendingUsers() {
        try {
            const [rows] = await db.query(`
                SELECT u.*, tp.front_id_photo, tp.back_id_photo, tp.selfie_photo,
                       i.institution_id, i.name as matched_institution_name,
                       i.type as matched_institution_type, i.address as matched_institution_address,
                       CASE 
                           WHEN i.institution_id IS NOT NULL THEN 1 
                           ELSE 0 
                       END as has_institution_match
                FROM users u
                LEFT JOIN temp_user_photos tp ON u.id = tp.user_id
                LEFT JOIN institutions i ON (
                    LOWER(TRIM(u.institution_name)) = LOWER(TRIM(i.name)) 
                    AND u.institution_type = i.type
                )
                WHERE u.approval_status = 'pending'
                ORDER BY u.created_at DESC
            `);
            return rows;
        } catch (error) {
            console.error('Error fetching pending users:', error);
            throw new Error('Error fetching pending users');
        }
    }

    static async approveUser(userId) {
        try {
            // Find the user's chosen institution
            const [userRows] = await db.query('SELECT institution_name, institution_type FROM users WHERE id = ?', [userId]);
            if (!userRows || userRows.length === 0) {
                throw new Error('User not found');
            }
            const { institution_name, institution_type } = userRows[0];

            // Find matching institution record
            const [instRows] = await db.query(
                'SELECT institution_id FROM institutions WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND type = ?',
                [institution_name, institution_type]
            );
            let institutionId = null;
            if (instRows && instRows.length > 0) {
                institutionId = instRows[0].institution_id;
            }

            // Update user approval status and email verification
            await db.query(
                'UPDATE users SET approval_status = ?, is_email_verified = ? WHERE id = ?',
                ['approved', true, userId]
            );

            // Clean up temporary photos after approval
            await db.query('DELETE FROM temp_user_photos WHERE user_id = ?', [userId]);

            return true;
        } catch (error) {
            console.error('Error approving user:', error);
            throw new Error('Error approving user');
        }
    }

    static async rejectUser(userId) {
        try {
            // First, get the photo paths to delete the actual files
            const [photos] = await db.query(
                'SELECT front_id_photo, back_id_photo, selfie_photo FROM temp_user_photos WHERE user_id = ?',
                [userId]
            );

            // Delete the photos from filesystem if they exist
            if (photos && photos[0]) {
                const photoFields = ['front_id_photo', 'back_id_photo', 'selfie_photo'];
                for (const field of photoFields) {
                    if (photos[0][field]) {
                        const photoPath = path.join(__dirname, '../temp_photos', photos[0][field]);
                        try {
                            await fs.promises.unlink(photoPath);
                        } catch (err) {
                            console.error(`Error deleting photo file ${photoPath}:`, err);
                            // Continue with rejection even if file deletion fails
                        }
                    }
                }
            }

            // Start transaction
            await db.query('START TRANSACTION');

            try {
                // Delete records from database
                await db.query('DELETE FROM temp_user_photos WHERE user_id = ?', [userId]);
                await db.query('DELETE FROM users WHERE id = ?', [userId]);
                
                await db.query('COMMIT');
                return true;
            } catch (error) {
                await db.query('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error('Error in rejectUser:', error);
            throw new Error(`Failed to reject user: ${error.message}`);
        }
    }
}

module.exports = User;