# ServiceEase - Corrected Data Dictionary

**Note:** This data dictionary is based on the actual database structure from `serviceease_workbench_export.sql`

---

## Table 1. Users Data Dictionary

**Table Name:** `users`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique user ID | INT | 999 | 1–∞ | Y | PK | |
| first_name | User first name | VARCHAR(50) | Xxxxxxxxx | | Y | | |
| last_name | User last name | VARCHAR(50) | Xxxxxxxxx | | Y | | |
| email | User email address | VARCHAR(100) | xxx@xx.com | | Y | | |
| password | Encrypted password | VARCHAR(255) | **** | | Y | | |
| role | User role | ENUM | admin/institution_admin/operations_officer/technician/institution_user | | Y | | |
| is_email_verified | Email verification status | TINYINT(1) | 0/1 | | N | | |
| status | Account status | ENUM | active/inactive | | N | | |
| created_at | Account creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Account update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| approval_status | Account approval status | ENUM | pending/approved/rejected | | N | | |
| approved_by | User who approved account | INT | 999 | | N | FK | users |
| approved_at | Approval timestamp | DATETIME | YYYY-MM-DD HH:MM:SS | | N | | |
| token_version | Token version for session invalidation | INT | 999 | | N | | |
| must_change_password | Temporary password flag | TINYINT(1) | 0/1 | | N | | |

---

## Table 2. Institutions Data Dictionary

**Table Name:** `institutions`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Auto-increment ID | INT | 999 | 1–∞ | Y | PK | |
| institution_id | Unique institution identifier | VARCHAR(50) | INST-XXX | | Y | UNIQUE | |
| user_id | Institution admin user ID | INT | 999 | | N | FK | users |
| name | Institution name | VARCHAR(100) | Xxxxxxxxx | | Y | | |
| type | Institution type | VARCHAR(50) | Xxxxxxxxx | | Y | | |
| address | Institution address | TEXT | Xxxxxxxxx | | Y | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| status | Institution status | ENUM | active/deactivated | | N | | |
| deactivated_at | Deactivation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 3. Printers Data Dictionary

**Table Name:** `printers`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique printer ID | INT | 999 | 1–∞ | Y | PK | |
| category | Printer category | ENUM | printer | | Y | | |
| name | Printer name | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| brand | Printer brand | VARCHAR(255) | Xxxxxxxxx | | N | | |
| model | Printer model | VARCHAR(255) | Xxxxxxxxx | | N | | |
| serial_number | Serial number | VARCHAR(255) | SN-XXXXXX | | N | UNIQUE | |
| quantity | Available quantity | INT | 99 | 0–∞ | Y | | |
| location | Storage location | VARCHAR(255) | Xxxxxxxxx | | N | | |
| status | Printer status | ENUM | available/assigned/retired | | Y | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 4. Institution Printer Assignments Data Dictionary

**Table Name:** `institution_printer_assignments`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Assignment ID | INT | 999 | 1–∞ | Y | PK | |
| institution_id | Assigned institution | VARCHAR(50) | INST-XXX | | Y | FK | institutions |
| printer_id | Assigned printer | INT | 999 | | Y | FK | printers |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| status | Assignment status | ENUM | assigned/unassigned | | Y | | |
| unassigned_at | Unassignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 5. User Printer Assignments Data Dictionary

**Table Name:** `user_printer_assignments`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Assignment ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | Assigned user | INT | 999 | | Y | FK | users |
| printer_id | Assigned printer | INT | 999 | | Y | FK | printers |
| institution_id | Related institution | VARCHAR(50) | INST-XXX | | N | | |
| department | Department | VARCHAR(100) | Xxxxxxxxx | | N | | |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 6. Service Requests Data Dictionary

**Table Name:** `service_requests`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique request ID | INT | 999 | 1–∞ | Y | PK | |
| request_number | Request number | VARCHAR(255) | SR-YYYY-XXXX | | N | UNIQUE | |
| institution_id | Related institution | VARCHAR(50) | INST-XXX | | N | FK | institutions |
| requested_by | Requesting user | INT | 999 | | N | FK | users |
| technician_id | Assigned technician | INT | 999 | | N | FK | users |
| priority | Request priority | ENUM | urgent/high/medium/low/scheduled | | Y | | |
| status | Request status | ENUM | pending/assigned/in_progress/pending_approval/completed/cancelled | | Y | | |
| location | Issue location | VARCHAR(255) | Xxxxxxxxx | | N | | |
| description | Problem description | TEXT | Xxxxxxxxx | | Y | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| printer_id | Related printer | INT | 999 | | N | FK | printers |
| started_at | Work start timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| completed_at | Completion timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| resolution_notes | Resolution details | TEXT | Xxxxxxxxx | | N | | |
| completion_photo_url | Completion photo URL | VARCHAR(500) | https://... | | N | | |
| walk_in_customer_name | Walk-in customer name | VARCHAR(255) | Xxxxxxxxx | | N | | |
| printer_brand | Printer brand (walk-in) | VARCHAR(100) | Xxxxxxxxx | | N | | |
| is_walk_in | Walk-in request flag | TINYINT(1) | 0/1 | | N | | |

---

## Table 7. Service Approvals Data Dictionary

**Table Name:** `service_approvals`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Approval ID | INT | 999 | 1–∞ | Y | PK | |
| service_request_id | Related service request | INT | 999 | | Y | FK | service_requests |
| status | Approval status | ENUM | pending_approval/approved/rejected/revision_requested | | Y | | |
| institution_admin_id | Approving institution admin | INT | 999 | | N | FK | users |
| technician_notes | Technician notes | TEXT | Xxxxxxxxx | | N | | |
| institution_admin_notes | Institution admin notes | TEXT | Xxxxxxxxx | | N | | |
| submitted_at | Submission timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| reviewed_at | Review timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 8. Service Parts Used Data Dictionary

**Table Name:** `service_parts_used`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Parts usage ID | INT | 999 | 1–∞ | Y | PK | |
| service_request_id | Related service request | INT | 999 | | Y | FK | service_requests |
| part_id | Used part | INT | 999 | | Y | FK | printer_parts |
| quantity_used | Quantity used | INT | 99 | | Y | | |
| notes | Usage notes | VARCHAR(500) | Xxxxxxxxx | | N | | |
| used_by | User who used parts | INT | 999 | | Y | FK | users |
| used_at | Usage timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 9. Service Request History Data Dictionary

**Table Name:** `service_request_history`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | History entry ID | INT | 999 | 1–∞ | Y | PK | |
| request_id | Related service request | INT | 999 | | Y | FK | service_requests |
| previous_status | Previous status | VARCHAR(50) | Xxxxxxxxx | | Y | | |
| new_status | New status | VARCHAR(50) | Xxxxxxxxx | | Y | | |
| changed_by | User who changed status | INT | 999 | | N | FK | users |
| notes | Change notes | TEXT | Xxxxxxxxx | | N | | |
| created_at | Change timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 10. Printer Parts Data Dictionary

**Table Name:** `printer_parts`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Part ID | INT | 999 | 1–∞ | Y | PK | |
| name | Part name | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| brand | Part brand | VARCHAR(100) | Xxxxxxxxx | | N | | |
| category | Part category | ENUM | toner/drum/roller/fuser/maintenance_kit/other | | Y | | |
| item_type | Item type | ENUM | printer_part/supply/accessory | | N | | |
| quantity | Available quantity | INT | 999 | 0–∞ | Y | | |
| minimum_stock | Minimum stock level | INT | 99 | | N | | |
| status | Part status | ENUM | in_stock/low_stock/out_of_stock | | Y | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| is_universal | Universal part flag | TINYINT(1) | 0/1 | | N | | |
| unit | Measurement unit | VARCHAR(50) | pieces/mL | | N | | |

---

## Table 11. Parts Requests Data Dictionary

**Table Name:** `parts_requests`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Request ID | INT | 999 | 1–∞ | Y | PK | |
| part_id | Requested part | INT | 999 | | Y | FK | printer_parts |
| technician_id | Requesting technician | INT | 999 | | Y | FK | users |
| quantity_requested | Requested quantity | INT | 99 | | Y | | |
| reason | Request reason | TEXT | Xxxxxxxxx | | Y | | |
| priority | Request priority | ENUM | low/medium/high/urgent | | N | | |
| status | Request status | ENUM | pending/approved/rejected | | N | | |
| admin_response | Admin response | TEXT | Xxxxxxxxx | | N | | |
| approved_by | Approving user | INT | 999 | | N | FK | users |
| approved_at | Approval timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 12. Technician Assignments Data Dictionary

**Table Name:** `technician_assignments`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Assignment ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Assigned technician | INT | 999 | | Y | FK | users |
| institution_id | Assigned institution | VARCHAR(50) | INST-XXX | | Y | FK | institutions |
| assigned_by | Assigning user | INT | 999 | | Y | FK | users |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| is_active | Active status | TINYINT(1) | 0/1 | | N | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 13. Technician Inventory Data Dictionary

**Table Name:** `technician_inventory`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Inventory entry ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Assigned technician | INT | 999 | | Y | FK | users |
| part_id | Assigned part | INT | 999 | | Y | FK | printer_parts |
| quantity | Assigned quantity | INT | 99 | | Y | | |
| assigned_by | Assigning user | INT | 999 | | N | FK | users |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| last_updated | Last update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| notes | Assignment notes | TEXT | Xxxxxxxxx | | N | | |

---

## Table 14. Maintenance Services Data Dictionary

**Table Name:** `maintenance_services`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Service ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Performing technician | INT | 999 | | Y | FK | users |
| printer_id | Related printer | INT | 999 | | Y | FK | printers |
| institution_id | Related institution | VARCHAR(50) | INST-XXX | | Y | FK | institutions |
| service_description | Service description | TEXT | Xxxxxxxxx | | Y | | |
| parts_used | Parts used | TEXT | Xxxxxxxxx | | N | | |
| completion_photo | Completion photo URL | VARCHAR(500) | https://... | | N | | |
| status | Service status | ENUM | pending/approved/rejected/completed | | N | | |
| approved_by_user_id | Approving user (institution admin/user) | INT | 999 | | N | FK | users |
| approval_notes | Approval notes | TEXT | Xxxxxxxxx | | N | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| approved_at | Approval timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| completed_at | Completion timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 15. Audit Logs Data Dictionary

**Table Name:** `audit_logs`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Log entry ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | Acting user | INT | 999 | | Y | FK | users |
| user_role | User role at time | ENUM | admin/technician/operations_officer | | Y | | |
| action | Action performed | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| action_type | Action type | ENUM | create/read/update/delete/login/logout/approve/reject/assign/complete/activate/deactivate/other | | Y | | |
| target_type | Target type | VARCHAR(100) | Xxxxxxxxx | | N | | |
| target_id | Target ID | VARCHAR(100) | Xxxxxxxxx | | N | | |
| details | Action details | TEXT | Xxxxxxxxx | | N | | |
| ip_address | User IP address | VARCHAR(45) | XXX.XXX.XXX.XXX | | N | | |
| user_agent | User agent string | TEXT | Xxxxxxxxx | | N | | |
| created_at | Log timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 16. Notifications Data Dictionary

**Table Name:** `notifications`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Notification ID | INT | 999 | 1–∞ | Y | PK | |
| type | Notification type | VARCHAR(50) | Xxxxxxxxx | | Y | | |
| title | Notification title | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| message | Notification message | TEXT | Xxxxxxxxx | | Y | | |
| user_id | Target user | INT | 999 | | N | FK | users |
| sender_id | Sending user | INT | 999 | | N | FK | users |
| reference_type | Reference type | VARCHAR(100) | Xxxxxxxxx | | N | | |
| reference_id | Reference ID | VARCHAR(50) | Xxxxxxxxx | | N | | |
| related_user_id | Related user | INT | 999 | | N | FK | users |
| related_data | Related data | JSON | {...} | | N | | |
| is_read | Read status | TINYINT(1) | 0/1 | | N | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| priority | Notification priority | ENUM | low/medium/high | | N | | |

---

## Table 17. Password Reset Tokens Data Dictionary

**Table Name:** `password_reset_tokens`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Token ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User | INT | 999 | | Y | FK | users |
| token | Reset token | VARCHAR(255) | Xxxxxxxxx | | Y | UNIQUE | |
| expires_at | Expiration timestamp | DATETIME | YYYY-MM-DD HH:MM:SS | | Y | | |
| used | Used status | TINYINT(1) | 0/1 | | N | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 18. Verification Tokens Data Dictionary

**Table Name:** `verification_tokens`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Token ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User | INT | 999 | | N | FK | users |
| token | Verification token | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| code | Verification code | VARCHAR(10) | XXXXXXXXXX | | N | | |
| type | Token type | ENUM | email_verification/password_reset | | Y | | |
| expires_at | Expiration timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | Y | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 19. Temp User Photos Data Dictionary

**Table Name:** `temp_user_photos`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Photo ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User | INT | 999 | | Y | FK (UNIQUE) | users |
| front_id_photo | Front ID photo URL | VARCHAR(500) | https://... | | N | | |
| back_id_photo | Back ID photo URL | VARCHAR(500) | https://... | | N | | |
| selfie_photo | Selfie photo URL | VARCHAR(500) | https://... | | N | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| expires_at | Expiration timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 20. ARM Analysis Cache Data Dictionary

**Table Name:** `arm_analysis_cache`

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Cache entry ID | INT | 999 | 1–∞ | Y | PK | |
| printer_brand | Printer brand | VARCHAR(255) | Xxxxxxxxx | | N | | |
| printer_model | Printer model | VARCHAR(255) | Xxxxxxxxx | | N | | |
| analysis_data | Analysis data | JSON | {...} | | N | | |
| created_at | Creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Key Corrections Made:

1. ✅ **Removed "inventory_items"** → Replaced with **"printers"**
2. ✅ **Renamed "voluntary_services"** → **"maintenance_services"**
3. ✅ **Fixed user roles:** coordinator → institution_admin, requester → institution_user
4. ✅ **Fixed column names:** requested_by_user_id → requested_by, coordinator_id → institution_admin_id
5. ✅ **Added missing columns:** completion_photo_url, is_walk_in, walk_in_customer_name, must_change_password
6. ✅ **Fixed ENUM values** to match actual database
7. ✅ **Added proper foreign key references**
8. ✅ **Removed non-existent columns** (email_verified_at, resolved_by, resolved_at)
9. ✅ **Updated table structure** to match serviceease_workbench_export.sql exactly

**Total Tables: 20** (matching your actual database)
