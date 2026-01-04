# Coordinator Approval Email Notification Guide

This guide explains how to set up email notifications for approved coordinators using EmailJS.

##  Overview

When an admin approves An institution_admin registration, the system will automatically send a professional email notification to The institution_admin's email address, informing them that their account is ready to use.

---

## 🚀 Setup Instructions

### **Step 1: Create Email Template in EmailJS**

1. **Go to EmailJS Dashboard**
   - Visit: https://dashboard.emailjs.com/
   - Log in with your account (the same one you use for OTP emails)

2. **Create New Template**
   - Click **"Email Templates"** in the left sidebar
   - Click **"Create New Template"** button

3. **Configure Template Settings**
   
   **Template Name:** `coordinator_approval_notification`
   
   **From Name:** `ServiceEase`
   
   **From Email:** (use your verified sender email)
   
   **Subject Line:**
   ```
   Your ServiceEase institution_admin account Has Been Approved! 
   ```

4. **Email Content (HTML)**
   
   Copy and paste this template:

   ```html
   <!DOCTYPE html>
   <html>
   <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
       <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
           <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
               <h1 style="margin: 0;"> Account Approved!</h1>
           </div>
           
           <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
               <p>Dear {{coordinator_name}},</p>
               
               <p>Great news! Your ServiceEase institution_admin account has been approved by our admin team.</p>
               
               <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                   <p style="margin: 0;"><strong>Account Details:</strong></p>
                   <p style="margin: 10px 0;">Email: {{coordinator_email}}</p>
                   <p style="margin: 10px 0;">Role: Coordinator</p>
               </div>
               
               <p>You can now log in to your account and start managing service requests for your institution.</p>
               
               <div style="text-align: center; margin: 30px 0;">
                   <a href="http://localhost:3000/pages/login.html" 
                      style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                             color: white; 
                             padding: 15px 40px; 
                             text-decoration: none; 
                             border-radius: 5px; 
                             display: inline-block;
                             font-weight: bold;">
                       Log In Now
                   </a>
               </div>
               
               <p>If you have any questions, please don't hesitate to contact our support team.</p>
               
               <p style="margin-top: 30px;">Best regards,<br>ServiceEase Team</p>
           </div>
           
           <div style="text-align: center; color: #888; font-size: 12px; margin-top: 20px;">
               <p>This is an automated message. Please do not reply to this email.</p>
           </div>
       </div>
   </body>
   </html>
   ```

5. **Configure Template Variables**
   
   Click on "Settings" tab and ensure these variables are configured:
   - `{{coordinator_name}}` - Institution Admin's full name
   - `{{coordinator_email}}` - Institution Admin's email address
   - `{{to_email}}` - Recipient email (auto-filled by EmailJS)

6. **Save Template**
   - Click **"Save"** button
   - **IMPORTANT:** Copy the **Template ID** (format: `template_xxxxxxx`)
   - You'll need this in the next step!

---

### **Step 2: Update Your Code with Template ID**

1. **Open the file:**
   ```
   client/src/js/account-management.js
   ```

2. **Find line ~238** (in the `approveCoordinator` function)

3. **Replace `"template_XXXXX"` with your actual Template ID:**
   
   Change this:
   ```javascript
   await emailjs.send(
       "service_upjalyd",
       "template_XXXXX",  // ← REPLACE THIS
       {
   ```
   
   To this (with your actual template ID):
   ```javascript
   await emailjs.send(
       "service_upjalyd",
       "template_abc123def",  // ← Your actual template ID from EmailJS
       {
   ```

4. **Save the file**

---

### **Step 3: Test the Implementation**

1. **Restart your server**
   ```powershell
   Get-Process -Name node | Stop-Process -Force
   cd C:\Users\marki\Desktop\SE\server
   node index.js
   ```

2. **Create a test institution_admin account**
   - Go to: `http://localhost:3000/pages/register.html`
   - Register as An institution_admin
   - Use a **real email address** you can check

3. **Approve The institution_admin**
   - Log in as admin
   - Go to Account Management or Pending Coordinators section
   - Click "Approve" on the test coordinator
   - Check the console for any errors

4. **Verify email delivery**
   - Check The institution_admin's email inbox
   - Check spam/junk folder if not found
   - Email should arrive within 1-2 minutes

---

## 📁 Files Modified

### **Backend Changes**
-  `server/index.js` (line ~2068-2095)
  - Added `emailData` to approval response
  - Includes coordinator name and email for frontend to send

### **Frontend Changes**
-  `client/src/pages/admin/account-management.html`
  - Added EmailJS library script
  - Initialized EmailJS with public key

-  `client/src/js/account-management.js`
  - Updated `approveCoordinator()` function
  - Sends email automatically after successful approval
  - Includes error handling if email fails

---

##  Template Variables Reference

When EmailJS sends the email, these variables are automatically replaced:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{coordinator_name}}` | Full name of coordinator | "John Doe" |
| `{{coordinator_email}}` | Coordinator's email | "john@institution.edu" |
| `{{to_email}}` | Recipient (same as institution_admin_email) | "john@institution.edu" |

---

## 🎨 Customization Options

### **Change Email Colors**
In the template HTML, modify the gradient colors:
```html
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### **Change Login URL** (for production)
Update the button link:
```html
<a href="https://your-production-domain.com/pages/login.html"
```

### **Add More Information**
You can add fields like:
- Institution name
- Approval date
- Admin contact info

Just update both:
1. Server response in `server/index.js`
2. EmailJS template variables

---

## 🐛 Troubleshooting

### **Email not sending?**

1. **Check Browser Console**
   - Open DevTools (F12)
   - Look for EmailJS errors
   - Common: "Template not found" = wrong template ID

2. **Verify EmailJS Settings**
   - Service ID: `service_upjalyd`
   - Template ID: Must match what you copied
   - Public Key: `QjWuxszKzF9KLYlVZ`

3. **Check EmailJS Dashboard**
   - Go to "Email Logs" section
   - See if request reached EmailJS servers
   - Check for rate limits (free tier: 200/month)

### **Email goes to spam?**

1. **Add SPF/DKIM records** (advanced)
2. **Use custom domain** instead of Gmail
3. **Ask recipient to whitelist** serviceease emails

### **Variables not replacing?**

- Make sure variable names in template **exactly match**
- Check for typos: `{{coordinator_name}}` not `{{coordinatorName}}`
- Variables are case-sensitive

---

## 📊 Email Flow Diagram

```
Admin clicks "Approve" 
    ↓
Frontend calls /api/coordinators/:id/approve
    ↓
Backend updates database (status = 'approved')
    ↓
Backend returns emailData (name, email)
    ↓
Frontend receives response
    ↓
Frontend calls emailjs.send()
    ↓
EmailJS sends email via their service
    ↓
Coordinator receives approval email
    ↓
Success message shown to admin
```

---

## 🔐 Security Notes

- EmailJS public key is safe to expose (it's public by design)
- Email service credentials stored on EmailJS servers (secure)
- No sensitive data transmitted beyond coordinator's name/email
- HTTPS encryption when page served properly

---

##  Additional Features to Consider

### **Future Enhancements:**

1. **Rejection Email Template**
   - Create similar template for rejected coordinators
   - Include rejection reason
   - Provide re-application instructions

2. **Welcome Email with Instructions**
   - Add onboarding guide links
   - Include tutorial videos
   - List first steps for institution_admins

3. **Admin Notification**
   - Send email to admin when new coordinator registers
   - Include quick approval link

4. **Email Preferences**
   - Let coordinators opt out of notifications
   - Store preference in database

---

##  Success Checklist

- [ ] EmailJS template created and saved
- [ ] Template ID copied and pasted into code
- [ ] Server restarted after changes
- [ ] Test institution_admin account created
- [ ] Approval button clicked
- [ ] Email received in inbox
- [ ] Email displays correctly (formatting, links work)
- [ ] No console errors in browser

---

##  Support

If you encounter issues:
1. Check EmailJS documentation: https://www.emailjs.com/docs/
2. Verify your EmailJS account isn't rate-limited
3. Check browser console for detailed errors
4. Review server logs for API errors

---

##  You're Done!

Once you've completed all steps and the test email arrives successfully, the feature is fully implemented and ready for production use!

**Remember:** Replace `template_XXXXX` with your actual template ID from EmailJS dashboard!

