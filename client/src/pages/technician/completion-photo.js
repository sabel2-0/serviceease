// Photo Camera Functions - v2.0 - Updated Dec 1, 2025
(function() {
    'use strict';
    
    console.log('?? Loading completion-photo.js');
    
    // Handle completion photo capture - Make functions globally accessible
    window.openCamera = function() {
        console.log('openCamera called');
        const input = document.getElementById('completionPhotoInput');
        if (input) {
            input.click();
        } else {
            console.error('completionPhotoInput not found');
        }
    };

    window.retakePhoto = function() {
        console.log('retakePhoto called');
        const input = document.getElementById('completionPhotoInput');
        const preview = document.getElementById('photoPreview');
        const camera = document.getElementById('cameraArea');
        
        if (input) input.value = '';
        if (preview) preview.classList.add('hidden');
        if (camera) camera.classList.remove('hidden');
    };

    window.removeCompletionPhoto = function() {
        console.log('removeCompletionPhoto called');
        const input = document.getElementById('completionPhotoInput');
        const preview = document.getElementById('photoPreview');
        const camera = document.getElementById('cameraArea');
        const image = document.getElementById('previewImage');
        
        if (input) input.value = '';
        if (preview) preview.classList.add('hidden');
        if (camera) camera.classList.remove('hidden');
        if (image) image.src = '';
    };

    console.log('? Camera functions registered on window object:', {
        openCamera: typeof window.openCamera,
        retakePhoto: typeof window.retakePhoto,
        removeCompletionPhoto: typeof window.removeCompletionPhoto
    });

    // Initialize photo input handler immediately
    function initPhotoHandler() {
        const photoInput = document.getElementById('completionPhotoInput');
        const photoPreview = document.getElementById('photoPreview');
        const previewImage = document.getElementById('previewImage');
        const cameraArea = document.getElementById('cameraArea');

        if (photoInput) {
            photoInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        if (previewImage) previewImage.src = event.target.result;
                        if (photoPreview) photoPreview.classList.remove('hidden');
                        if (cameraArea) cameraArea.classList.add('hidden');
                    };
                    reader.readAsDataURL(file);
                }
            });
            console.log('? Photo input handler initialized');
        } else {
            console.warn('Photo input not found, will retry...');
            setTimeout(initPhotoHandler, 100);
        }
    }
    
    // Start initialization
    initPhotoHandler();

    // Handle job completion form submission - Make globally accessible
    window.handleJobCompletion = async function(event) {
        event.preventDefault();
        
        const form = event.target;
        const serviceActions = document.getElementById('serviceActions').value;
        const additionalNotes = document.getElementById('additionalNotes').value;
        const photoInput = document.getElementById('completionPhotoInput');
        const submitBtn = document.getElementById('submitCompletion');
        
        // Validate photo
        if (!photoInput.files || !photoInput.files[0]) {
            alert('Please take a completion photo');
            return;
        }
        
        // Convert photo to base64
        const reader = new FileReader();
        reader.onload = async function(e) {
            const photoBase64 = e.target.result;
            
            try {
                // Disable submit button
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Submitting...';
                
                // Get parts data if exists (using same selectors as requests.js)
                const parts = [];
                document.querySelectorAll('.part-entry').forEach(entry => {
                    const nameSelect = entry.querySelector('.part-name-select');
                    const quantityInput = entry.querySelector('.part-quantity');
                    const unitSelect = entry.querySelector('.part-unit');
                    const brandSelect = entry.querySelector('.part-brand-select');
                    
                    if (nameSelect && nameSelect.value) {
                        const selectedOption = nameSelect.options[nameSelect.selectedIndex];
                        const brand = brandSelect ? brandSelect.value : (selectedOption?.dataset.brand || '');
                        
                        parts.push({ 
                            name: nameSelect.value,
                            brand: brand,
                            qty: parseInt(quantityInput?.value || 1),
                            unit: unitSelect?.value || 'pieces'
                        });
                    }
                });
                
                // Get current request ID from selectedRequest (set when modal opens)
                let requestId = null;
                
                // Try to get from window.selectedRequest (set in requests.js)
                if (window.selectedRequest && window.selectedRequest.id) {
                    requestId = window.selectedRequest.id;
                }
                
                // Fallback: try modal data attribute
                if (!requestId) {
                    const modal = document.getElementById('jobCompletionModal');
                    requestId = modal ? modal.dataset.requestId : null;
                }
                
                if (!requestId) {
                    throw new Error('Request ID not found. Please close and reopen the completion form.');
                }
                
                console.log('Submitting completion for request ID:', requestId);
                
                // Submit completion
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/technician/service-requests/${requestId}/complete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        actions: serviceActions + (additionalNotes ? '\n\nNotes: ' + additionalNotes : ''),
                        notes: additionalNotes || '',
                        parts: parts,
                        completion_photo: photoBase64
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to submit completion');
                }
                
                const result = await response.json();
                alert('Service request completed successfully!');
                
                // Close modal and reload
                if (window.closeJobCompletionModal) {
                    window.closeJobCompletionModal();
                }
                window.location.reload();
                
            } catch (error) {
                console.error('Error submitting completion:', error);
                alert('Error: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Submit';
            }
        };
        
        reader.readAsDataURL(photoInput.files[0]);
    };

})();







