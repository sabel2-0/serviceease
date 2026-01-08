const db = require('../config/database');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

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
                role = 'institution_admin' 
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

            // Validate institution_id for institution_admins and institution_users
            if ((role === 'institution_admin' || role === 'institution_user') && !institutionId) {
                throw new Error('institution_id is required for institution_admins and institution_users');
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

            // NOTE: We no longer link the institution_admin to the institution at registration time.
            // The institution.user_id will be set only when the institution_admin is approved by an admin.
            // This preserves the integrity of institution ownership until approval.

            // Create notification for admins about new institution_admin registration
            if (role === 'institution_admin' && institutionId) {
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
                        'institution_admin_registration',
                        'New institution_admin Registration',
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
                console.log(`Created notification for new institution_admin registration: ${email}`);
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
            const { frontIdPhoto, backIdPhoto, selfiePhoto, employmentCertPhoto } = photoPaths;
            
            // Insert or update temporary photos
            await db.query(
                `INSERT INTO temp_user_photos (user_id, front_id_photo, back_id_photo, selfie_photo, employment_cert_photo)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 front_id_photo = VALUES(front_id_photo),
                 back_id_photo = VALUES(back_id_photo),
                 selfie_photo = VALUES(selfie_photo),
                 employment_cert_photo = VALUES(employment_cert_photo),
                 created_at = CURRENT_TIMESTAMP`,
                [userId, frontIdPhoto, backIdPhoto, selfiePhoto, employmentCertPhoto]
            );

            return true;
        } catch (error) {
            console.error('Error saving temporary photos:', error);
            throw new Error('Error saving temporary photos');
        }
    }

    static async getPendingUsers() {
        try {
            // Get pending users and fetch institution info from notifications.related_data
            // since institutions.user_id is only set after approval
            const [rows] = await db.query(`
                SELECT u.*, tp.front_id_photo, tp.back_id_photo, tp.selfie_photo, tp.employment_cert_photo,
                       n.related_data
                FROM users u
                LEFT JOIN temp_user_photos tp ON u.id = tp.user_id
                LEFT JOIN notifications n ON n.related_user_id = u.id AND n.type = 'institution_admin_registration'
                WHERE u.approval_status = 'pending'
                ORDER BY u.created_at DESC
            `);
            
            // Parse related_data to extract institution information for institution_admins
            const formattedRows = rows.map(row => {
                let institutionInfo = {
                    institution_id: null,
                    institution_name: null,
                    institution_type: null,
                    institution_address: null
                };
                
                // Only parse for institution_admins
                if (row.role === 'institution_admin' && row.related_data) {
                    try {
                        const data = typeof row.related_data === 'string' 
                            ? JSON.parse(row.related_data) 
                            : row.related_data;
                        
                        institutionInfo = {
                            institution_id: data.institution_id || null,
                            institution_name: data.institution_name || null,
                            institution_type: data.institution_type || null,
                            institution_address: data.institution_address || null
                        };
                    } catch (e) {
                        console.error('Error parsing notification related_data:', e);
                    }
                }
                
                // Remove related_data and add institution info
                const { related_data, ...rest } = row;
                return {
                    ...rest,
                    ...institutionInfo
                };
            });
            
            return formattedRows;
        } catch (error) {
            console.error('Error fetching pending users:', error);
            throw new Error('Error fetching pending users');
        }
    }

    static async approveUser(userId, approvedBy = null) {
        try {
            // First, get the photo paths/URLs to delete from Cloudinary
            const [photos] = await db.query(
                'SELECT front_id_photo, back_id_photo, selfie_photo, employment_cert_photo FROM temp_user_photos WHERE user_id = ?',
                [userId]
            );

            // Update the user's approval status and email verification status
            await db.query(
                'UPDATE users SET approval_status = ?, is_email_verified = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
                ['approved', true, approvedBy, userId]
            );

            // Try to associate the approved institution_admin with the institution they selected during registration.
            // The registration flow stores the selected institution_id inside a notification's related_data JSON.
            try {
                const [notifRows] = await db.query(
                    `SELECT related_data FROM notifications WHERE related_user_id = ? AND type = 'institution_admin_registration' ORDER BY created_at DESC LIMIT 1`,
                    [userId]
                );

                if (notifRows && notifRows.length > 0 && notifRows[0].related_data) {
                    let related = notifRows[0].related_data;
                    // related_data may be a JSON string or already an object depending on driver
                    if (typeof related === 'string') {
                        try {
                            related = JSON.parse(related);
                        } catch (e) {
                            // ignore parse error
                        }
                    }

                    const institutionId = related && (related.institution_id || related.institutionId || related.institution_id);
                    if (institutionId) {
                        await db.query('UPDATE institutions SET user_id = ? WHERE institution_id = ?', [userId, institutionId]);
                        console.log(`Linked approved institution_admin ${userId} as owner of institution ${institutionId}`);
                    } else {
                        console.log(`No institution_id found in notification related_data for user ${userId}`);
                    }
                } else {
                    console.log(`No institution_admin_registration notification found for user ${userId} to determine institution`);
                }
            } catch (linkErr) {
                console.error(`Error linking institution for approved user ${userId}:`, linkErr);
                // Do not fail approval if linking fails
            }

            // Delete the photos from Cloudinary if they exist
            if (photos && photos[0]) {
                const photoFields = ['front_id_photo', 'back_id_photo', 'selfie_photo', 'employment_cert_photo'];
                for (const field of photoFields) {
                    if (photos[0][field]) {
                        try {
                            // Extract public_id from Cloudinary URL
                            // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.jpg
                            const urlParts = photos[0][field].split('/');
                            const filename = urlParts[urlParts.length - 1];
                            const publicId = filename.split('.')[0];
                            
                            await cloudinary.uploader.destroy(`serviceease/${publicId}`);
                            console.log(`Deleted Cloudinary image: ${publicId}`);
                        } catch (err) {
                            console.error(`Error deleting Cloudinary image:`, err);
                            // Continue with approval even if deletion fails
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
            // First, get the photo paths/URLs to delete from Cloudinary
            const [photos] = await db.query(
                'SELECT front_id_photo, back_id_photo, selfie_photo, employment_cert_photo FROM temp_user_photos WHERE user_id = ?',
                [userId]
            );

            // Delete the photos from Cloudinary if they exist
            if (photos && photos[0]) {
                const photoFields = ['front_id_photo', 'back_id_photo', 'selfie_photo', 'employment_cert_photo'];
                for (const field of photoFields) {
                    if (photos[0][field]) {
                        try {
                            // Extract public_id from Cloudinary URL
                            const urlParts = photos[0][field].split('/');
                            const filename = urlParts[urlParts.length - 1];
                            const publicId = filename.split('.')[0];
                            
                            await cloudinary.uploader.destroy(`serviceease/${publicId}`);
                            console.log(`Deleted Cloudinary image: ${publicId}`);
                        } catch (err) {
                            console.error(`Error deleting Cloudinary image:`, err);
                            // Continue with rejection even if deletion fails
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



