# Data Dictionary

## Table 1. Arm Analysis Cache Data Dictionary

### Arm Analysis Cache

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique analysis cache ID | INT | 999 | 1–∞ | Y | PK |  |
| printer_brand | Printer brand for analysis | VARCHAR(255) | Xxxxxxxxx |  | N |  |  |
| printer_model | Printer model for analysis | VARCHAR(255) | Xxxxxxxxx |  | N |  |  |
| analysis_data | JSON data for analysis | JSON | {"key":"value"} |  | N |  |  |
| created_at | Cache creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |

## Table 2. Audit Logs Data Dictionary

### Audit Logs

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique audit log ID | INT | 999 | 1–∞ | Y | PK |  |
| user_id | ID of the user who performed the action | INT | 999 | 1–∞ | Y | FK | users |
| user_role | Role of the user | ENUM | admin/technician/operations_officer |  | Y |  |  |
| action | Description of the action | VARCHAR(255) | Xxxxxxxxx |  | Y |  |  |
| action_type | Type of action | ENUM | create/read/update/delete/login/logout/approve/reject/assign/complete/activate/deactivate/other |  | Y |  |  |
| target_type | Type of target | VARCHAR(100) | Xxxxxxxxx |  | N |  |  |
| target_id | ID of the target | VARCHAR(100) | Xxxxxxxxx |  | N |  |  |
| details | Additional details | TEXT | Xxxxxxxxx |  | N |  |  |
| ip_address | IP address of the user | VARCHAR(45) | 192.168.1.1 |  | N |  |  |
| user_agent | User agent string | TEXT | Mozilla/5.0... |  | N |  |  |
| created_at | Timestamp of the action | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |

## Table 3. Institution Printer Assignments Data Dictionary

### Institution Printer Assignments

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK |  |
| institution_id | Institution identifier | VARCHAR(50) | INST-001 |  | Y | FK | institutions |
| printer_id | Printer ID | INT | 999 | 1–∞ | Y | FK | printers |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| status | Assignment status | ENUM | assigned/unassigned |  | Y |  |  |
| unassigned_at | Unassignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |

## Table 4. Institutions Data Dictionary

### Institutions

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique institution ID | INT | 999 | 1–∞ | Y | PK |  |
| institution_id | Institution identifier | VARCHAR(50) | INST-001 |  | Y |  |  |
| user_id | Associated user ID | INT | 999 | 1–∞ | N | FK | users |
| name | Institution name | VARCHAR(100) | Xxxxxxxxx |  | Y |  |  |
| type | Institution type | VARCHAR(50) | public_school |  | Y |  |  |
| address | Institution address | TEXT | Xxxxxxxxx |  | Y |  |  |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| status | Institution status | ENUM | active/deactivated |  | N |  |  |
| deactivated_at | Deactivation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |

## Table 5. Users Data Dictionary

### Users

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique user ID | INT | 999 | 1–∞ | Y | PK |  |
| first_name | User first name | VARCHAR(50) | Xxxxxxxxx |  | Y |  |  |
| last_name | User last name | VARCHAR(50) | Xxxxxxxxx |  | Y |  |  |
| email | User email address | VARCHAR(100) | xxx@xx.com |  | Y |  |  |
| password | Encrypted password | VARCHAR(255) | **** |  | Y |  |  |
| role | User role | ENUM | admin/institution_admin/operations_officer/technician/institution_user |  | Y |  |  |
| is_email_verified | Email verification status | TINYINT(1) | 0/1 |  | N |  |  |
| status | Account status | ENUM | active/inactive |  | N |  |  |
| created_at | Account creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| updated_at | Account update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| approval_status | Account approval status | ENUM | pending/approved/rejected |  | N |  |  |
| approved_by | User who approved account | INT | 999 |  | N | FK | users |
| approved_at | Approval timestamp | DATETIME | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| token_version | Token version for session invalidation | INT | 999 |  | N |  |  |
| must_change_password | Password change requirement flag | TINYINT(1) | 0/1 |  | N |  |  |

## Table 6. Items Request Data Dictionary

### Items Request

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique request ID | INT | 999 | 1–∞ | Y | PK |  |
| item_id | Requested item ID | INT | 999 | 1–∞ | Y | FK | printer_items |
| technician_id | Requesting technician ID | INT | 999 | 1–∞ | Y | FK | users |
| quantity_requested | Quantity requested | INT | 999 | 1–∞ | Y |  |  |
| reason | Reason for request | TEXT | Xxxxxxxxx |  | Y |  |  |
| priority | Request priority | ENUM | low/medium/high/urgent |  | N |  |  |
| status | Request status | ENUM | pending/approved/denied |  | N |  |  |
| admin_response | Admin response | TEXT | Xxxxxxxxx |  | N |  |  |
| approved_by | Approving admin ID | INT | 999 | 1–∞ | N | FK | users |
| approved_at | Approval timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| created_at | Request creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| updated_at | Request update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| stock_at_approval | Stock quantity at approval | INT | 999 | 0–∞ | N |  |  |

## Table 7. Maintenance Services Data Dictionary

### Maintenance Services

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique service ID | INT | 999 | 1–∞ | Y | PK |  |
| technician_id | Technician ID | INT | 999 | 1–∞ | Y | FK | users |
| printer_id | Printer ID | INT | 999 | 1–∞ | Y | FK | printers |
| institution_id | Institution identifier | VARCHAR(50) | INST-001 |  | Y |  |  |
| service_description | Description of service | TEXT | Xxxxxxxxx |  | Y |  |  |
| completion_photo | URL of completion photo | VARCHAR(500) | https://... |  | N |  |  |
| status | Service status | ENUM | pending/approved/rejected/completed |  | N |  |  |
| created_at | Service creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| completed_at | Service completion timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |

## Table 8. Notifications Data Dictionary

### Notifications

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique notification ID | INT | 999 | 1–∞ | Y | PK |  |
| type | Notification type | VARCHAR(100) | Xxxxxxxxx |  | Y |  |  |
| title | Notification title | VARCHAR(255) | Xxxxxxxxx |  | Y |  |  |
| message | Notification message | TEXT | Xxxxxxxxx |  | Y |  |  |
| user_id | Recipient user ID | INT | 999 | 1–∞ | N |  |  |
| sender_id | Sender user ID | INT | 999 | 1–∞ | N |  |  |
| reference_type | Reference type | VARCHAR(50) | Xxxxxxxxx |  | N |  |  |
| reference_id | Reference ID | VARCHAR(255) | Xxxxxxxxx |  | N |  |  |
| related_user_id | Related user ID | INT | 999 | 1–∞ | N | FK | users |
| related_data | Related JSON data | JSON | {"key":"value"} |  | N |  |  |
| is_read | Read status | TINYINT(1) | 0/1 |  | N |  |  |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| priority | Notification priority | ENUM | low/medium/high/urgent |  | N |  |  |

## Table 9. Password Reset Tokens Data Dictionary

### Password Reset Tokens

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique token ID | INT | 999 | 1–∞ | Y | PK |  |
| user_id | User ID | INT | 999 | 1–∞ | Y | FK | users |
| token | Reset token | VARCHAR(255) | abc123... |  | Y |  |  |
| expires_at | Expiration datetime | DATETIME | YYYY-MM-DD HH:MM:SS |  | Y |  |  |
| used | Token used status | TINYINT(1) | 0/1 |  | N |  |  |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |

## Table 10. Printer Items Data Dictionary

### Printer Items

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique item ID | INT | 999 | 1–∞ | Y | PK |  |
| name | Item name | VARCHAR(255) | Xxxxxxxxx |  | Y |  |  |
| brand | Item brand | VARCHAR(255) | Xxxxxxxxx |  | N |  |  |
| category | Item category | ENUM | toner/drum/fuser/roller/ink/ink-bottle/printhead/transfer-belt/maintenance-unit/power-board/mainboard/drum-cartridge/maintenance-box/other/other-consumable/paper/paper-a4/paper-a3/cleaning-supplies/tools/cables/batteries/lubricants/replacement-parts/software/labels |  | Y |  |  |
| item_type | Item type | ENUM | consumable/printer_part |  | N |  |  |
| quantity | Current quantity | INT | 999 | 0–∞ | Y |  |  |
| minimum_stock | Minimum stock level | INT | 999 | 0–∞ | N |  |  |
| status | Stock status | ENUM | in_stock/low_stock/out_of_stock |  | Y |  |  |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| is_universal | Universal compatibility flag | TINYINT(1) | 0/1 |  | N |  |  |
| unit | Unit of measurement | VARCHAR(50) | pieces |  | N |  |  |
| page_yield | Approximate page yield | INT | 999 | 0–∞ | N |  |  |
| ink_volume | Ink volume in ml | DECIMAL(10,2) | 99.99 | 0–∞ | N |  |  |
| toner_weight | Toner weight in grams | DECIMAL(10,2) | 99.99 | 0–∞ | N |  |  |
| color | Item color | VARCHAR(50) | black |  | N |  |  |

## Table 11. Printers Data Dictionary

### Printers

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique printer ID | INT | 999 | 1–∞ | Y | PK |  |
| category | Printer category | ENUM | printer |  | Y |  |  |
| name | Printer name | VARCHAR(255) | Xxxxxxxxx |  | Y |  |  |
| brand | Printer brand | VARCHAR(255) | Xxxxxxxxx |  | N |  |  |
| model | Printer model | VARCHAR(255) | Xxxxxxxxx |  | N |  |  |
| serial_number | Serial number | VARCHAR(255) | ABCD1234 |  | N |  |  |
| quantity | Quantity | INT | 999 | 1–∞ | Y |  |  |
| location | Location | VARCHAR(255) | Xxxxxxxxx |  | N |  |  |
| department | Department | VARCHAR(255) | Xxxxxxxxx |  | N |  |  |
| status | Printer status | ENUM | available/assigned/retired |  | Y |  |  |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |

## Table 12. Service Approvals Data Dictionary

### Service Approvals

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique approval ID | INT | 999 | 1–∞ | Y | PK |  |
| service_id | Service ID | INT | 999 | 1–∞ | Y |  |  |
| status | Approval status | ENUM | pending_approval/approved/rejected/revision_requested |  | Y |  |  |
| approved_by | Approver user ID | INT | 999 | 1–∞ | N | FK | users |
| technician_notes | Technician notes | TEXT | Xxxxxxxxx |  | N |  |  |
| institution_admin_notes | Admin notes | TEXT | Xxxxxxxxx |  | N |  |  |
| submitted_at | Submission timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| reviewed_at | Review timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| service_type | Service type | ENUM | service_request/maintenance_service |  | Y |  |  |

## Table 13. Service Items Used Data Dictionary

### Service Items Used

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique usage ID | INT | 999 | 1–∞ | Y | PK |  |
| service_id | Service ID | INT | 999 | 1–∞ | Y |  |  |
| service_type | Service type | ENUM | service_request/maintenance_service |  | N |  |  |
| item_id | Used item ID | INT | 999 | 1–∞ | Y | FK | printer_items |
| quantity_used | Quantity used | INT | 999 | 1–∞ | Y |  |  |
| consumption_type | Consumption type | ENUM | full/partial |  | N |  |  |
| amount_consumed | Amount consumed | DECIMAL(10,2) | 99.99 | 0–∞ | N |  |  |
| notes | Usage notes | VARCHAR(500) | Xxxxxxxxx |  | N |  |  |
| used_by | User who used item | INT | 999 | 1–∞ | Y | FK | users |
| used_at | Usage timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |

## Table 14. Service Request History Data Dictionary

### Service Request History

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique history ID | INT | 999 | 1–∞ | Y | PK |  |
| service_request_id | Service request ID | INT | 999 | 1–∞ | Y | FK | service_requests |
| changed_by | User who made change | INT | 999 | 1–∞ | Y | FK | users |
| old_status | Previous status | ENUM | pending/in_progress/completed/cancelled |  | Y |  |  |
| new_status | New status | ENUM | pending/in_progress/completed/cancelled |  | Y |  |  |
| change_reason | Reason for change | TEXT | Xxxxxxxxx |  | N |  |  |
| changed_at | Change timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |

## Table 15. Service Requests Data Dictionary

### Service Requests

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique request ID | INT | 999 | 1–∞ | Y | PK |  |
| institution_id | Institution identifier | VARCHAR(50) | INST-001 |  | Y |  |  |
| institution_user_id | Requesting user ID | INT | 999 | 1–∞ | Y | FK | users |
| technician_id | Assigned technician ID | INT | 999 | 1–∞ | N | FK | users |
| printer_id | Printer ID | INT | 999 | 1–∞ | Y | FK | printers |
| issue_description | Issue description | TEXT | Xxxxxxxxx |  | Y |  |  |
| priority | Request priority | ENUM | low/medium/high/urgent |  | Y |  |  |
| status | Request status | ENUM | pending/in_progress/completed/cancelled |  | Y |  |  |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| completed_at | Completion timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |

## Table 16. Technician Assignments Data Dictionary

### Technician Assignments

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK |  |
| technician_id | Technician ID | INT | 999 | 1–∞ | Y | FK | users |
| institution_id | Institution identifier | VARCHAR(50) | INST-001 |  | Y |  |  |
| assigned_by | User who assigned | INT | 999 | 1–∞ | Y | FK | users |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |
| status | Assignment status | ENUM | active/inactive |  | Y |  |  |
| unassigned_at | Unassignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |

## Table 17. Technician Inventory Data Dictionary

### Technician Inventory

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique inventory ID | INT | 999 | 1–∞ | Y | PK |  |
| technician_id | Technician ID | INT | 999 | 1–∞ | Y | FK | users |
| item_id | Item ID | INT | 999 | 1–∞ | Y | FK | printer_items |
| quantity_assigned | Assigned quantity | INT | 999 | 1–∞ | Y |  |  |
| remaining_volume | Remaining volume | DECIMAL(10,2) | 99.99 | 0–∞ | N |  |  |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |
| last_updated | Last update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |
| status | Inventory status | ENUM | active/returned |  | Y |  |  |

## Table 18. Temp User Photos Data Dictionary

### Temp User Photos

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique photo ID | INT | 999 | 1–∞ | Y | PK |  |
| user_id | User ID | INT | 999 | 1–∞ | Y | FK | users |
| photo_url | Photo URL | VARCHAR(500) | https://... |  | Y |  |  |
| uploaded_at | Upload timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |
| expires_at | Expiration timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |

## Table 19. User Printer Assignments Data Dictionary

### User Printer Assignments

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK |  |
| user_id | User ID | INT | 999 | 1–∞ | Y | FK | users |
| printer_id | Printer ID | INT | 999 | 1–∞ | Y | FK | printers |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |
| status | Assignment status | ENUM | active/inactive |  | Y |  |  |
| unassigned_at | Unassignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | N |  |  |

## Table 20. Verification Tokens Data Dictionary

### Verification Tokens

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|---------|---------------------|
| id | Unique token ID | INT | 999 | 1–∞ | Y | PK |  |
| user_id | User ID | INT | 999 | 1–∞ | Y | FK | users |
| token | Verification token | VARCHAR(255) | abc123... |  | Y |  |  |
| expires_at | Expiration timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |
| used | Token used status | TINYINT(1) | 0/1 |  | Y |  |  |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS |  | Y |  |  |