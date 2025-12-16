// ===== INSTITUTION SERVICE CALENDAR =====
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // 1-12
let calendarData = {};

async function initializeCalendar() {
    // Set up event listeners
    document.getElementById('prevMonth').addEventListener('click', function() {
        currentMonth--;
        if (currentMonth < 1) {
            currentMonth = 12;
            currentYear--;
        }
        updateMonthYearDisplay();
        loadCalendarData();
    });

    document.getElementById('nextMonth').addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }
        updateMonthYearDisplay();
        loadCalendarData();
    });

    updateMonthYearDisplay();
    loadCalendarData();
}

async function loadCalendarData() {
    try {
        showCalendarLoading();

        const token = localStorage.getItem('token');
        const url = `/api/admin/institution-service-calendar?year=${currentYear}&month=${currentMonth}`;
        console.log('?? Loading calendar data:', url);
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        console.log('?? Response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('? Calendar data received:', data);
            console.log('?? Calendar entries:', Object.keys(data.calendar_data || {}).length);
            calendarData = data.calendar_data || {};
            renderCalendar();
        } else {
            const errorText = await response.text();
            console.error('? Failed to load calendar data. Status:', response.status, 'Error:', errorText);
            showEmptyCalendar();
        }
    } catch (error) {
        console.error('? Error loading calendar data:', error);
        showEmptyCalendar();
    }
}

function updateMonthYearDisplay() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonthYear').textContent = 
        `${monthNames[currentMonth - 1]} ${currentYear}`;
}

function renderCalendar() {
    console.log('?? Rendering calendar with data:', calendarData);
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    // Hide loading/empty states
    document.getElementById('calendarLoading').classList.add('hidden');
    document.getElementById('calendarEmpty').classList.add('hidden');
    grid.classList.remove('hidden');

    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'text-center font-semibold text-slate-700 py-2';
        header.textContent = day;
        grid.appendChild(header);
    });

    // Get first day of month and total days
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    console.log('?? Rendering', daysInMonth, 'days for', currentYear + '-' + currentMonth);

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'bg-slate-50 rounded-lg p-3 min-h-[100px]';
        grid.appendChild(emptyCell);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = calendarData[dateStr];
        
        if (day === 1) {
            console.log('?? Sample dateStr:', dateStr, 'dayData:', dayData);
            console.log('?? All calendar data keys:', Object.keys(calendarData));
        }
        
        const dayCell = document.createElement('div');
        dayCell.className = 'bg-white border border-slate-200 rounded-lg p-3 min-h-[100px] hover:shadow-md transition-shadow';
        
        if (dayData && dayData.total_institutions > 0) {
            dayCell.classList.add('cursor-pointer', 'hover:border-blue-400');
            
            // Color intensity based on activity
            let bgColor = 'bg-blue-50';
            if (dayData.total_institutions >= 6) bgColor = 'bg-blue-200';
            else if (dayData.total_institutions >= 3) bgColor = 'bg-blue-100';
            
            dayCell.classList.add(bgColor);
            
            dayCell.innerHTML = `
                <div class="font-semibold text-slate-900 mb-2">${day}</div>
                <div class="space-y-1">
                    <div class="text-xs">
                        <span class="font-medium text-blue-700">?? ${dayData.total_institutions}</span>
                        <span class="text-slate-600"> school${dayData.total_institutions > 1 ? 's' : ''}</span>
                    </div>
                    <div class="text-xs">
                        <span class="font-medium text-green-700">??? ${dayData.total_printers_serviced}</span>
                        <span class="text-slate-600"> serviced</span>
                    </div>
                </div>
            `;
            
            dayCell.addEventListener('click', () => showDayDetail(dateStr, dayData));
        } else {
            dayCell.innerHTML = `
                <div class="font-semibold text-slate-400">${day}</div>
                <div class="text-xs text-slate-400 mt-2">No services</div>
            `;
        }
        
        grid.appendChild(dayCell);
    }
}

function showCalendarLoading() {
    document.getElementById('calendarLoading').classList.remove('hidden');
    document.getElementById('calendarEmpty').classList.add('hidden');
    document.getElementById('calendarGrid').classList.add('hidden');
}

function showEmptyCalendar() {
    document.getElementById('calendarLoading').classList.add('hidden');
    document.getElementById('calendarEmpty').classList.remove('hidden');
    document.getElementById('calendarGrid').classList.add('hidden');
}

function showDayDetail(dateStr, dayData) {
    const modal = document.getElementById('dayDetailModal');
    const date = new Date(dateStr);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    document.getElementById('modalDate').textContent = 
        `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    
    document.getElementById('modalTotalSchools').textContent = dayData.total_institutions;
    document.getElementById('modalTotalPrinters').textContent = dayData.total_printers_serviced;
    
    const list = document.getElementById('modalInstitutionsList');
    list.innerHTML = dayData.institutions.map(inst => `
        <div class="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-400 cursor-pointer transition-all hover:shadow-md"
             onclick="showInstitutionDetail('${inst.institution_id}', '${dateStr}', '${inst.institution_name.replace(/'/g, "\\'")}')">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <i class="fas fa-school text-blue-600"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-slate-900">${inst.institution_name}</h4>
                        <p class="text-xs text-slate-500">${inst.serviced_count} service${inst.serviced_count > 1 ? 's' : ''} completed</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        ${inst.serviced_count} serviced
                    </span>
                    <i class="fas fa-chevron-right text-slate-400"></i>
                </div>
            </div>
        </div>
    `).join('');
    
    modal.classList.remove('hidden');
}

window.closeDayDetailModal = function() {
    document.getElementById('dayDetailModal').classList.add('hidden');
};

window.showInstitutionDetail = async function(institutionId, dateStr, institutionName) {
    try {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        const token = localStorage.getItem('token');
        const response = await fetch(
            `/api/admin/institution-service-details?institution_id=${institutionId}&year=${year}&month=${month}&day=${day}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!response.ok) {
            throw new Error('Failed to load institution details');
        }

        const data = await response.json();
        
        // Close day modal and open institution modal
        document.getElementById('dayDetailModal').classList.add('hidden');
        const instModal = document.getElementById('institutionDetailModal');
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        document.getElementById('instModalName').textContent = institutionName;
        document.getElementById('instModalDate').textContent = 
            `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        
        document.getElementById('instTotalPrinters').textContent = data.total_printers;
        document.getElementById('instServicedCount').textContent = data.serviced_count;
        document.getElementById('instNotServicedCount').textContent = data.not_serviced_count;
        
        // Render serviced printers
        const servicedList = document.getElementById('servicedPrintersList');
        if (data.serviced_printers.length > 0) {
            servicedList.innerHTML = data.serviced_printers.map(printer => `
                <div class="bg-green-50 border border-green-200 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition-colors"
                     onclick="showServiceDetail(${printer.id}, '${printer.service_number}')">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-print text-green-600"></i>
                            <div>
                                <div class="font-medium text-slate-900">${printer.printer_name}</div>
                                <div class="text-xs text-slate-600">
                                    ?? ${printer.location || 'N/A'}?? ${printer.department || 'N/A'}
                                </div>
                                <div class="text-xs font-semibold text-green-700 mt-1">
                                    ${printer.service_number}
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs text-slate-600">Technician:</div>
                            <div class="text-sm font-medium text-slate-900">${printer.tech_first_name} ${printer.tech_last_name}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            servicedList.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No printers serviced on this date</p>';
        }
        
        // Render not serviced printers
        const notServicedList = document.getElementById('notServicedPrintersList');
        if (data.not_serviced_printers.length > 0) {
            notServicedList.innerHTML = data.not_serviced_printers.map(printer => `
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-print text-amber-600"></i>
                        <div>
                            <div class="font-medium text-slate-900">${printer.printer_name}</div>
                            <div class="text-xs text-slate-600">
                                ?? ${printer.location || 'N/A'} ?? ${printer.department || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            notServicedList.innerHTML = '<p class="text-sm text-green-600 text-center py-4 font-medium">? All printers serviced!</p>';
        }
        
        instModal.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading institution details:', error);
        alert('Failed to load institution details');
    }
};

window.closeInstitutionDetailModal = function() {
    document.getElementById('institutionDetailModal').classList.add('hidden');
    // Reopen day modal
    document.getElementById('dayDetailModal').classList.remove('hidden');
};

window.showServiceDetail = async function(serviceId, serviceNumber) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/maintenance-services/${serviceId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load service details');
        }

        const service = await response.json();
        
        // items_used is now an array from the backend (not JSON string)
        const partsUsed = service.items_used || [];
        
        const content = `
            <div class="space-y-6">
                <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
                    <div class="text-sm text-blue-600 font-medium">Service Number</div>
                    <div class="text-3xl font-bold text-blue-900 mt-1">${serviceNumber}</div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <div class="text-sm text-slate-600 font-medium mb-2">?? Institution</div>
                        <div class="font-semibold text-slate-900">${service.institution_name || 'N/A'}</div>
                    </div>
                    <div>
                        <div class="text-sm text-slate-600 font-medium mb-2">??? Printer</div>
                        <div class="font-semibold text-slate-900">${service.printer_name || 'N/A'}</div>
                    </div>
                    <div>
                        <div class="text-sm text-slate-600 font-medium mb-2">?? Location</div>
                        <div class="text-slate-900">${service.location || 'N/A'}</div>
                    </div>
                    <div>
                        <div class="text-sm text-slate-600 font-medium mb-2">?? Department</div>
                        <div class="text-slate-900">${service.department || 'N/A'}</div>
                    </div>
                </div>

                <div class="bg-slate-50 rounded-lg p-4">
                    <div class="text-sm text-slate-600 font-medium mb-2">????? Technician</div>
                    <div class="font-semibold text-slate-900">${service.technician_name || 'N/A'}</div>
                    <div class="text-xs text-slate-600 mt-1">Submitted: ${new Date(service.created_at).toLocaleString()}</div>
                </div>

                <div>
                    <div class="text-sm text-slate-600 font-medium mb-2">?? Service Description</div>
                    <div class="bg-slate-50 rounded-lg p-3 text-slate-900">${service.service_description || 'No description provided'}</div>
                </div>

                ${partsUsed.length > 0 ? `
                    <div>
                        <div class="text-sm text-slate-600 font-medium mb-2">?? Items Used</div>
                        <div class="space-y-2">
                            ${partsUsed.map(part => `
                                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-slate-900">${part.name}</span>
                                        <span class="text-sm text-slate-600">Qty: ${part.quantity}</span>
                                    </div>
                                    ${part.display_amount ? `<div class="text-xs text-blue-600 font-semibold mt-1"><i class="fas fa-flask"></i> ${part.display_amount}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${service.completion_photo ? `
                    <div>
                        <div class="text-sm text-slate-600 font-medium mb-2">?? Completion Photo</div>
                        <img src="${service.completion_photo}" alt="Completion" class="w-full rounded-lg border border-slate-200">
                    </div>
                ` : ''}

                ${service.approved_by_name ? `
                    <div class="bg-green-50 rounded-lg p-4">
                        <div class="text-sm text-green-600 font-medium mb-2">? Approved By</div>
                        <div class="font-semibold text-green-900">${service.approved_by_name}</div>
                    </div>
                ` : ''}

                <div class="text-center">
                    <span class="inline-block px-4 py-2 rounded-full text-sm font-semibold ${service.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
                        ${service.status.toUpperCase()}
                    </span>
                </div>
            </div>
        `;
        
        document.getElementById('serviceDetailContent').innerHTML = content;
        document.getElementById('serviceDetailModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading service details:', error);
        alert('Failed to load service details');
    }
};

window.closeServiceDetailModal = function() {
    document.getElementById('serviceDetailModal').classList.add('hidden');
};

// Initialize calendar when DOM is ready
document.addEventListener('DOMContentLoaded', initializeCalendar);

// Close modals on overlay click
document.addEventListener('click', function(e) {
    if (e.target.id === 'dayDetailModal') closeDayDetailModal();
    if (e.target.id === 'institutionDetailModal') closeInstitutionDetailModal();
    if (e.target.id === 'serviceDetailModal') closeServiceDetailModal();
});




