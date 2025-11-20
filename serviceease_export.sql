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
  `action_type` enum('create','read','update','delete','login','logout','approve','reject','assign','complete','other') NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,2,'admin','User login','login','user','2','{\"email\":\"admin@serviceease.com\"}','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','2025-11-20 03:46:56');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_printer_assignments`
--

DROP TABLE IF EXISTS `client_printer_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_printer_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `institution_id` varchar(50) NOT NULL,
  `inventory_item_id` int NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `location_note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_inst_item` (`institution_id`,`inventory_item_id`),
  KEY `fk_cpa_item` (`inventory_item_id`),
  CONSTRAINT `fk_cpa_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cpa_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_printer_assignments`
--

LOCK TABLES `client_printer_assignments` WRITE;
/*!40000 ALTER TABLE `client_printer_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `client_printer_assignments` ENABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `institutions`
--

LOCK TABLES `institutions` WRITE;
/*!40000 ALTER TABLE `institutions` DISABLE KEYS */;
/*!40000 ALTER TABLE `institutions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_items`
--

DROP TABLE IF EXISTS `inventory_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_items` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_items`
--

LOCK TABLES `inventory_items` WRITE;
/*!40000 ALTER TABLE `inventory_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_preferences`
--

DROP TABLE IF EXISTS `notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `email_notifications` tinyint(1) DEFAULT '1',
  `in_app_notifications` tinyint(1) DEFAULT '1',
  `notification_types` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_prefs` (`user_id`),
  CONSTRAINT `notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_preferences`
--

LOCK TABLES `notification_preferences` WRITE;
/*!40000 ALTER TABLE `notification_preferences` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_preferences` ENABLE KEYS */;
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
  `user_id` int DEFAULT NULL,
  `sender_id` int DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` varchar(255) DEFAULT NULL,
  `related_user_id` int DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
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
  `quantity` int NOT NULL DEFAULT '0',
  `minimum_stock` int DEFAULT '5',
  `status` enum('in_stock','low_stock','out_of_stock') NOT NULL DEFAULT 'in_stock',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_universal` tinyint(1) DEFAULT '0' COMMENT 'True if part works with all brands/models',
  `part_type` enum('universal','brand_specific','model_specific') DEFAULT 'universal' COMMENT 'Type of compatibility',
  `unit` varchar(50) DEFAULT 'pieces',
  PRIMARY KEY (`id`),
  KEY `idx_parts_universal` (`is_universal`),
  KEY `idx_parts_type` (`part_type`),
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
-- Table structure for table `printer_parts_transactions`
--

DROP TABLE IF EXISTS `printer_parts_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printer_parts_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_id` int NOT NULL,
  `transaction_type` enum('in','out') NOT NULL,
  `quantity` int NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `part_id` (`part_id`),
  KEY `fk_ppt_created_by` (`created_by`),
  CONSTRAINT `fk_ppt_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `printer_parts_transactions_ibfk_1` FOREIGN KEY (`part_id`) REFERENCES `printer_parts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `printer_parts_transactions`
--

LOCK TABLES `printer_parts_transactions` WRITE;
/*!40000 ALTER TABLE `printer_parts_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `printer_parts_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `printers`
--

DROP TABLE IF EXISTS `printers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `institution_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `model` varchar(255) DEFAULT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_printers_institution` (`institution_id`),
  CONSTRAINT `fk_printers_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `printers`
--

LOCK TABLES `printers` WRITE;
/*!40000 ALTER TABLE `printers` DISABLE KEYS */;
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
  `coordinator_id` int DEFAULT NULL,
  `technician_notes` text COLLATE utf8mb4_unicode_ci,
  `coordinator_notes` text COLLATE utf8mb4_unicode_ci,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_service_request` (`service_request_id`),
  KEY `idx_coordinator` (`coordinator_id`),
  KEY `idx_status` (`status`),
  KEY `idx_submitted_at` (`submitted_at`),
  CONSTRAINT `service_approvals_ibfk_1` FOREIGN KEY (`service_request_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_approvals_ibfk_2` FOREIGN KEY (`coordinator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
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
-- Table structure for table `service_request_parts`
--

DROP TABLE IF EXISTS `service_request_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_request_parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `part_name` varchar(100) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `added_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_srp_request` (`request_id`),
  KEY `fk_srp_user` (`added_by`),
  CONSTRAINT `fk_srp_user` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_request_parts`
--

LOCK TABLES `service_request_parts` WRITE;
/*!40000 ALTER TABLE `service_request_parts` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_request_parts` ENABLE KEYS */;
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
  `requested_by_user_id` int DEFAULT NULL,
  `assigned_technician_id` int DEFAULT NULL,
  `priority` enum('urgent','high','medium','low','scheduled') NOT NULL DEFAULT 'medium',
  `status` enum('pending','assigned','in_progress','pending_approval','completed','cancelled') NOT NULL DEFAULT 'pending',
  `location` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `inventory_item_id` int DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `resolution_notes` text,
  `walk_in_customer_name` varchar(255) DEFAULT NULL,
  `printer_brand` varchar(100) DEFAULT NULL,
  `is_walk_in` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_number` (`request_number`),
  KEY `fk_sr_institution` (`institution_id`),
  KEY `fk_sr_inventory_item` (`inventory_item_id`),
  KEY `fk_sr_technician` (`assigned_technician_id`),
  KEY `idx_requested_by_user` (`requested_by_user_id`),
  CONSTRAINT `fk_service_requests_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sr_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sr_inventory_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sr_technician` FOREIGN KEY (`assigned_technician_id`) REFERENCES `users` (`id`)
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
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`session_id`),
  KEY `sessions_expires_idx` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_assignments`
--

LOCK TABLES `technician_assignments` WRITE;
/*!40000 ALTER TABLE `technician_assignments` DISABLE KEYS */;
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
  `inventory_item_id` int NOT NULL,
  `institution_id` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_upa_user` (`user_id`),
  KEY `fk_upa_item` (`inventory_item_id`),
  CONSTRAINT `fk_upa_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE,
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
  `role` enum('admin','coordinator','operations_officer','technician','requester') NOT NULL,
  `is_email_verified` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
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
INSERT INTO `users` VALUES (2,'Admin','User','admin@serviceease.com','$2b$10$vL4PlPAJDwDmFsQo/yE/DOrMtGpMS0YH4ar8.qYe24JMP7r0gLUMa','admin',1,'active','2025-08-25 10:22:12','2025-09-20 08:57:12',NULL);
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
  `user_id` int NOT NULL,
  `token` varchar(100) NOT NULL,
  `type` enum('email','password_reset') NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_vt_user` (`user_id`),
  CONSTRAINT `fk_vt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verification_tokens`
--

LOCK TABLES `verification_tokens` WRITE;
/*!40000 ALTER TABLE `verification_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `verification_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `voluntary_services`
--

DROP TABLE IF EXISTS `voluntary_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voluntary_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `technician_id` int NOT NULL,
  `printer_id` int NOT NULL,
  `institution_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requester_id` int DEFAULT NULL,
  `service_description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `parts_used` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending_coordinator','coordinator_approved','pending_requester','completed','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending_coordinator',
  `coordinator_approval_status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `requester_approval_status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `coordinator_notes` text COLLATE utf8mb4_unicode_ci,
  `requester_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `coordinator_reviewed_at` timestamp NULL DEFAULT NULL,
  `coordinator_reviewed_by` int DEFAULT NULL,
  `requester_reviewed_at` timestamp NULL DEFAULT NULL,
  `requester_reviewed_by` int DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_technician` (`technician_id`),
  KEY `idx_printer` (`printer_id`),
  KEY `idx_institution` (`institution_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at` DESC),
  KEY `idx_requester` (`requester_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `voluntary_services`
--

LOCK TABLES `voluntary_services` WRITE;
/*!40000 ALTER TABLE `voluntary_services` DISABLE KEYS */;
/*!40000 ALTER TABLE `voluntary_services` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-20 13:08:31
