const Mailjet = require('node-mailjet');
const mailjet = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
);

/**
 * Send verification code to requester email
 */
async function sendVerificationCode(email, code) {
    try {
        const request = mailjet
            .post('send', { version: 'v3.1' })
            .request({
                Messages: [
                    {
                        From: {
                            Email: process.env.FROM_EMAIL,
                            Name: 'ServiceEase'
                        },
                        To: [
                            {
                                Email: email
                            }
                        ],
                        Subject: 'Email Verification Code',
                        HTMLPart: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2>Email Verification</h2>
                                <p>Thank you for registering with ServiceEase.</p>
                                <p>Your verification code is:</p>
                                <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">
                                    ${code}
                                </div>
                                <p>This code will expire in 24 hours.</p>
                                <p>If you did not request this code, please ignore this email.</p>
                            </div>
                        `
                    }
                ]
            });

        await request;
        console.log('✅ Verification code email sent to:', email);
        return true;
    } catch (error) {
        console.error('❌ Email send error:', error);
        throw error;
    }
}

module.exports = { sendVerificationCode };
