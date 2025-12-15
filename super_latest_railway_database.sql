CREATE DATABASE  IF NOT EXISTS `railway` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `railway`;
-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: trolley.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

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
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'admin','User login','login','user','1','{\"email\":\"serviceeaseph@gmail.com\"}','122.2.183.56, 104.23.160.223, 10.22.39.70','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-14 14:10:07'),(2,1,'admin','Created new technician account: Mark Ivan Sumalinog (markivan.storm@gmail.com)','create','user','2','{\"action\":\"staff_creation\",\"staff_id\":2,\"staff_name\":\"Mark Ivan Sumalinog\",\"staff_email\":\"markivan.storm@gmail.com\",\"staff_role\":\"technician\",\"status\":\"active\"}','122.2.183.56, 162.158.179.193, 10.23.132.205','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-14 14:13:10'),(3,1,'admin','Created new user account','create','user',NULL,'{\"method\":\"POST\",\"path\":\"/api/staff\",\"params\":{},\"body\":{\"firstName\":\"Mark Ivan\",\"lastName\":\"Sumalinog\",\"email\":\"markivan.storm@gmail.com\",\"role\":\"technician\"},\"description\":\"Created new user account\"}','122.2.183.56, 162.158.179.193, 10.23.132.205','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-14 14:13:11'),(4,1,'admin','User login','login','user','1','{\"email\":\"serviceeaseph@gmail.com\"}','122.2.183.56, 172.71.218.19, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 07:37:10'),(5,1,'admin','Created new institution','create','institution',NULL,'{\"method\":\"POST\",\"path\":\"/api/institutions\",\"params\":{},\"body\":{\"name\":\"Cebu Technological University\",\"type\":\"public_school\",\"address\":\"Cebu Technological University, M. J. Cuenco Avenue, Cebu City, Central Visayas, Philippines\"},\"description\":\"Created new institution\"}','122.2.183.56, 172.71.218.18, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 07:40:44'),(6,1,'admin','Created new technician account: Fawny Zephy (markivan.light@gmail.com)','create','user','4','{\"action\":\"staff_creation\",\"staff_id\":4,\"staff_name\":\"Fawny Zephy\",\"staff_email\":\"markivan.light@gmail.com\",\"staff_role\":\"technician\",\"status\":\"active\"}','122.2.183.56, 104.23.160.185, 10.22.39.70','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 08:47:26'),(7,1,'admin','Created new user account','create','user',NULL,'{\"method\":\"POST\",\"path\":\"/api/staff\",\"params\":{},\"body\":{\"firstName\":\"Fawny\",\"lastName\":\"Zephy\",\"email\":\"markivan.light@gmail.com\",\"role\":\"technician\"},\"description\":\"Created new user account\"}','122.2.183.56, 104.23.160.185, 10.22.39.70','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 08:47:27'),(8,1,'admin','Updated technician account: Fawny Zephy - Status: inactive','update','user','4','{\"action\":\"staff_update\",\"staff_id\":\"4\",\"staff_name\":\"Fawny Zephy\",\"staff_role\":\"technician\",\"previous_status\":\"active\",\"new_status\":\"inactive\"}','122.2.183.56, 162.158.114.66, 10.23.193.112','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 08:53:10'),(9,1,'admin','Updated user account #4','update','user','4','{\"method\":\"PUT\",\"path\":\"/api/staff/4\",\"params\":{\"id\":\"4\"},\"body\":{\"first_name\":\"Fawny\",\"last_name\":\"Zephy\",\"role\":\"technician\",\"status\":\"inactive\"},\"description\":\"Updated user account #4\"}','122.2.183.56, 162.158.114.66, 10.23.193.112','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 08:53:10'),(10,1,'admin','Updated technician account: Fawny Zephy - Status: active','update','user','4','{\"action\":\"staff_update\",\"staff_id\":\"4\",\"staff_name\":\"Fawny Zephy\",\"staff_role\":\"technician\",\"previous_status\":\"inactive\",\"new_status\":\"active\"}','122.2.183.56, 104.23.160.199, 10.23.193.112','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 08:53:16'),(11,1,'admin','Updated user account #4','update','user','4','{\"method\":\"PUT\",\"path\":\"/api/staff/4\",\"params\":{\"id\":\"4\"},\"body\":{\"first_name\":\"Fawny\",\"last_name\":\"Zephy\",\"role\":\"technician\",\"status\":\"active\"},\"description\":\"Updated user account #4\"}','122.2.183.56, 104.23.160.199, 10.23.193.112','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 08:53:16'),(12,1,'admin','Viewed verification documents for user ID: 3','read','user_documents','3','{\"action\":\"view_documents\",\"timestamp\":\"2025-12-15T08:58:03.938Z\"}','122.2.183.56, 162.158.114.66, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 08:58:04'),(13,1,'admin','POST /api/log-document-view','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/log-document-view\",\"params\":{},\"body\":{\"userId\":\"3\",\"action\":\"view_documents\",\"timestamp\":\"2025-12-15T08:58:03.938Z\"},\"description\":\"POST /api/log-document-view\"}','122.2.183.56, 162.158.114.66, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 08:58:04'),(14,1,'admin','Approved institution_admin registration: John Michael Doe (markivan.1101@gmail.com)','approve','user','3','{\"action\":\"institution_admin_approval\",\"user_id\":\"3\",\"user_name\":\"John Michael Doe\",\"user_email\":\"markivan.1101@gmail.com\",\"user_role\":\"institution_admin\",\"previous_status\":\"pending\",\"new_status\":\"approved\"}','122.2.183.56, 162.158.114.67, 10.23.11.80','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 09:03:34'),(15,1,'admin','POST /api/approve-user/3','approve',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/approve-user/3\",\"params\":{\"userId\":\"3\"},\"body\":{},\"description\":\"POST /api/approve-user/3\"}','122.2.183.56, 162.158.114.67, 10.23.11.80','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 09:03:34'),(16,1,'admin','Added new inventory item','create','inventory',NULL,'{\"method\":\"POST\",\"path\":\"/api/inventory-items\",\"params\":{},\"body\":{\"brand\":\"HP\",\"model\":\"LaserPro123\",\"serial_number\":\"ABCD1234\",\"quantity\":1},\"description\":\"Added new inventory item\"}','49.145.107.240, 104.23.160.166, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 09:30:12'),(17,1,'admin','Assigned printer to client INST-001','create','printer_assignment','INST-001','{\"method\":\"POST\",\"path\":\"/api/institutions/INST-001/printers\",\"params\":{\"institutionId\":\"INST-001\"},\"body\":{\"printer_id\":\"1\"},\"description\":\"Assigned printer to client INST-001\"}','49.145.107.240, 104.23.160.44, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 09:37:56'),(18,1,'admin','Created service request','create','service_request',NULL,'{\"method\":\"POST\",\"path\":\"/api/walk-in-service-requests\",\"params\":{},\"body\":{\"walk_in_customer_name\":\"Sanrio Skye\",\"printer_brand\":\"Epson\",\"priority\":\"high\",\"issue\":\"Need now\"},\"description\":\"Created service request\"}','49.145.107.240, 104.23.160.113, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 10:02:05'),(19,4,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"item_id\":1,\"quantity_requested\":5,\"reason\":\"need now\",\"priority\":\"medium\"},\"description\":\"POST /\"}','49.145.107.240, 172.68.174.39, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 10:21:48'),(20,1,'admin','PATCH /1','update',NULL,NULL,'{\"method\":\"PATCH\",\"path\":\"/1\",\"params\":{\"id\":\"1\"},\"body\":{\"status\":\"approved\",\"admin_response\":\"\"},\"description\":\"PATCH /1\"}','122.2.183.56, 104.23.160.138, 10.23.11.80','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 10:24:12'),(21,4,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"item_id\":2,\"quantity_requested\":5,\"reason\":\"need now\",\"priority\":\"medium\"},\"description\":\"POST /\"}','49.145.107.240, 172.68.174.195, 10.22.39.70','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 10:27:03'),(22,1,'admin','PATCH /2','update',NULL,NULL,'{\"method\":\"PATCH\",\"path\":\"/2\",\"params\":{\"id\":\"2\"},\"body\":{\"status\":\"approved\",\"admin_response\":\"\"},\"description\":\"PATCH /2\"}','122.2.183.56, 162.158.179.193, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 10:27:14'),(23,4,'technician','Updated service request 1','update','service_request','1','{\"method\":\"PUT\",\"path\":\"/service-requests/1/status\",\"params\":{\"requestId\":\"1\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 1\"}','49.145.107.240, 162.159.98.12, 10.22.39.70','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 10:27:52'),(24,1,'admin','Approved service request 1','approve','service_request','1','{\"method\":\"POST\",\"path\":\"/api/service-requests/1/approve-completion\",\"params\":{\"id\":\"1\"},\"body\":{\"approved\":true,\"notes\":null},\"description\":\"Approved service request 1\"}','122.2.183.56, 104.23.160.189, 10.23.11.80','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 10:31:58'),(25,1,'admin','POST /api/technician-assignments','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/technician-assignments\",\"params\":{},\"body\":{\"technician_id\":4,\"institution_id\":\"INST-001\",\"assigned_by\":1},\"description\":\"POST /api/technician-assignments\"}','122.2.183.56, 104.23.160.197, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0','2025-12-15 10:36:16'),(26,4,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.240, 104.23.160.151, 10.23.11.80','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 10:40:40'),(27,4,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.240, 104.23.160.74, 10.22.39.70','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 10:41:37'),(28,4,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.240, 104.23.160.66, 10.23.11.80','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 10:52:43'),(29,4,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.240, 104.23.160.32, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 10:59:05'),(30,4,'technician','User login','login','user','4','{\"email\":\"markivan.light@gmail.com\"}','49.145.107.240, 172.71.218.19, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 11:05:33'),(31,4,'technician','Updated service request 2','update','service_request','2','{\"method\":\"PUT\",\"path\":\"/service-requests/2/status\",\"params\":{\"requestId\":\"2\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 2\"}','122.2.183.56, 172.68.175.43, 10.23.11.80','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 11:09:54'),(32,4,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','122.2.183.56, 172.68.174.42, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 11:16:14'),(33,4,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.240, 162.159.98.12, 10.22.39.70','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 11:26:11'),(34,4,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"printer_id\":1,\"institution_id\":\"INST-001\",\"service_description\":\"done\",\"completion_photo\":\"https://res.cloudinary.com/duodt5wlv/image/upload/v1765797970/maintenance_services/ojrxcz9ob9gbs6lcy7dc.png\",\"parts_used\":[{\"part_id\":null,\"qty\":1,\"unit\":\"pieces\"}]},\"description\":\"POST /\"}','49.145.107.240, 172.68.174.208, 10.22.39.70','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 11:26:12'),(35,4,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.240, 162.159.98.13, 10.23.11.80','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 11:40:34'),(36,4,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"printer_id\":1,\"institution_id\":\"INST-001\",\"service_description\":\"done\",\"completion_photo\":\"https://res.cloudinary.com/duodt5wlv/image/upload/v1765798833/maintenance_services/ygyc5flgqksszu6wfkzj.png\",\"parts_used\":[{\"item_id\":null,\"qty\":1,\"unit\":\"pieces\"}]},\"description\":\"POST /\"}','49.145.107.240, 172.68.175.49, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 11:40:35'),(37,4,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','122.2.183.56, 104.23.160.191, 10.23.221.25','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 12:45:16'),(38,4,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.240, 104.23.160.128, 10.23.221.25','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 13:53:49'),(39,4,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"printer_id\":1,\"institution_id\":\"INST-001\",\"service_description\":\"done\",\"completion_photo\":\"https://res.cloudinary.com/duodt5wlv/image/upload/v1765806828/maintenance_services/k5zm9pywwrtss0bydvak.png\",\"items_used\":null},\"description\":\"POST /\"}','49.145.107.240, 104.23.160.122, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 13:53:50'),(40,4,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.240, 104.23.160.174, 10.22.39.70','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 22:38:25'),(41,4,'technician','Updated service request 3','update','service_request','3','{\"method\":\"PUT\",\"path\":\"/service-requests/3/status\",\"params\":{\"requestId\":\"3\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 3\"}','122.2.183.56, 104.23.160.71, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1','2025-12-15 22:43:35');
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
INSERT INTO `institution_printer_assignments` VALUES (1,'INST-001',1,'2025-12-15 09:37:55','assigned',NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `institutions`
--

LOCK TABLES `institutions` WRITE;
/*!40000 ALTER TABLE `institutions` DISABLE KEYS */;
INSERT INTO `institutions` VALUES (43,'INST-001',3,'Cebu Technological University','public_school','Cebu Technological University, M. J. Cuenco Avenue, Cebu City, Central Visayas, Philippines','2025-12-15 07:40:44','2025-12-15 09:03:33','active',NULL);
/*!40000 ALTER TABLE `institutions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items_request`
--

DROP TABLE IF EXISTS `items_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items_request` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
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
  KEY `idx_part_id` (`item_id`),
  KEY `idx_technician_id` (`technician_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `items_request_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `printer_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `items_request_ibfk_2` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `items_request_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items_request`
--

LOCK TABLES `items_request` WRITE;
/*!40000 ALTER TABLE `items_request` DISABLE KEYS */;
INSERT INTO `items_request` VALUES (1,1,4,5,'need now','medium','approved',NULL,1,'2025-12-15 10:24:11','2025-12-15 10:21:48','2025-12-15 10:24:11',100),(2,2,4,5,'need now','medium','approved',NULL,1,'2025-12-15 10:27:13','2025-12-15 10:27:03','2025-12-15 10:27:13',100);
/*!40000 ALTER TABLE `items_request` ENABLE KEYS */;
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
  `institution_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `completion_photo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_technician` (`technician_id`),
  KEY `idx_printer` (`printer_id`),
  KEY `idx_institution` (`institution_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at` DESC),
  KEY `idx_ms_status` (`status`),
  KEY `idx_ms_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_services`
--

LOCK TABLES `maintenance_services` WRITE;
/*!40000 ALTER TABLE `maintenance_services` DISABLE KEYS */;
INSERT INTO `maintenance_services` VALUES (1,4,1,'INST-001','done','https://res.cloudinary.com/duodt5wlv/image/upload/v1765797970/maintenance_services/ojrxcz9ob9gbs6lcy7dc.png','rejected','2025-12-15 11:26:12',NULL),(2,4,1,'INST-001','done','https://res.cloudinary.com/duodt5wlv/image/upload/v1765798833/maintenance_services/ygyc5flgqksszu6wfkzj.png','rejected','2025-12-15 11:40:35',NULL),(3,4,1,'INST-001','done','https://res.cloudinary.com/duodt5wlv/image/upload/v1765802716/maintenance_services/unynjvip45mrdbv0nvlw.png','rejected','2025-12-15 12:45:17',NULL),(4,4,1,'INST-001','done','https://res.cloudinary.com/duodt5wlv/image/upload/v1765806828/maintenance_services/k5zm9pywwrtss0bydvak.png','rejected','2025-12-15 13:53:50',NULL);
/*!40000 ALTER TABLE `maintenance_services` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,'institution_admin_registration','New institution_admin Registration','John Michael Doe from Cebu Technological University has registered and is awaiting approval.',NULL,NULL,NULL,NULL,3,'{\"email\": \"markivan.1101@gmail.com\", \"institution_id\": \"INST-001\", \"institution_name\": \"Cebu Technological University\", \"institution_type\": \"public_school\", \"institution_address\": \"Cebu Technological University, M. J. Cuenco Avenue, Cebu City, Central Visayas, Philippines\"}',0,'2025-12-15 08:14:53','2025-12-15 08:14:53','medium'),(2,'info','New Printer Assigned to Your Institution','A printer has been assigned to Cebu Technological University: HP LaserPro123 (SN: ABCD1234).',3,NULL,'printer','1',3,'{\"priority\": \"medium\", \"sender_id\": null, \"reference_id\": \"1\", \"reference_type\": \"printer\"}',0,'2025-12-15 09:37:56','2025-12-15 09:37:56','medium'),(3,'service_request','New Walk-In Service Request','Walk-in customer \"Sanrio Skye\" needs service for Epson printer. Issue: Need now...',4,1,'service_request','1',4,'{\"priority\": \"high\", \"sender_id\": 1, \"reference_id\": 1, \"reference_type\": \"service_request\"}',0,'2025-12-15 10:02:05','2025-12-15 10:02:05','high'),(4,'parts_request','New Parts Request','Fawny Zephy has requested 5 units of HP 680 Ink Cartridge',NULL,4,'parts_request','1',NULL,'{\"priority\": \"medium\", \"sender_id\": 4, \"reference_id\": 1, \"reference_type\": \"parts_request\"}',0,'2025-12-15 10:21:48','2025-12-15 10:21:48','medium'),(5,'parts_approved','Parts Request Approved','Your request for 5 units has been approved and added to your inventory.',4,1,'parts_request','1',4,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"1\", \"reference_type\": \"parts_request\"}',0,'2025-12-15 10:24:12','2025-12-15 10:24:12','medium'),(6,'parts_request','New Parts Request','Fawny Zephy has requested 5 units of Epson 003 Ink Bottle',NULL,4,'parts_request','2',NULL,'{\"priority\": \"medium\", \"sender_id\": 4, \"reference_id\": 2, \"reference_type\": \"parts_request\"}',0,'2025-12-15 10:27:03','2025-12-15 10:27:03','medium'),(7,'parts_approved','Parts Request Approved','Your request for 5 units has been approved and added to your inventory.',4,1,'parts_request','2',4,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"2\", \"reference_type\": \"parts_request\"}',0,'2025-12-15 10:27:13','2025-12-15 10:27:13','medium'),(8,'service_request','Walk-In Service Request In Progress','Technician Fawny Zephy has started working on walk-in service request SR-2025-0001 for Sanrio Skye.',1,4,'service_request','1',1,'{\"priority\": \"medium\", \"sender_id\": 4, \"reference_id\": \"1\", \"reference_type\": \"service_request\"}',0,'2025-12-15 10:27:52','2025-12-15 10:27:52','medium'),(9,'service_request','Walk-In Service Completed - Requires Approval','Technician Fawny Zephy has completed walk-in service request SR-2025-0001 for customer \"Sanrio Skye\". Please review and approve.',1,4,'service_request','1',1,'{\"priority\": \"high\", \"sender_id\": 4, \"reference_id\": \"1\", \"reference_type\": \"service_request\"}',0,'2025-12-15 10:30:37','2025-12-15 10:30:37','high'),(10,'service_approved','Service Completion Approved','Your completed service for Sanrio Skye\'s the printer (Request #SR-2025-0001) has been approved by the institution_admin.',4,1,'service_request','1',4,'{\"priority\": \"high\", \"sender_id\": 1, \"reference_id\": \"1\", \"reference_type\": \"service_request\"}',0,'2025-12-15 10:31:58','2025-12-15 10:31:58','high'),(11,'institution_assigned','New Institution Assigned','You have been assigned to Cebu Technological University',4,1,'institution','INST-001',4,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"INST-001\", \"reference_type\": \"institution\"}',0,'2025-12-15 10:36:16','2025-12-15 10:36:16','medium'),(12,'service_request','New Service Request','New service request for HP LaserPro123. Issue: need now',4,3,'service_request','2',4,'{\"priority\": \"urgent\", \"sender_id\": 3, \"reference_id\": 2, \"reference_type\": \"service_request\"}',0,'2025-12-15 11:09:18','2025-12-15 11:09:18','urgent'),(13,'service_request','Service Request In Progress','Technician Fawny Zephy has started working on service request SR-2025-0002 at Cebu Technological University.',3,4,'service_request','2',3,'{\"priority\": \"medium\", \"sender_id\": 4, \"reference_id\": \"2\", \"reference_type\": \"service_request\"}',0,'2025-12-15 11:09:53','2025-12-15 11:09:53','medium'),(14,'service_request','Service Request In Progress','Technician Fawny Zephy has started working on your service request SR-2025-0002.',3,4,'service_request','2',3,'{\"priority\": \"medium\", \"sender_id\": 4, \"reference_id\": \"2\", \"reference_type\": \"service_request\"}',0,'2025-12-15 11:09:54','2025-12-15 11:09:54','medium'),(15,'service_request','Service Request Pending Your Approval','Technician Fawny Zephy has completed service request SR-2025-0002 at Cebu Technological University. Please review and approve.',3,4,'service_request','2',3,'{\"priority\": \"high\", \"sender_id\": 4, \"reference_id\": \"2\", \"reference_type\": \"service_request\"}',0,'2025-12-15 11:10:17','2025-12-15 11:10:17','high'),(16,'service_approved','Service Completion Approved','Your service completion for request #2 has been approved by John Michael Doe at Cebu Technological University. ',4,3,'service_request','2',NULL,NULL,0,'2025-12-15 11:11:13','2025-12-15 11:11:13','low'),(17,'maintenance_service','New Maintenance Service Submitted','A technician has submitted a maintenance service for HP LaserPro123 at Cebu Technological University',3,NULL,NULL,'1',NULL,NULL,0,'2025-12-15 11:26:12','2025-12-15 11:26:12','medium'),(18,'maintenance_service','Service Rejected','Your Maintenance Service submission has been rejected by the institution_admin',4,NULL,NULL,'1',NULL,NULL,0,'2025-12-15 11:34:57','2025-12-15 11:34:57','medium'),(19,'maintenance_service','New Maintenance Service Submitted','A technician has submitted a maintenance service for HP LaserPro123 at Cebu Technological University',3,NULL,NULL,'2',NULL,NULL,0,'2025-12-15 11:40:35','2025-12-15 11:40:35','medium'),(20,'maintenance_service','Service Rejected','Your Maintenance Service submission has been rejected by the institution_admin',4,NULL,NULL,'3',NULL,NULL,0,'2025-12-15 13:52:10','2025-12-15 13:52:10','medium'),(21,'maintenance_service','New Maintenance Service Submitted','A technician has submitted a maintenance service for HP LaserPro123 at Cebu Technological University',3,NULL,NULL,'4',NULL,NULL,0,'2025-12-15 13:53:50','2025-12-15 13:53:50','medium'),(22,'maintenance_service','Service Rejected','Your Maintenance Service submission has been rejected by the institution_admin',4,NULL,NULL,'4',NULL,NULL,0,'2025-12-15 22:36:59','2025-12-15 22:36:59','medium'),(23,'service_request','New Service Request','New service request for HP LaserPro123. Issue: need nows',4,3,'service_request','3',4,'{\"priority\": \"medium\", \"sender_id\": 3, \"reference_id\": 3, \"reference_type\": \"service_request\"}',0,'2025-12-15 22:41:07','2025-12-15 22:41:07','medium'),(24,'service_request','Service Request In Progress','Technician Fawny Zephy has started working on service request SR-2025-0003 at Cebu Technological University.',3,4,'service_request','3',3,'{\"priority\": \"medium\", \"sender_id\": 4, \"reference_id\": \"3\", \"reference_type\": \"service_request\"}',0,'2025-12-15 22:43:34','2025-12-15 22:43:34','medium'),(25,'service_request','Service Request In Progress','Technician Fawny Zephy has started working on your service request SR-2025-0003.',3,4,'service_request','3',3,'{\"priority\": \"medium\", \"sender_id\": 4, \"reference_id\": \"3\", \"reference_type\": \"service_request\"}',0,'2025-12-15 22:43:34','2025-12-15 22:43:34','medium'),(26,'service_request','Service Request Pending Your Approval','Technician Fawny Zephy has completed service request SR-2025-0003 at Cebu Technological University. Please review and approve.',3,4,'service_request','3',3,'{\"priority\": \"high\", \"sender_id\": 4, \"reference_id\": \"3\", \"reference_type\": \"service_request\"}',0,'2025-12-15 22:44:21','2025-12-15 22:44:21','high');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
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
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
-- Table structure for table `printer_items`
--

DROP TABLE IF EXISTS `printer_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `printer_items` (
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `printer_items`
--

LOCK TABLES `printer_items` WRITE;
/*!40000 ALTER TABLE `printer_items` DISABLE KEYS */;
INSERT INTO `printer_items` VALUES (1,'HP 680 Ink Cartridge','HP','ink','printer_part',95,5,'in_stock','2025-12-15 09:48:00','2025-12-15 10:24:11',0,'pieces',480,NULL,'black'),(2,'Epson 003 Ink Bottle','Epson','ink-bottle','printer_part',95,5,'in_stock','2025-12-15 10:26:37','2025-12-15 10:27:13',0,'pieces',NULL,100.00,'black');
/*!40000 ALTER TABLE `printer_items` ENABLE KEYS */;
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
  `department` varchar(255) DEFAULT NULL,
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
INSERT INTO `printers` VALUES (1,'printer','HP LaserPro123','HP','LaserPro123','ABCD1234',1,'Room 1000','Finance','assigned','2025-12-15 09:30:12','2025-12-15 11:09:18');
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
  `service_id` int NOT NULL,
  `status` enum('pending_approval','approved','rejected','revision_requested') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by` int DEFAULT NULL,
  `technician_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `institution_admin_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `service_type` enum('service_request','maintenance_service') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'service_request',
  PRIMARY KEY (`id`),
  KEY `idx_service_request` (`service_id`),
  KEY `idx_coordinator` (`approved_by`),
  KEY `idx_status` (`status`),
  KEY `idx_submitted_at` (`submitted_at`),
  KEY `idx_service_type_id` (`service_type`,`service_id`),
  CONSTRAINT `service_approvals_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_approvals`
--

LOCK TABLES `service_approvals` WRITE;
/*!40000 ALTER TABLE `service_approvals` DISABLE KEYS */;
INSERT INTO `service_approvals` VALUES (1,1,'approved',1,'done',NULL,'2025-12-15 10:30:37','2025-12-15 10:31:57','service_request'),(2,2,'approved',3,'done',NULL,'2025-12-15 11:10:16','2025-12-15 11:11:12','service_request'),(3,3,'pending_approval',NULL,'donesaaaaaaaa',NULL,'2025-12-15 22:44:20',NULL,'maintenance_service'),(4,4,'rejected',3,NULL,'again','2025-12-15 22:36:59','2025-12-15 22:36:59','maintenance_service');
/*!40000 ALTER TABLE `service_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_items_used`
--

DROP TABLE IF EXISTS `service_items_used`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_items_used` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity_used` int NOT NULL,
  `notes` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `used_by` int NOT NULL,
  `used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_request` (`service_id`),
  KEY `idx_part_id` (`item_id`),
  KEY `idx_used_by` (`used_by`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_items_used`
--

LOCK TABLES `service_items_used` WRITE;
/*!40000 ALTER TABLE `service_items_used` DISABLE KEYS */;
INSERT INTO `service_items_used` VALUES (1,1,2,1,'Used 1 pieces (Brand: Epson)',4,'2025-12-15 10:30:36'),(2,2,1,1,'Used 1 pieces (Brand: HP)',4,'2025-12-15 11:10:16'),(3,3,1,1,'Used 1 pieces (Brand: HP)',4,'2025-12-15 22:44:20');
/*!40000 ALTER TABLE `service_items_used` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_request_history`
--

LOCK TABLES `service_request_history` WRITE;
/*!40000 ALTER TABLE `service_request_history` DISABLE KEYS */;
INSERT INTO `service_request_history` VALUES (1,1,'pending','in_progress',4,'Status updated by technician to in_progress','2025-12-15 10:27:51'),(2,1,'in_progress','pending_approval',4,'Service completion submitted for approval. Actions: done...','2025-12-15 10:30:36'),(3,2,'pending','in_progress',4,'Status updated by technician to in_progress','2025-12-15 11:09:53'),(4,2,'in_progress','pending_approval',4,'Service completion submitted for approval. Actions: done...','2025-12-15 11:10:16'),(5,2,'pending_approval','completed',3,'Service completion approved by Institution Admin - John Michael Doe. ','2025-12-15 11:11:13'),(6,3,'pending','in_progress',4,'Status updated by technician to in_progress','2025-12-15 22:43:34'),(7,3,'in_progress','pending_approval',4,'Service completion submitted for approval. Actions: donesaaaaaaaa...','2025-12-15 22:44:20');
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_requests`
--

LOCK TABLES `service_requests` WRITE;
/*!40000 ALTER TABLE `service_requests` DISABLE KEYS */;
INSERT INTO `service_requests` VALUES (1,'SR-2025-0001',NULL,1,4,'high','completed','Need now','2025-12-15 10:02:05',NULL,'2025-12-15 10:27:51','2025-12-15 10:31:57','Approved by Admin - Marienoll Sari','https://res.cloudinary.com/duodt5wlv/image/upload/v1765794635/serviceease/completion_photos/pudsjt591oew4i7qe6b7.png','Sanrio Skye','Epson',1),(2,'SR-2025-0002','INST-001',3,4,'urgent','completed','need now','2025-12-15 11:09:18',1,'2025-12-15 11:09:53','2025-12-15 11:11:12','Approved by Institution Admin - John Michael Doe','https://res.cloudinary.com/duodt5wlv/image/upload/v1765797015/serviceease/completion_photos/bwxzjhlipc53jvrkcvjh.png',NULL,NULL,0),(3,'SR-2025-0003','INST-001',3,4,'medium','pending_approval','need nows','2025-12-15 22:41:07',1,'2025-12-15 22:43:34',NULL,'donesaaaaaaaa','https://res.cloudinary.com/duodt5wlv/image/upload/v1765838659/serviceease/completion_photos/rjfypaqxoxiwkos1kkih.png',NULL,NULL,0);
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
INSERT INTO `technician_assignments` VALUES (1,4,'INST-001',1,'2025-12-15 10:36:16',1,'2025-12-15 10:36:16','2025-12-15 10:36:16');
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
  `item_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `assigned_by` int DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_technician_part` (`technician_id`,`item_id`),
  KEY `assigned_by` (`assigned_by`),
  KEY `idx_technician_id` (`technician_id`),
  KEY `idx_part_id` (`item_id`),
  KEY `idx_assigned_at` (`assigned_at`),
  CONSTRAINT `technician_inventory_ibfk_1` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `technician_inventory_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `printer_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `technician_inventory_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_inventory`
--

LOCK TABLES `technician_inventory` WRITE;
/*!40000 ALTER TABLE `technician_inventory` DISABLE KEYS */;
INSERT INTO `technician_inventory` VALUES (1,4,1,4,1,'2025-12-15 10:24:11','2025-12-15 11:11:13',NULL),(2,4,2,4,1,'2025-12-15 10:27:13','2025-12-15 10:31:58',NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_upa_user` (`user_id`),
  KEY `fk_upa_printer` (`printer_id`),
  CONSTRAINT `fk_upa_printer` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_upa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_printer_assignments`
--

LOCK TABLES `user_printer_assignments` WRITE;
/*!40000 ALTER TABLE `user_printer_assignments` DISABLE KEYS */;
INSERT INTO `user_printer_assignments` VALUES (1,5,1,'INST-001','2025-12-15 11:44:07');
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Marienoll','Sari','serviceeaseph@gmail.com','$2a$10$lpKHwimaeeoBbQxN.Hfa0etR4Vvpz9SaC4i2VL01LOamJIdQxnE1q','admin',1,'active','2025-08-25 10:22:12','2025-12-13 04:59:45','approved',NULL,NULL,4,0),(3,'John Michael','Doe','markivan.1101@gmail.com','$2b$10$frfwI3U2EauoH9D/kOYiJ.reYkov1CwGBhYIAqh/oZh3mBSa/w7E6','institution_admin',1,'active','2025-12-15 08:14:53','2025-12-15 09:03:33','approved',NULL,NULL,0,0),(4,'Fawny','Zephy','markivan.light@gmail.com','$2b$10$oMo95fQgRcOCtBssIjAKbuo9MaUz1s4L/MIsTXcQ8mQog7B1rA6Ia','technician',1,'active','2025-12-15 08:47:26','2025-12-15 09:57:21','approved',NULL,NULL,1,0),(5,'Sample','Cruz','markivan.storm@gmail.com','$2b$10$qWvNarHxP6YVlkh6uaEo/.ZNpx1b7LhG1apIS4cdyrn10zmqGVBme','institution_user',1,'active','2025-12-15 11:44:05','2025-12-15 11:46:57','approved',NULL,NULL,0,0);
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

-- Dump completed on 2025-12-16  7:12:38
