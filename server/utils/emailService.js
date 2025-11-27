const mailjet = require('node-mailjet');

const mailjetClient = mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
);

const FROM_EMAIL = process.env.EMAIL_USER || 'serviceeaseph@gmail.com';
const FROM_NAME = 'ServiceEase Support';

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(to, resetToken, firstName) {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/reset-password.html?token=${resetToken}`;
    
    try {
        const result = await mailjetClient
            .post('send', { version: 'v3.1' })
            .request({
                Messages: [
                    {
                        From: {
                            Email: FROM_EMAIL,
                            Name: FROM_NAME
                        },
                        To: [
                            {
                                Email: to,
                                Name: firstName
                            }
                        ],
                        Subject: 'Reset Your ServiceEase Password',
                        TextPart: `Hi ${firstName},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nServiceEase Team`,
                        HTMLPart: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>🔒 Password Reset Request</h1>
                                    </div>
                                    <div class="content">
                                        <p>Hi ${firstName},</p>
                                        <p>You requested to reset your password for your ServiceEase account.</p>
                                        <p>Click the button below to create a new password:</p>
                                        <center>
                                            <a href="${resetLink}" class="button">Reset Password</a>
                                        </center>
                                        <p style="color: #dc2626; font-weight: bold;">⏰ This link will expire in 1 hour.</p>
                                        <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                                        <p>Best regards,<br><strong>ServiceEase Team</strong></p>
                                    </div>
                                    <div class="footer">
                                        <p>ServiceEase - Printer Management System</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `
                    }
                ]
            });
        
        console.log('✅ Password reset email sent to:', to);
        return { success: true, result };
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error);
        throw error;
    }
}

/**
 * Send email verification for requester registration
 */
async function sendRequesterVerificationEmail(to, verificationCode, firstName) {
    try {
        const result = await mailjetClient
            .post('send', { version: 'v3.1' })
            .request({
                Messages: [
                    {
                        From: {
                            Email: FROM_EMAIL,
                            Name: FROM_NAME
                        },
                        To: [
                            {
                                Email: to,
                                Name: firstName
                            }
                        ],
                        Subject: 'Email Verification Code - ServiceEase Registration',
                        TextPart: `Hi ${firstName},\n\nThank you for registering with ServiceEase!\n\nYour verification code is: ${verificationCode}\n\nPlease enter this code on the registration page to verify your email address.\n\nThis code will expire in 24 hours.\n\nBest regards,\nServiceEase Team`,
                        HTMLPart: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                                    .code-box { background: white; border: 2px dashed #10b981; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                                    .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981; }
                                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>✉️ Verify Your Email</h1>
                                    </div>
                                    <div class="content">
                                        <p>Hi ${firstName},</p>
                                        <p>Thank you for registering with ServiceEase!</p>
                                        <p>Please use the verification code below to complete your registration:</p>
                                        <div class="code-box">
                                            <div class="code">${verificationCode}</div>
                                        </div>
                                        <p>Enter this code on the registration page to verify your email address.</p>
                                        <p style="color: #dc2626; font-weight: bold;">⏰ This code will expire in 24 hours.</p>
                                        <p style="color: #6b7280; font-size: 14px;">After verification, your registration will be sent to your institution's coordinator for approval.</p>
                                        <p>Best regards,<br><strong>ServiceEase Team</strong></p>
                                    </div>
                                    <div class="footer">
                                        <p>ServiceEase - Printer Management System</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `
                    }
                ]
            });
        
        console.log('✅ Verification code email sent to:', to);
        return { success: true, result };
    } catch (error) {
        console.error('❌ Failed to send verification email:', error);
        throw error;
    }
}

/**
 * Send requester registration approved notification
 */
async function sendRequesterApprovedEmail(to, firstName, printerCount) {
    try {
        const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/login.html`;
        
        const result = await mailjetClient
            .post('send', { version: 'v3.1' })
            .request({
                Messages: [
                    {
                        From: {
                            Email: FROM_EMAIL,
                            Name: FROM_NAME
                        },
                        To: [
                            {
                                Email: to,
                                Name: firstName
                            }
                        ],
                        Subject: '🎉 Your ServiceEase Account Has Been Approved!',
                        HTMLPart: `
                            <!DOCTYPE html>
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                                        <h1>🎉 Account Approved!</h1>
                                    </div>
                                    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                                        <p>Hi ${firstName},</p>
                                        <p>Great news! Your ServiceEase account has been approved by your institution's coordinator.</p>
                                        <p>✅ <strong>${printerCount} printer(s)</strong> have been assigned to your account.</p>
                                        <p>You can now log in and start submitting service requests:</p>
                                        <center>
                                            <a href="${loginLink}" style="display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Login Now</a>
                                        </center>
                                        <p>Best regards,<br><strong>ServiceEase Team</strong></p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `
                    }
                ]
            });
        
        console.log('✅ Approval email sent to:', to);
        return { success: true, result };
    } catch (error) {
        console.error('❌ Failed to send approval email:', error);
        throw error;
    }
}

/**
 * Send requester registration rejected notification
 */
async function sendRequesterRejectedEmail(to, firstName, reason) {
    try {
        const result = await mailjetClient
            .post('send', { version: 'v3.1' })
            .request({
                Messages: [
                    {
                        From: {
                            Email: FROM_EMAIL,
                            Name: FROM_NAME
                        },
                        To: [
                            {
                                Email: to,
                                Name: firstName
                            }
                        ],
                        Subject: 'ServiceEase Registration Update',
                        HTMLPart: `
                            <!DOCTYPE html>
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                                        <h1>Registration Update</h1>
                                    </div>
                                    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                                        <p>Hi ${firstName},</p>
                                        <p>We regret to inform you that your ServiceEase registration was not approved.</p>
                                        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                                        <p>If you believe this was an error, please contact your institution's coordinator for more information.</p>
                                        <p>Best regards,<br><strong>ServiceEase Team</strong></p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `
                    }
                ]
            });
        
        console.log('✅ Rejection email sent to:', to);
        return { success: true, result };
    } catch (error) {
        console.error('❌ Failed to send rejection email:', error);
        throw error;
    }
}

module.exports = {
    sendPasswordResetEmail,
    sendRequesterVerificationEmail,
    sendRequesterApprovedEmail,
    sendRequesterRejectedEmail
};
