-- Update admin user with the fresh password hash
UPDATE users 
SET password='$2b$10$vL4PlPAJDwDmFsQo/yE/DOrMtGpMS0YH4ar8.qYe24JMP7r0gLUMa'
WHERE email='admin@serviceease.com' AND role='admin';