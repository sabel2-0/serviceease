// Global logout confirmation modal helper
// This ensures logout modals work properly even when loaded dynamically

window.showLogoutConfirm = function(logoutCallback) {
    // Check if modal already exists
    let modal = document.getElementById('global-logout-confirm-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-logout-confirm-modal';
        modal.style.cssText = 'display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); align-items: center; justify-content: center;';
        modal.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 8px; max-width: 400px; width: 90%; pointer-events: auto;">
                <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">Confirm Logout</h3>
                <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px;">Are you sure you want to logout?</p>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="global-logout-cancel" type="button" style="padding: 8px 16px; background-color: #f3f4f6; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; pointer-events: auto;">Cancel</button>
                    <button id="global-logout-confirm" type="button" style="padding: 8px 16px; background-color: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; pointer-events: auto;">Logout</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Show modal
    modal.style.display = 'flex';

    // Get buttons
    const confirmBtn = modal.querySelector('#global-logout-confirm');
    const cancelBtn = modal.querySelector('#global-logout-cancel');

    // Remove old listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.replaceWith(newConfirmBtn);
    cancelBtn.replaceWith(newCancelBtn);

    // Add new listeners
    newConfirmBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (typeof logoutCallback === 'function') {
            logoutCallback();
        } else {
            // Default logout behavior
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/pages/login.html';
        }
    });

    newCancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
};




