-- CREATE DATABASE  IF NOT EXISTS `serviceease` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `railway`;
-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: serviceease
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `arm_analysis_cache`
--

DROP TABLE IF EXISTS `arm_analysis_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arm_analysis_cache` (
  `id` int NOT NULL AUTO_INCREMENT,
  `printer_brand` varchar(255) DEFAULT NULL,
  `printer_model` varchar(255) DEFAULT NULL,
  `analysis_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_printer` (`printer_brand`,`printer_model`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `arm_analysis_cache`
--

LOCK TABLES `arm_analysis_cache` WRITE;
/*!40000 ALTER TABLE `arm_analysis_cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `arm_analysis_cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `user_role` enum('admin','technician','operations_officer') NOT NULL,
  `action` varchar(255) NOT NULL,
  `action_type` enum('create','read','update','delete','login','logout','approve','reject','assign','complete','activate','deactivate','other') NOT NULL,
  `target_type` varchar(100) DEFAULT NULL,
  `target_id` varchar(100) DEFAULT NULL,
  `details` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_role` (`user_role`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_target` (`target_type`,`target_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'admin','Created new technician account: Mark Ivan Sumalinog (markivan.storm@gmail.com)','create','user','2','{\"action\":\"staff_creation\",\"staff_id\":2,\"staff_name\":\"Mark Ivan Sumalinog\",\"staff_email\":\"markivan.storm@gmail.com\",\"staff_role\":\"technician\",\"status\":\"active\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-08 10:36:08'),(2,1,'admin','Created new user account','create','user',NULL,'{\"method\":\"POST\",\"path\":\"/api/staff\",\"params\":{},\"body\":{\"firstName\":\"Mark Ivan\",\"lastName\":\"Sumalinog\",\"email\":\"markivan.storm@gmail.com\",\"role\":\"technician\"},\"description\":\"Created new user account\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-08 10:36:09'),(3,2,'technician','Changed temporary password','update','user','2','{\"email\":\"markivan.storm@gmail.com\"}','127.0.0.1','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-08 10:44:52'),(4,2,'technician','User login','login','user','2','{\"email\":\"markivan.storm@gmail.com\"}','127.0.0.1','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-08 10:46:14'),(5,1,'admin','Created new institution','create','institution',NULL,'{\"method\":\"POST\",\"path\":\"/api/institutions\",\"params\":{},\"body\":{\"name\":\"Pajo Elementary School\",\"type\":\"public_school\",\"address\":\"Pajo Elementary School, Sangi Road, Lapu-Lapu, Central Visayas, Philippines\"},\"description\":\"Created new institution\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-08 10:46:54'),(6,1,'admin','POST /api/technician-assignments','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/technician-assignments\",\"params\":{},\"body\":{\"technician_id\":2,\"institution_id\":\"INST-001\",\"assigned_by\":1},\"description\":\"POST /api/technician-assignments\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-08 10:46:59'),(7,1,'admin','Added new inventory item','create','inventory',NULL,'{\"method\":\"POST\",\"path\":\"/api/inventory-items\",\"params\":{},\"body\":{\"brand\":\"HP\",\"model\":\"LaserPro1\",\"serial_number\":\"ABCD1234\",\"quantity\":1},\"description\":\"Added new inventory item\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-08 10:51:45'),(8,1,'admin','Assigned printer to client INST-001','create','printer_assignment','INST-001','{\"method\":\"POST\",\"path\":\"/api/institutions/INST-001/printers\",\"params\":{\"institutionId\":\"INST-001\"},\"body\":{\"printer_id\":\"1\"},\"description\":\"Assigned printer to client INST-001\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-08 10:51:51');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `institution_printer_assignments`
--

DROP TABLE IF EXISTS `institution_printer_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `institution_printer_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `institution_id` varchar(50) NOT NULL,
  `printer_id` int NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('assigned','unassigned') NOT NULL DEFAULT 'assigned',
  `unassigned_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_inst_item` (`institution_id`,`printer_id`),
  KEY `fk_ipa_printer` (`printer_id`),
  CONSTRAINT `fk_cpa_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ipa_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `institution_printer_assignments`
--

LOCK TABLES `institution_printer_assignments` WRITE;
/*!40000 ALTER TABLE `institution_printer_assignments` DISABLE KEYS */;
INSERT INTO `institution_printer_assignments` VALUES (1,'INST-001',1,'2025-12-08 10:51:51','assigned',NULL);
/*!40000 ALTER TABLE `institution_printer_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `institutions`
--

DROP TABLE IF EXISTS `institutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `institutions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `institution_id` varchar(50) NOT NULL,
  `user_id` int DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `address` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('active','deactivated') DEFAULT 'active',
  `deactivated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `institution_id` (`institution_id`),
  UNIQUE KEY `institution_id_2` (`institution_id`),
  KEY `fk_institutions_user` (`user_id`),
  CONSTRAINT `fk_institutions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `institutions`
--

LOCK TABLES `institutions` WRITE;
/*!40000 ALTER TABLE `institutions` DISABLE KEYS */;
INSERT INTO `institutions` VALUES (40,'INST-001',NULL,'Pajo Elementary School','public_school','Pajo Elementary School, Sangi Road, Lapu-Lapu, Central Visayas, Philippines','2025-12-08 10:46:54','2025-12-08 10:46:54','active',NULL);
/*!40000 ALTER TABLE `institutions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_services`
--

DROP TABLE IF EXISTS `maintenance_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `technician_id` int NOT NULL,
  `printer_id` int NOT NULL,
  `institution_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `parts_used` text COLLATE utf8mb4_unicode_ci,
  `completion_photo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by_user_id` int DEFAULT NULL COMMENT 'User ID of approver (can be institution_admin or institution_user)',
  `approval_notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Notes from approver (institution_admin or institution_user)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL COMMENT 'When the service was approved/rejected',
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_technician` (`technician_id`),
  KEY `idx_printer` (`printer_id`),
  KEY `idx_institution` (`institution_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at` DESC),
  KEY `idx_ms_status` (`status`),
  KEY `idx_ms_institution_admin` (`approved_by_user_id`),
  KEY `idx_ms_created_at` (`created_at`),
  KEY `idx_ms_approved_by_user` (`approved_by_user_id`),
  CONSTRAINT `fk_approved_by_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ms_approved_by_institution_admin` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_services`
--

LOCK TABLES `maintenance_services` WRITE;
/*!40000 ALTER TABLE `maintenance_services` DISABLE KEYS */;
/*!40000 ALTER TABLE `maintenance_services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_services_backup_final`
--

DROP TABLE IF EXISTS `maintenance_services_backup_final`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_services_backup_final` (
  `id` int NOT NULL DEFAULT '0',
  `technician_id` int NOT NULL,
  `printer_id` int NOT NULL,
  `institution_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `parts_used` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `completion_photo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by_user_id` int DEFAULT NULL COMMENT 'User ID of approver (can be institution_admin or institution_user)',
  `approval_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Notes from approver (institution_admin or institution_user)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL COMMENT 'When the service was approved/rejected',
  `completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_services_backup_final`
--

LOCK TABLES `maintenance_services_backup_final` WRITE;
/*!40000 ALTER TABLE `maintenance_services_backup_final` DISABLE KEYS */;
/*!40000 ALTER TABLE `maintenance_services_backup_final` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `user_id` int DEFAULT NULL COMMENT 'Recipient of this notification',
  `sender_id` int DEFAULT NULL COMMENT 'User who triggered/sent this notification',
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` varchar(255) DEFAULT NULL,
  `related_user_id` int DEFAULT NULL COMMENT 'User this notification is about',
  `related_data` json DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_read` (`is_read`),
  KEY `related_user_id` (`related_user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`related_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,'institution_assigned','New Institution Assigned','You have been assigned to Pajo Elementary School',2,1,'institution','INST-001',2,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"INST-001\", \"reference_type\": \"institution\"}',0,'2025-12-08 10:46:59','2025-12-08 10:46:59','medium');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parts_requests`
--

DROP TABLE IF EXISTS `parts_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parts_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_id` int NOT NULL,
  `technician_id` int NOT NULL,
  `quantity_requested` int NOT NULL DEFAULT '1',
  `reason` text NOT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `status` enum('pending','approved','denied') DEFAULT 'pending',
  `admin_response` text,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `stock_at_approval` int DEFAULT NULL COMMENT 'Stock quantity at the time of approval for tracking purposes',
  PRIMARY KEY (`id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_part_id` (`part_id`),
  KEY `idx_technician_id` (`technician_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `parts_requests_ibfk_1` FOREIGN KEY (`part_id`) REFERENCES `printer_parts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `parts_requests_ibfk_2` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `parts_requests_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parts_requests`
--

LOCK TABLES `parts_requests` WRITE;
/*!40000 ALTER TABLE `parts_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `parts_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `printer_parts`
--

DROP TABLE IF EXISTS `printer_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printer_parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) DEFAULT NULL,
  `category` enum('toner','drum','fuser','roller','ink','ink-bottle','printhead','transfer-belt','maintenance-unit','power-board','mainboard','drum-cartridge','maintenance-box','other','other-consumable','paper','cleaning-supplies','tools','cables','batteries','lubricants','replacement-parts','software','labels') NOT NULL DEFAULT 'other',
  `item_type` enum('consumable','printer_part') DEFAULT 'printer_part',
  `quantity` int NOT NULL DEFAULT '0',
  `minimum_stock` int DEFAULT '5',
  `status` enum('in_stock','low_stock','out_of_stock') NOT NULL DEFAULT 'in_stock',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_universal` tinyint(1) DEFAULT '0' COMMENT 'True if part works with all brands/models',
  `unit` varchar(50) DEFAULT 'pieces',
  `page_yield` int DEFAULT NULL COMMENT 'Approximate number of pages the consumable can print',
  `ink_volume` decimal(10,2) DEFAULT NULL COMMENT 'Volume of ink in milliliters for ink bottles',
  `color` varchar(50) DEFAULT NULL COMMENT 'Color of ink/toner (black, cyan, magenta, yellow, etc.)',
  PRIMARY KEY (`id`),
  KEY `idx_parts_universal` (`is_universal`),
  KEY `idx_parts_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `printer_parts`
--

LOCK TABLES `printer_parts` WRITE;
/*!40000 ALTER TABLE `printer_parts` DISABLE KEYS */;
/*!40000 ALTER TABLE `printer_parts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `printers`
--

DROP TABLE IF EXISTS `printers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` enum('printer') NOT NULL DEFAULT 'printer',
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) DEFAULT NULL,
  `model` varchar(255) DEFAULT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `location` varchar(255) DEFAULT NULL,
  `status` enum('available','assigned','retired') NOT NULL DEFAULT 'available',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_number` (`serial_number`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `printers`
--

LOCK TABLES `printers` WRITE;
/*!40000 ALTER TABLE `printers` DISABLE KEYS */;
INSERT INTO `printers` VALUES (1,'printer','HP LaserPro1','HP','LaserPro1','ABCD1234',1,NULL,'assigned','2025-12-08 10:51:45','2025-12-08 10:51:51');
/*!40000 ALTER TABLE `printers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_approvals`
--

DROP TABLE IF EXISTS `service_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_approvals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_request_id` int NOT NULL,
  `status` enum('pending_approval','approved','rejected','revision_requested') COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution_admin_id` int DEFAULT NULL,
  `technician_notes` text COLLATE utf8mb4_unicode_ci,
  `institution_admin_notes` text COLLATE utf8mb4_unicode_ci,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_service_request` (`service_request_id`),
  KEY `idx_coordinator` (`institution_admin_id`),
  KEY `idx_status` (`status`),
  KEY `idx_submitted_at` (`submitted_at`),
  CONSTRAINT `service_approvals_ibfk_1` FOREIGN KEY (`service_request_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_approvals_ibfk_2` FOREIGN KEY (`institution_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_approvals`
--

LOCK TABLES `service_approvals` WRITE;
/*!40000 ALTER TABLE `service_approvals` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_parts_used`
--

DROP TABLE IF EXISTS `service_parts_used`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_parts_used` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_request_id` int NOT NULL,
  `part_id` int NOT NULL,
  `quantity_used` int NOT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `used_by` int NOT NULL,
  `used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_request` (`service_request_id`),
  KEY `idx_part_id` (`part_id`),
  KEY `idx_used_by` (`used_by`),
  CONSTRAINT `service_parts_used_ibfk_1` FOREIGN KEY (`service_request_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_parts_used_ibfk_2` FOREIGN KEY (`part_id`) REFERENCES `printer_parts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_parts_used_ibfk_3` FOREIGN KEY (`used_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_parts_used`
--

LOCK TABLES `service_parts_used` WRITE;
/*!40000 ALTER TABLE `service_parts_used` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_parts_used` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_request_history`
--

DROP TABLE IF EXISTS `service_request_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_request_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `previous_status` varchar(50) NOT NULL,
  `new_status` varchar(50) NOT NULL,
  `changed_by` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_srh_request` (`request_id`),
  KEY `fk_srh_user` (`changed_by`),
  CONSTRAINT `fk_srh_request` FOREIGN KEY (`request_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_srh_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_request_history`
--

LOCK TABLES `service_request_history` WRITE;
/*!40000 ALTER TABLE `service_request_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_request_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_requests`
--

DROP TABLE IF EXISTS `service_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_number` varchar(255) DEFAULT NULL,
  `institution_id` varchar(50) DEFAULT NULL,
  `requested_by` int DEFAULT NULL,
  `technician_id` int DEFAULT NULL,
  `priority` enum('urgent','high','medium','low','scheduled') NOT NULL DEFAULT 'medium',
  `status` enum('pending','assigned','in_progress','pending_approval','completed','cancelled') NOT NULL DEFAULT 'pending',
  `location` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `printer_id` int DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `resolution_notes` text,
  `completion_photo_url` varchar(500) DEFAULT NULL,
  `walk_in_customer_name` varchar(255) DEFAULT NULL,
  `printer_brand` varchar(100) DEFAULT NULL,
  `is_walk_in` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_number` (`request_number`),
  KEY `fk_sr_institution` (`institution_id`),
  KEY `idx_requested_by_user` (`requested_by`),
  KEY `fk_sr_printer` (`printer_id`),
  KEY `idx_technician_id` (`technician_id`),
  CONSTRAINT `fk_service_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_service_requests_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sr_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sr_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_requests`
--

LOCK TABLES `service_requests` WRITE;
/*!40000 ALTER TABLE `service_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `technician_assignments`
--

DROP TABLE IF EXISTS `technician_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technician_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `technician_id` int NOT NULL,
  `institution_id` varchar(50) NOT NULL,
  `assigned_by` int NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_technician_id` (`technician_id`),
  KEY `idx_institution_id` (`institution_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `fk_ta_assigned_by` (`assigned_by`),
  KEY `idx_technician_institution` (`technician_id`,`institution_id`),
  KEY `idx_institution_active` (`institution_id`,`is_active`),
  CONSTRAINT `fk_ta_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_ta_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`),
  CONSTRAINT `technician_assignments_ibfk_2` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_assignments`
--

LOCK TABLES `technician_assignments` WRITE;
/*!40000 ALTER TABLE `technician_assignments` DISABLE KEYS */;
INSERT INTO `technician_assignments` VALUES (1,2,'INST-001',1,'2025-12-08 10:46:59',1,'2025-12-08 10:46:59','2025-12-08 10:46:59');
/*!40000 ALTER TABLE `technician_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `technician_inventory`
--

DROP TABLE IF EXISTS `technician_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technician_inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `technician_id` int NOT NULL,
  `part_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `assigned_by` int DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_technician_part` (`technician_id`,`part_id`),
  KEY `assigned_by` (`assigned_by`),
  KEY `idx_technician_id` (`technician_id`),
  KEY `idx_part_id` (`part_id`),
  KEY `idx_assigned_at` (`assigned_at`),
  CONSTRAINT `technician_inventory_ibfk_1` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `technician_inventory_ibfk_2` FOREIGN KEY (`part_id`) REFERENCES `printer_parts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `technician_inventory_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_inventory`
--

LOCK TABLES `technician_inventory` WRITE;
/*!40000 ALTER TABLE `technician_inventory` DISABLE KEYS */;
/*!40000 ALTER TABLE `technician_inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `temp_user_photos`
--

DROP TABLE IF EXISTS `temp_user_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temp_user_photos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `front_id_photo` varchar(255) DEFAULT NULL,
  `back_id_photo` varchar(255) DEFAULT NULL,
  `selfie_photo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT ((now() + interval 30 day)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_id` (`user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_tup_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `temp_user_photos`
--

LOCK TABLES `temp_user_photos` WRITE;
/*!40000 ALTER TABLE `temp_user_photos` DISABLE KEYS */;
/*!40000 ALTER TABLE `temp_user_photos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_printer_assignments`
--

DROP TABLE IF EXISTS `user_printer_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_printer_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `printer_id` int NOT NULL,
  `institution_id` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_upa_user` (`user_id`),
  KEY `fk_upa_printer` (`printer_id`),
  CONSTRAINT `fk_upa_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_upa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_printer_assignments`
--

LOCK TABLES `user_printer_assignments` WRITE;
/*!40000 ALTER TABLE `user_printer_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_printer_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','institution_admin','operations_officer','technician','institution_user') NOT NULL,
  `is_email_verified` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `token_version` int DEFAULT '0',
  `must_change_password` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Marienoll','Sari','serviceeaseph@gmail.com','$2a$10$XjlF0yOVHrLcsSmCeqMBoOb1fWCkB6toSZF1Wz4YrTnq9lI8VB2JW','admin',1,'active','2025-08-25 10:22:12','2025-12-07 11:15:27','approved',NULL,NULL,3,0),(2,'Mark Ivan','Sumalinog','markivan.storm@gmail.com','$2b$10$GkeBWa8hEvAp.lDGb8U52OWwEcRrzV916yZhQEEPet0s9KixCP4jq','technician',1,'active','2025-12-08 10:36:08','2025-12-08 10:44:52','approved',NULL,NULL,0,0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `verification_tokens`
--

DROP TABLE IF EXISTS `verification_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verification_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `token` varchar(100) NOT NULL,
  `code` varchar(6) DEFAULT NULL,
  `type` enum('email','password_reset') NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_code` (`code`),
  KEY `fk_vt_user` (`user_id`),
  CONSTRAINT `fk_vt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verification_tokens`
--

LOCK TABLES `verification_tokens` WRITE;
/*!40000 ALTER TABLE `verification_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `verification_tokens` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-09 20:31:58
