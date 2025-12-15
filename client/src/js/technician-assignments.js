/**
 * Technician Assignment Interface for institutionAdmins
 * 
 * This file implements the institutionAdmin's interface to view and interact with assigned technicians.
 * institutionAdmins can view which technicians are assigned to their institution's printers,
 * but cannot change assignments (only admins can assign technicians).
 */

// Initialize the technician assignment functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the institutionAdmin page
    if (window.location.pathname.includes('institutionAdmin')) {
        initTechnicianAssignmentInterface();
    }
});

/**
 * Initialize the technician assignment interface components
 */
function initTechnicianAssignmentInterface() {
    const dashboardStatsSection = document.getElementById('dashboard-stats');
    
    // If the dashboard stats section exists, add the technician assignment card
    if (dashboardStatsSection) {
        addTechnicianAssignmentCard(dashboardStatsSection);
    }
    
    // Initialize the technician assignment tab in printer management
    initTechnicianAssignmentTab();
    
    // Add the technician column to the printer table
    addTechnicianColumnToPrinterTable();
}

/**
 * Add the technician assignment card to the dashboard stats
 * @param {HTMLElement} container - The container to add the card to
 */
function addTechnicianAssignmentCard(container) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-md p-6 border border-slate-200 flex flex-col';
    card.innerHTML = `
        <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-700">Assigned Technicians</h3>
            <i class="fas fa-user-cog text-blue-500"></i>
        </div>
        <div class="mt-4" id="assigned-techs-container">
            <div class="flex items-center justify-center h-24">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        </div>
    `;
    
    container.appendChild(card);
    
    // Fetch assigned technicians data
    fetchAssignedTechnicians();
}

/**
 * Fetch assigned technicians from the API
 */
function fetchAssignedTechnicians() {
    // In a real implementation, this would call the API to get the assigned technicians
    // For now, we'll simulate the API call with a timeout
    setTimeout(() => {
        const techData = [
            { id: 1, name: "John Smith", specialty: "Printer Hardware", phone: "555-1234" },
            { id: 2, name: "Maria Garcia", specialty: "Network Printers", phone: "555-5678" }
        ];
        
        renderAssignedTechnicians(techData);
    }, 1000);
}

/**
 * Render the assigned technicians in the dashboard card
 * @param {Array} technicians - Array of technician objects
 */
function renderAssignedTechnicians(technicians) {
    const container = document.getElementById('assigned-techs-container');
    
    if (!container) return;
    
    if (technicians.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <p class="text-slate-500">No technicians assigned</p>
                <p class="text-xs text-slate-400 mt-2">Contact admin for technician assignment</p>
            </div>
        `;
        return;
    }
    
    let html = `<div class="space-y-3">`;
    
    technicians.forEach(tech => {
        html += `
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                    <div class="flex items-center">
                        <i class="fas fa-user-gear text-blue-500 mr-2"></i>
                        <p class="font-medium text-slate-700">${tech.name}</p>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">Specialty: ${tech.specialty}</p>
                </div>
                <a href="tel:${tech.phone}" class="text-blue-500 hover:text-blue-600 flex items-center">
                    <i class="fas fa-phone mr-1"></i>
                    <span class="text-sm">${tech.phone}</span>
                </a>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Initialize the technician assignment tab in printer management
 */
function initTechnicianAssignmentTab() {
    // Get the printer management tabs container
    const tabsContainer = document.querySelector('.tabs');
    
    if (!tabsContainer) return;
    
    // Add the technician assignments tab
    const technicianTab = document.createElement('button');
    technicianTab.className = 'tab-btn px-4 py-2 text-slate-600 hover:text-blue-600';
    technicianTab.textContent = 'Technician Assignments';
    technicianTab.dataset.tab = 'technician-assignments';
    tabsContainer.appendChild(technicianTab);
    
    // Create the technician assignments tab content
    const tabContentsContainer = document.querySelector('.tab-contents');
    
    if (!tabContentsContainer) return;
    
    const technicianTabContent = document.createElement('div');
    technicianTabContent.className = 'tab-content hidden';
    technicianTabContent.id = 'technician-assignments-content';
    technicianTabContent.innerHTML = `
        <div class="p-4">
            <div class="mb-4">
                <h3 class="text-xl font-semibold text-slate-800">Printer Technician Assignments</h3>
                <p class="text-slate-500 text-sm">View technicians assigned to your institution's printers</p>
            </div>
            
            <div class="bg-white rounded-lg shadow p-4 mb-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h4 class="font-medium text-slate-700">Current Assignments</h4>
                        <p class="text-sm text-slate-500">Each printer is assigned to a specific technician</p>
                    </div>
                    <div>
                        <span class="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                            <i class="fas fa-info-circle mr-1"></i> Only admins can change assignments
                        </span>
                    </div>
                </div>
                
                <div class="overflow-x-auto mt-4">
                    <table class="min-w-full bg-white" id="technician-assignments-table">
                        <thead class="bg-slate-100 text-slate-700">
                            <tr>
                                <th class="py-3 px-4 text-left text-sm font-medium">Printer ID</th>
                                <th class="py-3 px-4 text-left text-sm font-medium">Printer Model</th>
                                <th class="py-3 px-4 text-left text-sm font-medium">Location</th>
                                <th class="py-3 px-4 text-left text-sm font-medium">Assigned Technician</th>
                                <th class="py-3 px-4 text-left text-sm font-medium">Last Serviced</th>
                            </tr>
                        </thead>
                        <tbody id="technician-assignments-table-body" class="text-sm">
                            <tr>
                                <td colspan="5" class="py-4 px-4 text-center text-slate-500">
                                    <div class="flex items-center justify-center">
                                        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                                        Loading assignments...
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="fas fa-lightbulb text-yellow-400"></i>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-yellow-800">Need a different technician?</h3>
                        <div class="mt-2 text-sm text-yellow-700">
                            <p>If you need a specific technician or have issues with current assignments, please contact your admin.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    tabContentsContainer.appendChild(technicianTabContent);
    
    // Fetch technician assignment data
    fetchTechnicianAssignments();
}

/**
 * Fetch technician assignments for printers from the API
 */
function fetchTechnicianAssignments() {
    // In a real implementation, this would call the API to get the technician assignments
    // For now, we'll simulate the API call with a timeout
    setTimeout(() => {
        const assignmentData = [
            { 
                printerId: "PR-1001", 
                model: "HP LaserJet Pro M404", 
                location: "Main Office - Floor 1", 
                technician: { id: 1, name: "John Smith" }, 
                lastServiced: "2023-10-15" 
            },
            { 
                printerId: "PR-1002", 
                model: "Canon ImageCLASS MF743Cdw", 
                location: "Main Office - Floor 2", 
                technician: { id: 1, name: "John Smith" }, 
                lastServiced: "2023-11-03" 
            },
            { 
                printerId: "PR-1003", 
                model: "Epson WorkForce Pro WF-C5790", 
                location: "Engineering Department", 
                technician: { id: 2, name: "Maria Garcia" }, 
                lastServiced: "2023-09-27" 
            },
            { 
                printerId: "PR-1004", 
                model: "Brother MFC-L8900CDW", 
                location: "Marketing Department", 
                technician: { id: 2, name: "Maria Garcia" }, 
                lastServiced: null 
            }
        ];
        
        renderTechnicianAssignments(assignmentData);
    }, 1500);
}

/**
 * Render the technician assignments table
 * @param {Array} assignments - Array of printer-technician assignment objects
 */
function renderTechnicianAssignments(assignments) {
    const tableBody = document.getElementById('technician-assignments-table-body');
    
    if (!tableBody) return;
    
    if (assignments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 px-4 text-center text-slate-500">
                    No technician assignments found
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    assignments.forEach(assignment => {
        html += `
            <tr class="border-b border-slate-200 hover:bg-slate-50">
                <td class="py-3 px-4 font-medium">${assignment.printerId}</td>
                <td class="py-3 px-4">${assignment.model}</td>
                <td class="py-3 px-4">${assignment.location}</td>
                <td class="py-3 px-4">
                    <div class="flex items-center">
                        <span class="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        <span>${assignment.technician.name}</span>
                    </div>
                </td>
                <td class="py-3 px-4">
                    ${assignment.lastServiced ? formatDate(assignment.lastServiced) : '<span class="text-slate-400">Not serviced yet</span>'}
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

/**
 * Add the technician column to the printer table in the printer management tab
 */
function addTechnicianColumnToPrinterTable() {
    // Check if the printers table exists
    const printersTableHead = document.querySelector('#printers-table thead tr');
    
    if (!printersTableHead) {
        // Table might be created dynamically, so we'll add a mutation observer
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    const newTable = document.querySelector('#printers-table thead tr');
                    if (newTable) {
                        addTechnicianColumnToTable(newTable);
                        observer.disconnect();
                        break;
                    }
                }
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        return;
    }
    
    addTechnicianColumnToTable(printersTableHead);
}

/**
 * Add the technician column to a specific printer table header
 * @param {HTMLElement} tableHead - The table head row element
 */
function addTechnicianColumnToTable(tableHead) {
    // Create the header cell
    const th = document.createElement('th');
    th.className = 'py-3 px-4 text-left text-sm font-medium';
    th.textContent = 'Assigned Technician';
    
    // Insert before the actions column (usually the last column)
    const lastChild = tableHead.lastElementChild;
    tableHead.insertBefore(th, lastChild);
    
    // Now add the technician data to each row
    const tableBody = document.querySelector('#printers-table tbody');
    if (!tableBody) return;
    
    // Observe changes to the table body to add technician cells to new rows
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeName === 'TR') {
                        addTechnicianCellToRow(node);
                    }
                }
            }
        }
    });
    
    observer.observe(tableBody, { childList: true });
    
    // Add to existing rows
    tableBody.querySelectorAll('tr').forEach(row => {
        addTechnicianCellToRow(row);
    });
}

/**
 * Add a technician cell to a printer table row
 * @param {HTMLElement} row - The table row element
 */
function addTechnicianCellToRow(row) {
    // Get the printer ID from the row (first cell usually contains the ID)
    const printerId = row.cells[0]?.textContent.trim();
    
    if (!printerId) return;
    
    // Create the technician cell
    const td = document.createElement('td');
    td.className = 'py-3 px-4';
    td.dataset.printerId = printerId;
    
    // Set loading state initially
    td.innerHTML = `<div class="flex items-center">
        <span class="w-2 h-2 rounded-full bg-slate-300 animate-pulse mr-2"></span>
        <span class="text-slate-400">Loading...</span>
    </div>`;
    
    // Insert before the actions cell (usually the last cell)
    const lastChild = row.lastElementChild;
    row.insertBefore(td, lastChild);
    
    // Fetch technician data for this printer
    fetchTechnicianForPrinter(printerId, td);
}

/**
 * Fetch technician data for a specific printer
 * @param {string} printerId - The printer ID
 * @param {HTMLElement} cell - The table cell to update
 */
function fetchTechnicianForPrinter(printerId, cell) {
    // In a real implementation, this would call the API to get the technician for this printer
    // For now, we'll simulate the API call with a timeout and mock data
    setTimeout(() => {
        // Mock data - in real app, this would come from the API
        const techData = {
            "PR-1001": { id: 1, name: "John Smith" },
            "PR-1002": { id: 1, name: "John Smith" },
            "PR-1003": { id: 2, name: "Maria Garcia" },
            "PR-1004": { id: 2, name: "Maria Garcia" },
            "PR-1005": null
        };
        
        const technician = techData[printerId] || null;
        
        if (technician) {
            cell.innerHTML = `
                <div class="flex items-center">
                    <span class="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    <span>${technician.name}</span>
                </div>
            `;
        } else {
            cell.innerHTML = `
                <div class="flex items-center">
                    <span class="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                    <span class="text-slate-500">No technician assigned</span>
                </div>
            `;
        }
    }, 800);
}

/**
 * Format a date string to a more readable format
 * @param {string} dateString - The date string to format
 * @returns {string} The formatted date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}









