// Global logout confirmation helper
(function() {
    if (window.showLogoutConfirm) return; // already defined

    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'global-logout-confirm-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; background-color: rgba(0, 0, 0, 0.5); display: none; align-items: center; justify-content: center; pointer-events: auto;';
        modal.innerHTML = `
            <div id="logout-modal-content" style="background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); max-width: 400px; width: 90%; padding: 24px; margin: 16px; position: relative; z-index: 10000; pointer-events: auto;">
                <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Confirm Logout</h2>
                <p style="font-size: 14px; color: #666; margin-bottom: 16px;">Are you sure you want to logout?</p>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="global-logout-cancel" type="button" style="padding: 8px 16px; background-color: #e5e7eb; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; pointer-events: auto;">Cancel</button>
                    <button id="global-logout-confirm" type="button" style="padding: 8px 16px; background-color: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; pointer-events: auto;">Logout</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function showLogoutConfirm() {
        return new Promise((resolve) => {
            let modal = document.getElementById('global-logout-confirm-modal');
            if (!modal) modal = createModal();

            const cancelBtn = modal.querySelector('#global-logout-cancel');
            const confirmBtn = modal.querySelector('#global-logout-confirm');

            function cleanup() {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                modal.removeEventListener('click', onBackdrop);
                document.removeEventListener('keydown', onKey);
            }

            function onConfirm(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Logout confirmed');
                cleanup();
                resolve(true);
            }

            function onCancel(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Logout cancelled');
                cleanup();
                resolve(false);
            }

            function onBackdrop(e) {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            }

            function onKey(e) {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                }
            }

            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
            modal.addEventListener('click', onBackdrop);
            document.addEventListener('keydown', onKey);

            // show
            modal.style.display = 'flex';
            // focus confirm for keyboard users
            setTimeout(() => cancelBtn.focus(), 50);
        });
    }

    window.showLogoutConfirm = showLogoutConfirm;
})();
