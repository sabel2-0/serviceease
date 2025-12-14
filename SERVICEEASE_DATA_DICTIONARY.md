# SERVICEEASE SYSTEM - COMPLETE DATA DICTIONARY

## Table 1. Users Data Dictionary

**Users**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
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
| must_change_password | Password change requirement flag | TINYINT(1) | 0/1 | | N | | |

---

## Table 2. Institutions Data Dictionary

**Institutions**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique institution record ID | INT | 999 | 1–∞ | Y | PK | |
| institution_id | Unique institution identifier | VARCHAR(50) | INST-XXX | | Y | | |
| user_id | Associated institution admin user | INT | 999 | | N | FK | users |
| name | Institution name | VARCHAR(100) | Xxxxxxxxx | | Y | | |
| type | Institution type | VARCHAR(50) | public_school/private_school/government/corporate | | Y | | |
| address | Institution address | TEXT | Xxxxxxxxx | | Y | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| status | Institution status | ENUM | active/deactivated | | N | | |
| deactivated_at | Deactivation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 3. Printers Data Dictionary

**Printers**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique printer ID | INT | 999 | 1–∞ | Y | PK | |
| category | Equipment category | ENUM | printer | | Y | | |
| name | Printer name/description | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| brand | Printer brand | VARCHAR(255) | Xxxxxxxxx | | N | | |
| model | Printer model | VARCHAR(255) | Xxxxxxxxx | | N | | |
| serial_number | Unique serial number | VARCHAR(255) | XXX-XXXX-XXXXX | | N | | |
| quantity | Quantity available | INT | 999 | | Y | | |
| location | Physical location | VARCHAR(255) | Xxxxxxxxx | | N | | |
| department | Department assignment | VARCHAR(255) | Xxxxxxxxx | | N | | |
| status | Printer availability status | ENUM | available/assigned/retired | | Y | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 4. Printer Parts Data Dictionary

**Printer_Items**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique part ID | INT | 999 | 1–∞ | Y | PK | |
| name | Part name | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| brand | Part brand | VARCHAR(255) | Xxxxxxxxx | | N | | |
| category | Part category | ENUM | toner/drum/fuser/roller/ink/ink-bottle/printhead/transfer-belt/maintenance-unit/power-board/mainboard/drum-cartridge/maintenance-box/other/other-consumable/paper/cleaning-supplies/tools/cables/batteries/lubricants/replacement-parts/software/labels | | Y | | |
| item_type | Item classification | ENUM | consumable/printer_part | | N | | |
| quantity | Current stock quantity | INT | 999 | | Y | | |
| minimum_stock | Minimum stock threshold | INT | 999 | | N | | |
| status | Stock status | ENUM | in_stock/low_stock/out_of_stock | | Y | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| is_universal | Universal compatibility flag | TINYINT(1) | 0/1 | | N | | |
| unit | Unit of measurement | VARCHAR(50) | pieces/bottles/boxes | | N | | |
| page_yield | Approximate page yield | INT | 9999 | | N | | |
| ink_volume | Ink volume in milliliters | DECIMAL(10,2) | 999.99 | | N | | |
| color | Color of ink/toner | VARCHAR(50) | black/cyan/magenta/yellow | | N | | |

---

## Table 5. Service Requests Data Dictionary

**Service_Requests**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique service request ID | INT | 999 | 1–∞ | Y | PK | |
| request_number | Service request number | VARCHAR(255) | SR-YYYY-XXXX | | N | | |
| institution_id | Associated institution | VARCHAR(50) | INST-XXX | | N | FK | institutions |
| requested_by | User who requested service | INT | 999 | | N | FK | users |
| technician_id | Assigned technician | INT | 999 | | N | FK | users |
| priority | Request priority level | ENUM | urgent/high/medium/low/scheduled | | Y | | |
| status | Request status | ENUM | pending/assigned/in_progress/pending_approval/completed/cancelled | | Y | | |
| description | Service request description | TEXT | Xxxxxxxxx | | Y | | |
| created_at | Request creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| printer_id | Associated printer | INT | 999 | | N | FK | printers |
| started_at | Service start timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| completed_at | Service completion timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| resolution_notes | Service resolution notes | TEXT | Xxxxxxxxx | | N | | |
| completion_photo_url | Completion photo URL | VARCHAR(500) | https://xxx.com/xxx | | N | | |
| walk_in_customer_name | Walk-in customer name | VARCHAR(255) | Xxxxxxxxx | | N | | |
| printer_brand | Printer brand for walk-ins | VARCHAR(100) | Xxxxxxxxx | | N | | |
| is_walk_in | Walk-in customer flag | TINYINT(1) | 0/1 | | N | | |

---

## Table 6. Parts Requests Data Dictionary

**Parts_Requests**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique parts request ID | INT | 999 | 1–∞ | Y | PK | |
| part_id | Requested part | INT | 999 | | Y | FK | printer_parts |
| technician_id | Requesting technician | INT | 999 | | Y | FK | users |
| quantity_requested | Quantity requested | INT | 999 | | Y | | |
| reason | Request reason | TEXT | Xxxxxxxxx | | Y | | |
| priority | Request priority | ENUM | low/medium/high/urgent | | N | | |
| status | Request status | ENUM | pending/approved/denied | | N | | |
| admin_response | Administrator response | TEXT | Xxxxxxxxx | | N | | |
| approved_by | Approving user | INT | 999 | | N | FK | users |
| approved_at | Approval timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| created_at | Request creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Request update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| stock_at_approval | Stock at approval time | INT | 999 | | N | | |

---

## Table 7. Technician Inventory Data Dictionary

**Technician_Inventory**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique inventory record ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Assigned technician | INT | 999 | | Y | FK | users |
| part_id | Inventory part | INT | 999 | | Y | FK | printer_parts |
| quantity | Current quantity | INT | 999 | | Y | | |
| assigned_by | User who assigned parts | INT | 999 | | N | FK | users |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| last_updated | Last update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| notes | Additional notes | TEXT | Xxxxxxxxx | | N | | |

---

## Table 8. Technician Assignments Data Dictionary

**Technician_Assignments**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Assigned technician | INT | 999 | | Y | FK | users |
| institution_id | Assigned institution | VARCHAR(50) | INST-XXX | | Y | FK | institutions |
| assigned_by | User who made assignment | INT | 999 | | Y | FK | users |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| is_active | Active assignment status | TINYINT(1) | 0/1 | | N | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 9. Institution Printer Assignments Data Dictionary

**Institution_Printer_Assignments**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK | |
| institution_id | Assigned institution | VARCHAR(50) | INST-XXX | | Y | FK | institutions |
| printer_id | Assigned printer | INT | 999 | | Y | FK | printers |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| status | Assignment status | ENUM | assigned/unassigned | | Y | | |
| unassigned_at | Unassignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 10. User Printer Assignments Data Dictionary

**User_Printer_Assignments**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | Assigned user | INT | 999 | | Y | FK | users |
| printer_id | Assigned printer | INT | 999 | | Y | FK | printers |
| institution_id | Associated institution | VARCHAR(50) | INST-XXX | | N | | |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 11. Maintenance Services Data Dictionary

**Maintenance_Services**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique maintenance service ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Performing technician | INT | 999 | | Y | FK | users |
| printer_id | Serviced printer | INT | 999 | | Y | FK | printers |
| institution_id | Service location institution | VARCHAR(50) | INST-XXX | | Y | FK | institutions |
| service_description | Service description | TEXT | Xxxxxxxxx | | Y | | |
| parts_used | JSON array of parts used | TEXT | JSON | | N | | |
| completion_photo | Completion photo URL | VARCHAR(500) | https://xxx.com/xxx | | N | | |
| status | Service status | ENUM | pending/approved/rejected/completed | | N | | |
| approved_by_user_id | Approving user ID | INT | 999 | | N | FK | users |
| approval_notes | Approval notes | TEXT | Xxxxxxxxx | | N | | |
| created_at | Service creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| approved_at | Approval timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| completed_at | Completion timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 12. Service Approvals Data Dictionary

**Service_Approvals**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique approval ID | INT | 999 | 1–∞ | Y | PK | |
| service_request_id | Associated service request | INT | 999 | | Y | FK | service_requests |
| status | Approval status | ENUM | pending_approval/approved/rejected/revision_requested | | Y | | |
| approved_by | Approving user | INT | 999 | | N | FK | users |
| technician_notes | Technician notes | TEXT | Xxxxxxxxx | | N | | |
| institution_admin_notes | Institution admin notes | TEXT | Xxxxxxxxx | | N | | |
| submitted_at | Submission timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| reviewed_at | Review timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 13. Service Parts Used Data Dictionary

**Service_Parts_Used**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique record ID | INT | 999 | 1–∞ | Y | PK | |
| service_request_id | Associated service request | INT | 999 | | Y | FK | service_requests |
| part_id | Used part | INT | 999 | | Y | FK | printer_parts |
| quantity_used | Quantity used | INT | 999 | | Y | | |
| notes | Usage notes | VARCHAR(500) | Xxxxxxxxx | | N | | |
| used_by | Technician who used part | INT | 999 | | Y | FK | users |
| used_at | Usage timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 14. Service Request History Data Dictionary

**Service_Request_History**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique history record ID | INT | 999 | 1–∞ | Y | PK | |
| request_id | Associated service request | INT | 999 | | Y | FK | service_requests |
| previous_status | Previous status | VARCHAR(50) | Xxxxxxxxx | | Y | | |
| new_status | New status | VARCHAR(50) | Xxxxxxxxx | | Y | | |
| changed_by | User who changed status | INT | 999 | | N | FK | users |
| notes | Change notes | TEXT | Xxxxxxxxx | | N | | |
| created_at | History record timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 15. Notifications Data Dictionary

**Notifications**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique notification ID | INT | 999 | 1–∞ | Y | PK | |
| type | Notification type | VARCHAR(100) | Xxxxxxxxx | | Y | | |
| title | Notification title | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| message | Notification message | TEXT | Xxxxxxxxx | | Y | | |
| user_id | Recipient user ID | INT | 999 | | N | FK | users |
| sender_id | Sender user ID | INT | 999 | | N | | |
| reference_type | Reference type | VARCHAR(50) | Xxxxxxxxx | | N | | |
| reference_id | Reference ID | VARCHAR(255) | Xxxxxxxxx | | N | | |
| related_user_id | Related user ID | INT | 999 | | N | FK | users |
| related_data | Related data JSON | JSON | JSON | | N | | |
| is_read | Read status | TINYINT(1) | 0/1 | | N | | |
| created_at | Notification creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Notification update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| priority | Notification priority | ENUM | low/medium/high/urgent | | N | | |

---

## Table 16. Audit Logs Data Dictionary

**Audit_Logs**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique audit log ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User who performed action | INT | 999 | | Y | FK | users |
| user_role | User role at time of action | ENUM | admin/technician/operations_officer | | Y | | |
| action | Action description | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| action_type | Action type | ENUM | create/read/update/delete/login/logout/approve/reject/assign/complete/activate/deactivate/other | | Y | | |
| target_type | Target entity type | VARCHAR(100) | Xxxxxxxxx | | N | | |
| target_id | Target entity ID | VARCHAR(100) | Xxxxxxxxx | | N | | |
| details | Action details JSON | TEXT | JSON | | N | | |
| ip_address | User IP address | VARCHAR(45) | XXX.XXX.XXX.XXX | | N | | |
| user_agent | User agent string | TEXT | Xxxxxxxxx | | N | | |
| created_at | Log creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 17. Verification Tokens Data Dictionary

**Verification_Tokens**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique token ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | Associated user | INT | 999 | | N | FK | users |
| token | Verification token | VARCHAR(100) | Xxxxxxxxx | | Y | | |
| code | Verification code | VARCHAR(6) | 999999 | | N | | |
| type | Token type | ENUM | email/password_reset | | Y | | |
| expires_at | Expiration timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | Y | | |
| created_at | Token creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 18. Password Reset Tokens Data Dictionary

**Password_Reset_Tokens**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique token ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User requesting reset | INT | 999 | | Y | FK | users |
| token | Reset token | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| expires_at | Expiration timestamp | DATETIME | YYYY-MM-DD HH:MM:SS | | Y | | |
| used | Token used status | TINYINT(1) | 0/1 | | N | | |
| created_at | Token creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 19. Temp User Photos Data Dictionary

**Temp_User_Photos**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique record ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | Associated user | INT | 999 | | Y | FK | users |
| front_id_photo | Front ID photo URL | VARCHAR(255) | https://xxx.com/xxx | | N | | |
| back_id_photo | Back ID photo URL | VARCHAR(255) | https://xxx.com/xxx | | N | | |
| selfie_photo | Selfie photo URL | VARCHAR(255) | https://xxx.com/xxx | | N | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| expires_at | Record expiration timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 20. ARM Analysis Cache Data Dictionary

**ARM_Analysis_Cache**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|----------------|----------|------|--------|-------|----------|----------|---------------------|
| id | Unique cache ID | INT | 999 | 1–∞ | Y | PK | |
| printer_brand | Printer brand | VARCHAR(255) | Xxxxxxxxx | | N | | |
| printer_model | Printer model | VARCHAR(255) | Xxxxxxxxx | | N | | |
| analysis_data | Analysis data JSON | JSON | JSON | | N | | |
| created_at | Cache creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

## SYSTEM NOTES

**Database Name:** railway  
**Character Set:** utf8mb4  
**Collation:** utf8mb4_0900_ai_ci / utf8mb4_unicode_ci  
**Engine:** InnoDB  
**Auto-Increment:** Enabled on all primary keys  
**Foreign Key Constraints:** ON DELETE CASCADE / SET NULL as specified  
**Timestamps:** Automatic CURRENT_TIMESTAMP on creation and updates where applicable

**Key Relationships:**
- Users can have multiple roles (admin, institution_admin, operations_officer, technician, institution_user)
- Institutions are linked to institution_admin users
- Printers can be assigned to institutions and individual users
- Service requests track printer maintenance from creation through completion
- Parts requests and technician inventory manage consumable supplies
- Audit logs track all system actions for compliance and accountability
- Notifications keep users informed of system events

**Generated:** December 14, 2025  
**Version:** Based on serviceease_export_latest.sql
