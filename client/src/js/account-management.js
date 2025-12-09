// Account Management Page Logic

// Load current user profile and fill form - DEFINE FIRST
async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found - redirecting to login');
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            window.location.replace('/pages/login.html');
            return;
        }

        console.log('Fetching admin profile...');
        const res = await fetch('/api/admin/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Profile response status:', res.status);
        
        if (res.ok) {
            const user = await res.json();
            console.log('Profile data received:', user);
            document.getElementById('firstName').value = user.first_name || '';
            document.getElementById('lastName').value = user.last_name || '';
            document.getElementById('email').value = user.email || '';
        } else {
            const error = await res.text();
            console.error('Failed to load profile:', error);
            showNotification('Failed to load profile data', 'error');
        }
    } catch (err) {
        console.error('Error loading profile:', err);
        showNotification('Error loading profile. Please refresh the page.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - account-management.js loaded');
    
    // Load current user profile into the form
    loadProfile();

    // Profile form submit
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const token = localStorage.getItem('token');
            const formData = new FormData(profileForm);
            const data = {
                first_name: formData.get('firstName'),
                last_name: formData.get('lastName')
            };
            try {
                const res = await fetch('/api/admin/profile', {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    showNotification('Profile updated successfully!', 'success');
                    loadProfile();
                } else {
                    const err = await res.json();
                    showNotification('Error updating profile: ' + (err.error || 'Unable to update profile'), 'error');
                }
            } catch (err) {
                showNotification('Error updating profile. Please try again.', 'error');
            }
        });
    }

    // Security form submit (password change)
    const securityForm = document.getElementById('security-form');
    console.log('Security form element found:', !!securityForm);
    if (securityForm) {
        console.log(' ATTACHING SUBMIT HANDLER TO SECURITY FORM');
        securityForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('=== PASSWORD UPDATE FORM SUBMITTED ===');
            console.log('Handler is ACTIVE and WORKING');
            
            // Ensure the verification code was verified first
            if (!window._verificationVerified) {
                console.log(' Verification not done');
                showNotification('Please request and verify the verification code first', 'warning');
                return;
            }
            
            const token = localStorage.getItem('token');
            const formData = new FormData(securityForm);
            const data = {
                currentPassword: formData.get('currentPassword'),
                newPassword: formData.get('newPassword'),
                confirmPassword: formData.get('confirmPassword'),
                verificationCode: formData.get('verificationCode')
            };
            
            console.log('Form data collected:', {
                currentPassword: data.currentPassword ? `${data.currentPassword.length} chars` : 'empty',
                newPassword: data.newPassword ? `${data.newPassword.length} chars` : 'empty',
                confirmPassword: data.confirmPassword ? `${data.confirmPassword.length} chars` : 'empty',
                verificationCode: data.verificationCode
            });
            
            // Check all required fields are filled
            if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
                console.log(' Missing required password fields');
                showNotification('Please fill in all password fields', 'error');
                return;
            }
            
            // Validation checks
            if (!data.verificationCode || data.verificationCode.length !== 6) {
                console.log(' Invalid verification code');
                showNotification('Please enter a valid 6-digit verification code', 'warning');
                return;
            }
            
            if (data.newPassword !== data.confirmPassword) {
                console.log(' Passwords do not match!');
                console.log('New:', data.newPassword);
                console.log('Confirm:', data.confirmPassword);
                showNotification('New passwords do not match!', 'error');
                return;
            }
            
            if (data.newPassword.length < 6) {
                console.log(' Password too short:', data.newPassword.length);
                showNotification('New password must be at least 6 characters long!', 'warning');
                return;
            }
            
            console.log(' All validations passed, sending to server...');
            
            try {
                const res = await fetch('/api/admin/password', {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify(data)
                });
                
                console.log('Server response status:', res.status);
                
                if (res.ok) {
                    console.log('? Password updated successfully');
                    
                    // Set redirect flag FIRST
                    sessionStorage.setItem('redirecting_to_login', 'true');
                    
                    // IMMEDIATELY clear ALL authentication data
                    localStorage.removeItem('user');
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('token');
                    
                    showNotification('Password updated successfully! Redirecting to login...', 'success');
                    
                    // Redirect to login immediately (no delay needed since flag is set)
                    setTimeout(() => {
                        console.log('Redirecting to login after password change...');
                        window.location.replace('/pages/login.html');
                    }, 1500);
                } else {
                    const err = await res.json();
                    showNotification('Error updating password: ' + (err.error || 'Unable to update password'), 'error');
                }
            } catch (err) {
                showNotification('Error updating password. Please try again.', 'error');
            }
        });
    }
});




