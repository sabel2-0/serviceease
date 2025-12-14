# ServiceEase Database - Complete Data Dictionary

**Database:** railway  
**Server Version:** MySQL 9.4.0  
**Export Date:** December 14, 2025  
**Total Tables:** 21

**Important Note:** The `inventory_items` table is a legacy empty table. The system was migrated to use the `printers` table instead. However, the API endpoints still use `/api/inventory-items` for backward compatibility while querying the `printers` table.

---

## Table 1. ARM Analysis Cache
**arm_analysis_cache**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique cache record ID | INT | 999 | 1–∞ | Y | PK | |
| printer_brand | Printer brand name | VARCHAR(255) | Xxxx | | N | | |
| printer_model | Printer model name | VARCHAR(255) | Xxxx | | N | | |
| analysis_data | ARM analysis results (JSON) | JSON | {...} | | N | | |
| created_at | Cache creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 2. Audit Logs
**audit_logs**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique audit log ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User who performed action | INT | 999 | | Y | FK | users |
| user_role | Role of user | ENUM | admin/technician/operations_officer | | Y | | |
| action | Description of action | VARCHAR(255) | Xxxx | | Y | | |
| action_type | Type of action performed | ENUM | create/read/update/delete/login/logout/approve/reject/assign/complete/activate/deactivate/other | | Y | | |
| target_type | Type of target affected | VARCHAR(100) | Xxxx | | N | | |
| target_id | ID of target affected | VARCHAR(100) | 999 | | N | | |
| details | Additional action details (text/JSON) | TEXT | Xxxx | | N | | |
| ip_address | IP address of user | VARCHAR(45) | 999.999.999.999 | | N | | |
| user_agent | Browser/client user agent | TEXT | Xxxx | | N | | |
| created_at | Log creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 3. Institution Printer Assignments
**institution_printer_assignments**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK | |
| institution_id | Institution identifier | VARCHAR(50) | INST-999 | | Y | FK | institutions |
| printer_id | Printer identifier | INT | 999 | | Y | FK | printers |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| status | Assignment status | ENUM | assigned/unassigned | | Y | | |
| unassigned_at | Unassignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 4. Institutions
**institutions**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique institution ID (auto-increment) | INT | 999 | 1–∞ | Y | PK | |
| institution_id | Institution identifier code | VARCHAR(50) | INST-999 | | Y | UNIQUE | |
| user_id | Institution admin user ID | INT | 999 | | N | FK | users |
| name | Institution name | VARCHAR(100) | Xxxx | | Y | | |
| type | Type of institution | VARCHAR(50) | public_school/private_school/etc | | Y | | |
| address | Institution physical address | TEXT | Xxxx | | Y | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| status | Institution status | ENUM | active/deactivated | | N | | |
| deactivated_at | Deactivation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 5. Inventory Items
**inventory_items** *(LEGACY TABLE - Empty and unused. Replaced by printers table. Kept for backward compatibility.)*

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique inventory item ID | INT | 999 | 1–∞ | Y | PK | |
| category | Item category | ENUM | printer | | Y | | |
| name | Item name | VARCHAR(255) | Xxxx | | Y | | |
| brand | Item brand | VARCHAR(255) | Xxxx | | N | | |
| model | Item model | VARCHAR(255) | Xxxx | | N | | |
| serial_number | Item serial number | VARCHAR(255) | XXX-999 | | N | UNIQUE | |
| quantity | Quantity | INT | 999 | 1–∞ | Y | | |
| location | Physical location | VARCHAR(255) | Xxxx | | N | | |
| status | Item status | ENUM | available/assigned/retired | | Y | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 6. Maintenance Services
**maintenance_services**
7
| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique service ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Technician who performed service | INT | 999 | | Y | FK | users |
| printer_id | Printer serviced | INT | 999 | | Y | FK | printers |
| institution_id | Institution where service occurred | VARCHAR(50) | INST-999 | | Y | FK | institutions |
| service_description | Description of service performed | TEXT | Xxxx | | Y | | |
| parts_used | JSON array of parts used | TEXT | [{...}] | | N | | |
| completion_photo | Cloudinary photo URL | VARCHAR(500) | https://... | | N | | |
| status | Service status | ENUM | pending/approved/rejected/completed | | N | | |
| approved_by_user_id | User who approved service | INT | 999 | | N | FK | users |
| approval_notes | Approver notes | TEXT | Xxxx | | N | | |
| created_at | Service creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| approved_at | Approval timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| completed_at | Completion timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 6. Notifications
**notifications**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique notification ID | INT | 999 | 1–∞ | Y | PK | |
| type | Notification type | VARCHAR(100) | Xxxx | | Y | | |
| title | Notification title | VARCHAR(255) | Xxxx | | Y | | |
| message | Notification message | TEXT | Xxxx | | Y | | |
| user_id | Recipient user ID | INT | 999 | | N | FK | users |
| sender_id | Sender user ID | INT | 999 | | N | FK | users |
| reference_type | Type of referenced entity | VARCHAR(50) | Xxxx | | N | | |
| reference_id | ID of referenced entity | VARCHAR(255) | 999 | | N | | |
| related_user_id | Related user ID | INT | 999 | | N | FK | users |
| related_data | Additional data (JSON) | JSON | {...} | | N | | |
| is_read | Read status flag | TINYINT(1) | 0/1 | 0–1 | N | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| priority | Notification priority | ENUM | low/medium/high/urgent | | N | | |

---

## Table 8. Parts Requests
**parts_requests**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique request ID | INT | 999 | 1–∞ | Y | PK | |
| part_id | Requested part ID | INT | 999 | | Y | FK | printer_parts |
| technician_id | Requesting technician | INT | 999 | | Y | FK | users |
| quantity_requested | Quantity requested | INT | 999 | 1–∞ | Y | | |
| reason | Reason for request | TEXT | Xxxx | | Y | | |
| priority | Request priority | ENUM | low/medium/high/urgent | | N | | |
| status | Request status | ENUM | pending/approved/denied | | N | | |
| admin_response | Admin response notes | TEXT | Xxxx | | N | | |
| approved_by | Approving admin user ID | INT | 999 | | N | FK | users |
| approved_at | Approval timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| created_at | Request creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Request update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| stock_at_approval | Stock quantity at approval | INT | 999 | | N | | |

---

## Table 9. Password Reset Tokens
**password_reset_tokens**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique token ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User requesting reset | INT | 999 | | Y | FK | users |
| token | Password reset token (hashed) | VARCHAR(255) | Xxxx | | Y | UNIQUE | |
| expires_at | Token expiration timestamp | DATETIME | YYYY-MM-DD HH:MM:SS | | Y | | |
| used | Token used flag | TINYINT(1) | 0/1 | 0–1 | N | | |
| created_at | Token creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 10. Printer Parts and Consumables
**printer_parts** *(Note: Despite the table name, this stores both printer parts AND consumables. The item_type column distinguishes between the two.)*

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique part/consumable ID | INT | 999 | 1–∞ | Y | PK | |
| name | Part or consumable name | VARCHAR(255) | Xxxx | | Y | | |
| brand | Part/consumable brand | VARCHAR(255) | Xxxx | | N | | |
| category | Part/consumable category | ENUM | toner/drum/fuser/roller/ink/ink-bottle/printhead/transfer-belt/maintenance-unit/power-board/mainboard/drum-cartridge/maintenance-box/other/other-consumable/paper/cleaning-supplies/tools/cables/batteries/lubricants/replacement-parts/software/labels | | Y | | |
| item_type | Type classification | ENUM | consumable/printer_part | | N | | |
| quantity | Current stock quantity | INT | 999 | 0–∞ | Y | | |
| minimum_stock | Minimum stock threshold | INT | 999 | | N | | |
| status | Stock status | ENUM | in_stock/low_stock/out_of_stock | | Y | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| is_universal | Universal compatibility flag | TINYINT(1) | 0/1 | 0–1 | N | | |
| unit | Unit of measurement | VARCHAR(50) | pieces/bottles/etc | | N | | |
| page_yield | Approximate page yield | INT | 999 | | N | | |
| ink_volume | Ink volume in milliliters | DECIMAL(10,2) | 999.99 | | N | | |
| color | Ink/toner color | VARCHAR(50) | black/cyan/magenta/yellow | | N | | |

---

## Table 11. Printers
**printers** *(ACTIVE TABLE - Used by all inventory management features. API endpoints use /api/inventory-items but query this table.)*

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique printer ID | INT | 999 | 1–∞ | Y | PK | |
| category | Printer category | ENUM | printer | | Y | | |
| name | Printer name | VARCHAR(255) | Xxxx | | Y | | |
| brand | Printer brand | VARCHAR(255) | Xxxx | | N | | |
| model | Printer model | VARCHAR(255) | Xxxx | | N | | |
| serial_number | Printer serial number | VARCHAR(255) | XXX-999 | | N | UNIQUE | |
| quantity | Quantity (always 1 for printers) | INT | 1 | 1 | Y | | |
| location | Physical location | VARCHAR(255) | Xxxx | | N | | |
| department | Department assignment | VARCHAR(255) | Xxxx | | N | | |
| status | Printer status | ENUM | available/assigned/retired | | Y | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 12. Service Approvals
**service_approvals**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique approval ID | INT | 999 | 1–∞ | Y | PK | |
| service_request_id | Service request being approved | INT | 999 | | Y | FK | service_requests |
| status | Approval status | ENUM | pending_approval/approved/rejected/revision_requested | | Y | | |
| approved_by | User who approved/rejected | INT | 999 | | N | FK | users |
| technician_notes | Notes from technician | TEXT | Xxxx | | N | | |
| institution_admin_notes | Notes from institution admin | TEXT | Xxxx | | N | | |
| submitted_at | Submission timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| reviewed_at | Review timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 13. Service Parts Used
**service_parts_used**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique record ID | INT | 999 | 1–∞ | Y | PK | |
| service_request_id | Service request ID | INT | 999 | | Y | FK | service_requests |
| part_id | Part used | INT | 999 | | Y | FK | printer_parts |
| quantity_used | Quantity of part used | INT | 999 | 1–∞ | Y | | |
| notes | Usage notes | VARCHAR(500) | Xxxx | | N | | |
| used_by | Technician who used part | INT | 999 | | Y | FK | users |
| used_at | Usage timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 14. Service Request History
**service_request_history**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique history record ID | INT | 999 | 1–∞ | Y | PK | |
| request_id | Service request ID | INT | 999 | | Y | FK | service_requests |
| previous_status | Status before change | VARCHAR(50) | Xxxx | | Y | | |
| new_status | Status after change | VARCHAR(50) | Xxxx | | Y | | |
| changed_by | User who changed status | INT | 999 | | N | FK | users |
| notes | Change notes | TEXT | Xxxx | | N | | |
| created_at | History record timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 15. Service Requests
**service_requests**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique request ID | INT | 999 | 1–∞ | Y | PK | |
| request_number | Human-readable request number | VARCHAR(255) | SR-YYYY-9999 | | N | UNIQUE | |
| institution_id | Institution requesting service | VARCHAR(50) | INST-999 | | N | FK | institutions |
| requested_by | User who created request | INT | 999 | | N | FK | users |
| technician_id | Assigned technician | INT | 999 | | N | FK | users |
| priority | Request priority | ENUM | urgent/high/medium/low/scheduled | | Y | | |
| status | Request status | ENUM | pending/assigned/in_progress/pending_approval/completed/cancelled | | Y | | |
| description | Issue description | TEXT | Xxxx | | Y | | |
| created_at | Request creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| printer_id | Printer needing service | INT | 999 | | N | FK | printers |
| started_at | Service start timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| completed_at | Service completion timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| resolution_notes | Technician resolution notes | TEXT | Xxxx | | N | | |
| completion_photo_url | Completion photo URL | VARCHAR(500) | https://... | | N | | |
| walk_in_customer_name | Walk-in customer name | VARCHAR(255) | Xxxx | | N | | |
| printer_brand | Printer brand (for walk-ins) | VARCHAR(100) | Xxxx | | N | | |
| is_walk_in | Walk-in service flag | TINYINT(1) | 0/1 | 0–1 | N | | |

---

## Table 16. Technician Assignments
**technician_assignments**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Assigned technician | INT | 999 | | Y | FK | users |
| institution_id | Assigned institution | VARCHAR(50) | INST-999 | | Y | FK | institutions |
| assigned_by | User who made assignment | INT | 999 | | Y | FK | users |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| is_active | Active assignment flag | TINYINT(1) | 0/1 | 0–1 | N | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 17. Technician Inventory
**technician_inventory**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique inventory record ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Technician owner | INT | 999 | | Y | FK | users |
| part_id | Part in inventory | INT | 999 | | Y | FK | printer_parts |
| quantity | Current quantity | INT | 999 | 0–∞ | Y | | |
| assigned_by | User who assigned parts | INT | 999 | | N | FK | users |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| last_updated | Last update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| notes | Inventory notes | TEXT | Xxxx | | N | | |

---

## Table 18. Temporary User Photos
**temp_user_photos**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique photo record ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User ID | INT | 999 | | Y | UNIQUE FK | users |
| front_id_photo | Front ID photo URL | VARCHAR(255) | https://... | | N | | |
| back_id_photo | Back ID photo URL | VARCHAR(255) | https://... | | N | | |
| selfie_photo | Selfie photo URL | VARCHAR(255) | https://... | | N | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| expires_at | Photo expiration timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 19. User Printer Assignments
**user_printer_assignments**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | Assigned user (institution_user) | INT | 999 | | Y | FK | users |
| printer_id | Assigned printer | INT | 999 | | Y | FK | printers |
| institution_id | Institution context | VARCHAR(50) | INST-999 | | N | | |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 20. Users
**users**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique user ID | INT | 999 | 1–∞ | Y | PK | |
| first_name | User first name | VARCHAR(50) | Xxxx | | Y | | |
| last_name | User last name | VARCHAR(50) | Xxxx | | Y | | |
| email | User email address | VARCHAR(100) | xxx@xx.com | | Y | UNIQUE | |
| password | Encrypted password (bcrypt) | VARCHAR(255) | **** | | Y | | |
| role | User role | ENUM | admin/institution_admin/operations_officer/technician/institution_user | | Y | | |
| is_email_verified | Email verification status | TINYINT(1) | 0/1 | 0–1 | N | | |
| status | Account status | ENUM | active/inactive | | N | | |
| created_at | Account creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Account update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| approval_status | Account approval status | ENUM | pending/approved/rejected | | N | | |
| approved_by | User who approved account | INT | 999 | | N | FK | users |
| approved_at | Approval timestamp | DATETIME | YYYY-MM-DD HH:MM:SS | | N | | |
| token_version | Token version for invalidation | INT | 999 | 0–∞ | N | | |
| must_change_password | Password change requirement flag | TINYINT(1) | 0/1 | 0–1 | N | | |

---

## Table 21. Verification Tokens
**verification_tokens**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique token ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User for verification | INT | 999 | | N | FK | users |
| token | Verification token | VARCHAR(100) | Xxxx | | Y | | |
| code | 6-digit verification code | VARCHAR(6) | 999999 | | N | | |
| type | Token type | ENUM | email/password_reset | | Y | | |
| expires_at | Token expiration timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | Y | | |
| created_at | Token creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Database Relationships Summary

### Primary Foreign Key Relationships:
1. **users** → Multiple tables reference user IDs (approved_by, created_by, assigned_by, etc.)
2. **institutions** → Referenced by service_requests, maintenance_services, technician_assignments
3. **printers** → Referenced by service_requests, institution_printer_assignments, user_printer_assignments
4. **printer_parts** → Referenced by parts_requests, technician_inventory, service_parts_used
5. **service_requests** → Referenced by service_approvals, service_parts_used, service_request_history

### Cascade Delete Rules:
- When a **user** is deleted → audit_logs, parts_requests, verification_tokens cascade delete
- When an **institution** is deleted → institution_printer_assignments, technician_assignments cascade delete
- When a **service_request** is deleted → service_approvals, service_parts_used, service_request_history cascade delete
- When a **printer** is deleted → institution_printer_assignments, user_printer_assignments cascade delete

---

**End of Data Dictionary**
