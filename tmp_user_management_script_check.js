(async function(){
// Extracted script from user-management.html for syntax check

// NOTE: This file is for a syntax-only check. It does not run in the browser and omits DOM-specific behavior.

async function _dummy(){
    // small snippet to mirror the event handler submission logic
    const firstName = 'A';
    const lastName = 'B';
    const email = 'a@b.com';
    const password = 'pass1234';
    const inventory_item_id = null;
    const department = null;

    if (!firstName || !lastName || !email || !password) {
        console.log('Validation failed');
        return;
    }

    try {
        const payload = { firstName, lastName, email, password, department };
        if (inventory_item_id) payload.inventory_item_id = Number(inventory_item_id);
        console.log('Create user payload:', payload);
    } catch (err) {
        console.error('Create user error:', err);
    }
}

_dummy();
})();