// Global logout confirmation helper
(function() {
    if (window.showLogoutConfirm) return; // already defined

    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'global-logout-confirm-modal';
        modal.className = 'fixed inset-0 z-50 hidden flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6 mx-4">
                <h2 class="text-lg font-semibold mb-2">Confirm Logout</h2>
                <p class="text-sm text-gray-600 mb-4">Are you sure you want to logout?</p>
                <div class="flex justify-end space-x-3">
                    <button id="global-logout-cancel" class="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                    <button id="global-logout-confirm" class="px-4 py-2 bg-red-600 text-white rounded-md">Logout</button>
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
                modal.classList.add('hidden');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                modal.removeEventListener('click', onBackdrop);
                document.removeEventListener('keydown', onKey);
            }

            function onConfirm(e) {
                e.preventDefault();
                cleanup();
                resolve(true);
            }

            function onCancel(e) {
                e.preventDefault();
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
            modal.classList.remove('hidden');
            // focus confirm for keyboard users
            cancelBtn.focus();
        });
    }

    window.showLogoutConfirm = showLogoutConfirm;
})();
