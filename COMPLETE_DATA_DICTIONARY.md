# SERVICEEASE COMPLETE DATA DICTIONARY

---

## Table 1. Users Data Dictionary

**Users**

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
| must_change_password | Password change requirement flag | TINYINT(1) | 0/1 | | N | | |

---

## Table 2. Institutions Data Dictionary

**Institutions**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique institution ID | INT | 999 | 1–∞ | Y | PK | |
| institution_id | Institution identifier code | VARCHAR(50) | INST-XXX | | Y | | |
| user_id | Associated institution_admin user | INT | 999 | | N | FK | users |
| name | Institution name | VARCHAR(100) | Xxxxxxxxx | | Y | | |
| type | Institution type | VARCHAR(50) | public_school/private_school/etc | | Y | | |
| address | Institution physical address | TEXT | | | Y | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| status | Institution status | ENUM | active/deactivated | | N | | |
| deactivated_at | Deactivation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 3. Printers Data Dictionary

**Printers**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique printer ID | INT | 999 | 1–∞ | Y | PK | |
| category | Item category | ENUM | printer | | Y | | |
| name | Printer name | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| brand | Printer brand | VARCHAR(255) | Xxxxxxxxx | | N | | |
| model | Printer model | VARCHAR(255) | Xxxxxxxxx | | N | | |
| serial_number | Printer serial number | VARCHAR(255) | XXX-XXX-XXXXX | | N | | |
| quantity | Quantity in inventory | INT | 999 | 1–∞ | Y | | |
| location | Printer location | VARCHAR(255) | Xxxxxxxxx | | N | | |
| department | Department using printer | VARCHAR(255) | Xxxxxxxxx | | N | | |
| status | Printer assignment status | ENUM | available/assigned/retired | | Y | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 4. Printer Items Data Dictionary

**Printer Items**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique item ID | INT | 999 | 1–∞ | Y | PK | |
| name | Item name | VARCHAR(255) | Xxxxxxxxx | | Y | | |
| brand | Item brand | VARCHAR(255) | Xxxxxxxxx | | N | | |
| category | Item category | ENUM | toner/drum/fuser/roller/ink/ink-bottle/printhead/transfer-belt/maintenance-unit/power-board/mainboard/drum-cartridge/maintenance-box/other/other-consumable/paper/cleaning-supplies/tools/cables/batteries/lubricants/replacement-parts/software/labels | | Y | | |
| item_type | Type of item | ENUM | consumable/printer_part | | N | | |
| quantity | Quantity in stock | INT | 999 | 0–∞ | Y | | |
| minimum_stock | Minimum stock level | INT | 999 | | N | | |
| status | Stock status | ENUM | in_stock/low_stock/out_of_stock | | Y | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| is_universal | Universal compatibility flag | TINYINT(1) | 0/1 | | N | | |
| unit | Unit of measurement | VARCHAR(50) | pieces/bottles/boxes | | N | | |
| page_yield | Approximate page yield | INT | 999 | | N | | |
| ink_volume | Ink volume in milliliters | DECIMAL(10,2) | 999.99 | | N | | |
| color | Ink/toner color | VARCHAR(50) | black/cyan/magenta/yellow | | N | | |

---

## Table 5. Service Requests Data Dictionary

**Service Requests**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique service request ID | INT | 999 | 1–∞ | Y | PK | |
| request_number | Service request number | VARCHAR(255) | SR-YYYY-XXXX | | N | | |
| institution_id | Associated institution | VARCHAR(50) | INST-XXX | | N | FK | institutions |
| requested_by | User who requested service | INT | 999 | | N | FK | users |
| technician_id | Assigned technician | INT | 999 | | N | FK | users |
| priority | Request priority level | ENUM | urgent/high/medium/low/scheduled | | Y | | |
| status | Request status | ENUM | pending/assigned/in_progress/pending_approval/completed/cancelled | | Y | | |
| description | Service request description | TEXT | | | Y | | |
| created_at | Request creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| printer_id | Printer requiring service | INT | 999 | | N | FK | printers |
| started_at | Service start timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| completed_at | Service completion timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| resolution_notes | Service resolution notes | TEXT | | | N | | |
| completion_photo_url | Completion photo URL | VARCHAR(500) | https://... | | N | | |
| walk_in_customer_name | Walk-in customer name | VARCHAR(255) | Xxxxxxxxx | | N | | |
| printer_brand | Walk-in printer brand | VARCHAR(100) | Xxxxxxxxx | | N | | |
| is_walk_in | Walk-in service flag | TINYINT(1) | 0/1 | | N | | |

---

## Table 6. Items Request Data Dictionary

**Items Request**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique request ID | INT | 999 | 1–∞ | Y | PK | |
| item_id | Requested item | INT | 999 | | Y | FK | printer_items |
| technician_id | Requesting technician | INT | 999 | | Y | FK | users |
| quantity_requested | Quantity requested | INT | 999 | 1–∞ | Y | | |
| reason | Request reason | TEXT | | | Y | | |
| priority | Request priority | ENUM | low/medium/high/urgent | | N | | |
| status | Request status | ENUM | pending/approved/denied | | N | | |
| admin_response | Admin response notes | TEXT | | | N | | |
| approved_by | Admin who approved request | INT | 999 | | N | FK | users |
| approved_at | Approval timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| created_at | Request creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Request update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| stock_at_approval | Stock quantity at approval time | INT | 999 | | N | | |

---

## Table 7. Technician Inventory Data Dictionary

**Technician Inventory**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique inventory record ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Technician owning inventory | INT | 999 | | Y | FK | users |
| item_id | Item in inventory | INT | 999 | | Y | FK | printer_items |
| quantity | Current quantity | INT | 999 | 0–∞ | Y | | |
| assigned_by | Admin who assigned items | INT | 999 | | N | FK | users |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| last_updated | Last update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| notes | Additional notes | TEXT | | | N | | |

---

## Table 8. Technician Assignments Data Dictionary

**Technician Assignments**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Assigned technician | INT | 999 | | Y | FK | users |
| institution_id | Assigned institution | VARCHAR(50) | INST-XXX | | Y | FK | institutions |
| assigned_by | Admin who made assignment | INT | 999 | | Y | FK | users |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| is_active | Assignment active status | TINYINT(1) | 0/1 | | N | | |
| created_at | Record creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Record update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 9. Institution Printer Assignments Data Dictionary

**Institution Printer Assignments**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK | |
| institution_id | Institution receiving printer | VARCHAR(50) | INST-XXX | | Y | FK | institutions |
| printer_id | Assigned printer | INT | 999 | | Y | FK | printers |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| status | Assignment status | ENUM | assigned/unassigned | | Y | | |
| unassigned_at | Unassignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 10. User Printer Assignments Data Dictionary

**User Printer Assignments**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique assignment ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | Assigned institution user | INT | 999 | | Y | FK | users |
| printer_id | Assigned printer | INT | 999 | | Y | FK | printers |
| institution_id | Associated institution | VARCHAR(50) | INST-XXX | | N | | |
| assigned_at | Assignment timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 11. Maintenance Services Data Dictionary

**Maintenance Services**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique service ID | INT | 999 | 1–∞ | Y | PK | |
| technician_id | Technician performing service | INT | 999 | | Y | FK | users |
| printer_id | Serviced printer | INT | 999 | | Y | FK | printers |
| institution_id | Service location institution | VARCHAR(50) | INST-XXX | | Y | FK | institutions |
| service_description | Service description | TEXT | | | Y | | |
| parts_used | JSON array of parts used | TEXT | | | N | | |
| completion_photo | Completion photo URL | VARCHAR(500) | https://... | | N | | |
| status | Service status | ENUM | pending/approved/rejected/completed | | N | | |
| approved_by_user_id | User who approved service | INT | 999 | | N | FK | users |
| approval_notes | Approval notes | TEXT | | | N | | |
| created_at | Service creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| approved_at | Service approval timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| completed_at | Service completion timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 12. Service Approvals Data Dictionary

**Service Approvals**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique approval ID | INT | 999 | 1–∞ | Y | PK | |
| service_request_id | Service request being approved | INT | 999 | | Y | FK | service_requests |
| status | Approval status | ENUM | pending_approval/approved/rejected/revision_requested | | Y | | |
| approved_by | User who approved | INT | 999 | | N | FK | users |
| technician_notes | Technician completion notes | TEXT | | | N | | |
| institution_admin_notes | Institution admin notes | TEXT | | | N | | |
| submitted_at | Submission timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| reviewed_at | Review timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 13. Service Items Used Data Dictionary

**Service Items Used**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique usage record ID | INT | 999 | 1–∞ | Y | PK | |
| service_request_id | Associated service request | INT | 999 | | Y | FK | service_requests |
| item_id | Item used | INT | 999 | | Y | FK | printer_items |
| quantity_used | Quantity used | INT | 999 | 1–∞ | Y | | |
| notes | Usage notes | VARCHAR(500) | | | N | | |
| used_by | Technician who used item | INT | 999 | | Y | FK | users |
| used_at | Usage timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 14. Service Request History Data Dictionary

**Service Request History**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique history record ID | INT | 999 | 1–∞ | Y | PK | |
| request_id | Associated service request | INT | 999 | | Y | FK | service_requests |
| previous_status | Previous request status | VARCHAR(50) | | | Y | | |
| new_status | New request status | VARCHAR(50) | | | Y | | |
| changed_by | User who changed status | INT | 999 | | N | FK | users |
| notes | Change notes | TEXT | | | N | | |
| created_at | History record timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 15. Notifications Data Dictionary

**Notifications**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique notification ID | INT | 999 | 1–∞ | Y | PK | |
| type | Notification type | VARCHAR(100) | | | Y | | |
| title | Notification title | VARCHAR(255) | | | Y | | |
| message | Notification message | TEXT | | | Y | | |
| user_id | Notification recipient | INT | 999 | | N | | |
| sender_id | Notification sender | INT | 999 | | N | | |
| reference_type | Referenced entity type | VARCHAR(50) | | | N | | |
| reference_id | Referenced entity ID | VARCHAR(255) | | | N | | |
| related_user_id | Related user | INT | 999 | | N | FK | users |
| related_data | JSON data | JSON | | | N | | |
| is_read | Read status | TINYINT(1) | 0/1 | | N | | |
| created_at | Notification timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| updated_at | Update timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| priority | Notification priority | ENUM | low/medium/high/urgent | | N | | |

---

## Table 16. Audit Logs Data Dictionary

**Audit Logs**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique log ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User performing action | INT | 999 | | Y | FK | users |
| user_role | Role of user | ENUM | admin/technician/operations_officer | | Y | | |
| action | Action description | VARCHAR(255) | | | Y | | |
| action_type | Type of action | ENUM | create/read/update/delete/login/logout/approve/reject/assign/complete/activate/deactivate/other | | Y | | |
| target_type | Target entity type | VARCHAR(100) | | | N | | |
| target_id | Target entity ID | VARCHAR(100) | | | N | | |
| details | Action details | TEXT | | | N | | |
| ip_address | User IP address | VARCHAR(45) | XXX.XXX.XXX.XXX | | N | | |
| user_agent | Browser user agent | TEXT | | | N | | |
| created_at | Log timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 17. Password Reset Tokens Data Dictionary

**Password Reset Tokens**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique token ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User requesting reset | INT | 999 | | Y | FK | users |
| token | Reset token | VARCHAR(255) | | | Y | | |
| expires_at | Token expiration time | DATETIME | YYYY-MM-DD HH:MM:SS | | Y | | |
| used | Token used flag | TINYINT(1) | 0/1 | | N | | |
| created_at | Token creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 18. Verification Tokens Data Dictionary

**Verification Tokens**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique token ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User being verified | INT | 999 | | N | FK | users |
| token | Verification token | VARCHAR(100) | | | Y | | |
| code | Verification code | VARCHAR(6) | 999999 | | N | | |
| type | Token type | ENUM | email/password_reset | | Y | | |
| expires_at | Token expiration time | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | Y | | |
| created_at | Token creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 19. Temp User Photos Data Dictionary

**Temp User Photos**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique record ID | INT | 999 | 1–∞ | Y | PK | |
| user_id | User uploading photos | INT | 999 | | Y | FK | users |
| front_id_photo | Front ID photo URL | VARCHAR(255) | | | N | | |
| back_id_photo | Back ID photo URL | VARCHAR(255) | | | N | | |
| selfie_photo | Selfie photo URL | VARCHAR(255) | | | N | | |
| created_at | Upload timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |
| expires_at | Expiration timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

## Table 20. ARM Analysis Cache Data Dictionary

**ARM Analysis Cache**

| ATTRIBUTE NAME | CONTENTS | TYPE | FORMAT | RANGE | REQUIRED | PK OR FK | FK REFERENCED TABLE |
|---|---|---|---|---|---|---|---|
| id | Unique cache record ID | INT | 999 | 1–∞ | Y | PK | |
| printer_brand | Printer brand | VARCHAR(255) | | | N | | |
| printer_model | Printer model | VARCHAR(255) | | | N | | |
| analysis_data | Analysis results JSON | JSON | | | N | | |
| created_at | Cache creation timestamp | TIMESTAMP | YYYY-MM-DD HH:MM:SS | | N | | |

---

**END OF DATA DICTIONARY**
