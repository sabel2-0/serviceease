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
                institutionId,
                role = 'coordinator' 
            } = userData;
            
            // Debug: Log all received fields
            console.log('Creating user with data:', {
                firstName: firstName || '[MISSING]',
                lastName: lastName || '[MISSING]',
                email: email || '[MISSING]',
                password: password ? `[${password.length} chars]` : '[MISSING]',
                institutionId: institutionId || '[MISSING]',
                role: role
            });
            
            // Validate required fields
            if (!firstName || !lastName || !email || !password) {
                throw new Error('Missing required fields: firstName, lastName, email, and password are required');
            }
            
            if (!password || password.trim() === '') {
                throw new Error('Password is required and cannot be empty');
            }

            // Validate institution_id for coordinators and requesters
            if ((role === 'coordinator' || role === 'requester') && !institutionId) {
                throw new Error('institution_id is required for coordinators and requesters');
            }
            
            // Check if user exists
            const existingUser = await this.findByEmail(email);
            if (existingUser) {
                throw new Error('Email already registered');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password.trim(), 10);

            // Insert user WITHOUT institution_id (original system)
            const [result] = await db.query(
                `INSERT INTO users (first_name, last_name, email, password, role, is_email_verified, approval_status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [firstName, lastName, email, hashedPassword, role, false, 'pending']
            );

            const userId = result.insertId;
            console.log(`Created user ${userId}`);

            // For coordinators, update the institution's user_id to link them as the owner
            if (role === 'coordinator' && institutionId) {
                await db.query(
                    'UPDATE institutions SET user_id = ? WHERE institution_id = ?',
                    [userId, institutionId]
                );
                console.log(`Linked user ${userId} as owner of institution ${institutionId}`);
            }

            // Create notification for admins about new coordinator registration
            if (role === 'coordinator' && institutionId) {
                // Fetch institution details for notification
                const [institutions] = await db.query(
                    'SELECT name, type, address FROM institutions WHERE institution_id = ? LIMIT 1',
                    [institutionId]
                );
                
                const institution = institutions[0] || {};
                
                await db.query(
                    `INSERT INTO notifications (type, title, message, related_user_id, related_data) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        'coordinator_registration',
                        'New Coordinator Registration',
                        `${firstName} ${lastName} from ${institution.name || 'Unknown Institution'} has registered and is awaiting approval.`,
                        userId,
                        JSON.stringify({
                            email: email,
                            institution_id: institutionId,
                            institution_name: institution.name,
                            institution_type: institution.type,
                            institution_address: institution.address
                        })
                    ]
                );
                console.log(`Created notification for new coordinator registration: ${email}`);
            }

            return {
                userId: userId,
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
                       i.institution_id, i.name as institution_name,
                       i.type as institution_type, i.address as institution_address
                FROM users u
                LEFT JOIN temp_user_photos tp ON u.id = tp.user_id
                LEFT JOIN institutions i ON i.user_id = u.id
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
            // First, get the photo paths to delete the actual files
            const [photos] = await db.query(
                'SELECT front_id_photo, back_id_photo, selfie_photo FROM temp_user_photos WHERE user_id = ?',
                [userId]
            );

            // Update the user's approval status and email verification status
            await db.query(
                'UPDATE users SET approval_status = ?, is_email_verified = ? WHERE id = ?',
                ['approved', true, userId]
            );

            // Delete the photos from filesystem if they exist
            if (photos && photos[0]) {
                const photoFields = ['front_id_photo', 'back_id_photo', 'selfie_photo'];
                for (const field of photoFields) {
                    if (photos[0][field]) {
                        const photoPath = path.join(__dirname, '../temp_photos', photos[0][field]);
                        try {
                            await fs.promises.unlink(photoPath);
                            console.log(`Deleted photo file: ${photoPath}`);
                        } catch (err) {
                            console.error(`Error deleting photo file ${photoPath}:`, err);
                            // Continue with approval even if file deletion fails
                        }
                    }
                }
            }

            // Clean up temporary photos record from database after approval
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
                            console.log(`Deleted photo file: ${photoPath}`);
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