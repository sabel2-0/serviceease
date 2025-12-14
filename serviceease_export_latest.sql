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
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (29,1,'admin','Created new technician account: John Michael Reyes (markivan.storm@gmail.com)','create','user','11','{\"action\":\"staff_creation\",\"staff_id\":11,\"staff_name\":\"John Michael Reyes\",\"staff_email\":\"markivan.storm@gmail.com\",\"staff_role\":\"technician\",\"status\":\"active\"}','49.145.107.83, 162.158.193.104, 10.22.127.62','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 12:36:59'),(30,1,'admin','Created new user account','create','user',NULL,'{\"method\":\"POST\",\"path\":\"/api/staff\",\"params\":{},\"body\":{\"firstName\":\"John Michael\",\"lastName\":\"Reyes\",\"email\":\"markivan.storm@gmail.com\",\"role\":\"technician\"},\"description\":\"Created new user account\"}','49.145.107.83, 162.158.193.104, 10.22.127.62','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 12:37:00'),(31,11,'technician','Changed temporary password','update','user','11','{\"email\":\"markivan.storm@gmail.com\"}','49.145.107.83, 172.71.218.19, 10.22.114.235','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 12:43:31'),(32,11,'technician','User login','login','user','11','{\"email\":\"markivan.storm@gmail.com\"}','49.145.107.83, 104.23.160.32, 10.22.114.235','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 12:43:42'),(33,1,'admin','Created new operations_officer account: Anna Louise Santos (markivan.light@gmail.com)','create','user','12','{\"action\":\"staff_creation\",\"staff_id\":12,\"staff_name\":\"Anna Louise Santos\",\"staff_email\":\"markivan.light@gmail.com\",\"staff_role\":\"operations_officer\",\"status\":\"active\"}','49.145.107.83, 104.23.160.48, 10.22.114.235','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 12:44:27'),(34,1,'admin','Created new user account','create','user',NULL,'{\"method\":\"POST\",\"path\":\"/api/staff\",\"params\":{},\"body\":{\"firstName\":\"Anna Louise\",\"lastName\":\"Santos\",\"email\":\"markivan.light@gmail.com\",\"role\":\"operations_officer\"},\"description\":\"Created new user account\"}','49.145.107.83, 104.23.160.48, 10.22.114.235','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 12:44:28'),(35,12,'operations_officer','Changed temporary password','update','user','12','{\"email\":\"markivan.light@gmail.com\"}','49.145.107.83, 162.158.179.78, 10.22.127.62','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 12:46:54'),(36,12,'operations_officer','User login','login','user','12','{\"email\":\"markivan.light@gmail.com\"}','49.145.107.83, 104.23.160.72, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 12:47:16'),(37,12,'operations_officer','Created new institution','create','institution',NULL,'{\"method\":\"POST\",\"path\":\"/api/institutions\",\"params\":{},\"body\":{\"name\":\"Pajo Elementary School\",\"type\":\"public_school\",\"address\":\"Pajo Elementary School, Sangi Road, Lapu-Lapu, Central Visayas, Philippines\"},\"description\":\"Created new institution\"}','49.145.107.83, 162.158.179.77, 10.22.127.62','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 12:47:42'),(38,1,'admin','Created new institution','create','institution',NULL,'{\"method\":\"POST\",\"path\":\"/api/institutions\",\"params\":{},\"body\":{\"name\":\"Cebu Technological University\",\"type\":\"public_school\",\"address\":\"Cebu Technological University, M. J. Cuenco Avenue, Cebu City, Central Visayas, Philippines\"},\"description\":\"Created new institution\"}','49.145.107.83, 162.158.193.104, 10.22.127.62','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 12:48:09'),(39,1,'admin','POST /api/technician-assignments','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/technician-assignments\",\"params\":{},\"body\":{\"technician_id\":11,\"institution_id\":\"INST-001\",\"assigned_by\":1},\"description\":\"POST /api/technician-assignments\"}','49.145.107.83, 104.23.160.226, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 12:48:20'),(40,12,'operations_officer','POST /api/technician-assignments','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/technician-assignments\",\"params\":{},\"body\":{\"technician_id\":11,\"institution_id\":\"INST-002\",\"assigned_by\":12},\"description\":\"POST /api/technician-assignments\"}','49.145.107.83, 172.71.218.18, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 12:48:41'),(41,12,'operations_officer','Viewed verification documents for user ID: 13','read','user_documents','13','{\"action\":\"view_documents\",\"timestamp\":\"2025-12-10T12:56:17.109Z\"}','49.145.107.83, 104.23.160.20, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 12:56:18'),(42,12,'operations_officer','POST /api/log-document-view','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/log-document-view\",\"params\":{},\"body\":{\"userId\":\"13\",\"action\":\"view_documents\",\"timestamp\":\"2025-12-10T12:56:17.109Z\"},\"description\":\"POST /api/log-document-view\"}','49.145.107.83, 104.23.160.20, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 12:56:18'),(43,12,'operations_officer','Rejected institution_admin registration: Ethan Robert Cruz (markivan.note@gmail.com)','reject','user','13','{\"action\":\"institution_admin_rejection\",\"user_id\":\"13\",\"user_name\":\"Ethan Robert Cruz\",\"user_email\":\"markivan.note@gmail.com\",\"user_role\":\"institution_admin\",\"previous_status\":\"pending\",\"new_status\":\"rejected\",\"reason\":\"register again\"}','49.145.107.83, 162.158.114.67, 10.22.114.235','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 12:56:31'),(44,12,'operations_officer','POST /api/reject-user/13','reject',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/reject-user/13\",\"params\":{\"userId\":\"13\"},\"body\":{\"reason\":\"register again\"},\"description\":\"POST /api/reject-user/13\"}','49.145.107.83, 162.158.114.67, 10.22.114.235','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 12:56:31'),(45,12,'operations_officer','Viewed verification documents for user ID: 14','read','user_documents','14','{\"action\":\"view_documents\",\"timestamp\":\"2025-12-10T13:08:06.315Z\"}','49.145.107.83, 162.158.114.67, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 13:08:07'),(46,12,'operations_officer','POST /api/log-document-view','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/log-document-view\",\"params\":{},\"body\":{\"userId\":\"14\",\"action\":\"view_documents\",\"timestamp\":\"2025-12-10T13:08:06.315Z\"},\"description\":\"POST /api/log-document-view\"}','49.145.107.83, 162.158.114.67, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 13:08:07'),(47,12,'operations_officer','Rejected institution_admin registration: Ethan Robert Cruz (markivan.note@gmail.com)','reject','user','14','{\"action\":\"institution_admin_rejection\",\"user_id\":\"14\",\"user_name\":\"Ethan Robert Cruz\",\"user_email\":\"markivan.note@gmail.com\",\"user_role\":\"institution_admin\",\"previous_status\":\"pending\",\"new_status\":\"rejected\",\"reason\":\"register again\"}','49.145.107.83, 162.158.114.67, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 13:08:21'),(48,12,'operations_officer','POST /api/reject-user/14','reject',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/reject-user/14\",\"params\":{\"userId\":\"14\"},\"body\":{\"reason\":\"register again\"},\"description\":\"POST /api/reject-user/14\"}','49.145.107.83, 162.158.114.67, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 13:08:21'),(49,1,'admin','Viewed verification documents for user ID: 15','read','user_documents','15','{\"action\":\"view_documents\",\"timestamp\":\"2025-12-10T13:10:47.034Z\"}','49.145.107.83, 162.158.179.194, 10.22.114.235','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 13:10:48'),(50,1,'admin','POST /api/log-document-view','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/log-document-view\",\"params\":{},\"body\":{\"userId\":\"15\",\"action\":\"view_documents\",\"timestamp\":\"2025-12-10T13:10:47.034Z\"},\"description\":\"POST /api/log-document-view\"}','49.145.107.83, 162.158.179.194, 10.22.114.235','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 13:10:48'),(51,1,'admin','Approved institution_admin registration: Ethan Robert Cruz (markivan.note@gmail.com)','approve','user','15','{\"action\":\"institution_admin_approval\",\"user_id\":\"15\",\"user_name\":\"Ethan Robert Cruz\",\"user_email\":\"markivan.note@gmail.com\",\"user_role\":\"institution_admin\",\"previous_status\":\"pending\",\"new_status\":\"approved\"}','49.145.107.83, 104.23.160.130, 10.22.127.62','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-10 13:10:59'),(52,1,'admin','POST /api/approve-user/15','approve',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/approve-user/15\",\"params\":{\"userId\":\"15\"},\"body\":{},\"description\":\"POST /api/approve-user/15\"}','49.145.107.83, 104.23.160.130, 10.22.127.62','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-10 13:10:59'),(53,1,'admin','Added new inventory item','create','inventory',NULL,'{\"method\":\"POST\",\"path\":\"/api/inventory-items\",\"params\":{},\"body\":{\"brand\":\"HP\",\"model\":\"LaserJet Pro M404dn\",\"serial_number\":\"HP-M404-AX92L3\",\"quantity\":1},\"description\":\"Added new inventory item\"}','49.145.107.83, 104.23.160.95, 10.22.127.62','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 13:13:34'),(54,1,'admin','Added new inventory item','create','inventory',NULL,'{\"method\":\"POST\",\"path\":\"/api/inventory-items\",\"params\":{},\"body\":{\"brand\":\"Canon\",\"model\":\"Pixma G3010\",\"serial_number\":\"CN-G3010-FF12X9\",\"quantity\":1},\"description\":\"Added new inventory item\"}','49.145.107.83, 104.23.160.57, 10.22.114.235','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 13:13:54'),(55,1,'admin','Added new inventory item','create','inventory',NULL,'{\"method\":\"POST\",\"path\":\"/api/inventory-items\",\"params\":{},\"body\":{\"brand\":\"Epson\",\"model\":\"EcoTank L3250\",\"serial_number\":\"EP-L3250-QW78B1\",\"quantity\":1},\"description\":\"Added new inventory item\"}','49.145.107.83, 162.158.179.194, 10.22.114.235','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 13:14:12'),(56,1,'admin','Assigned printer to client INST-002','create','printer_assignment','INST-002','{\"method\":\"POST\",\"path\":\"/api/institutions/INST-002/printers\",\"params\":{\"institutionId\":\"INST-002\"},\"body\":{\"printer_id\":\"4\"},\"description\":\"Assigned printer to client INST-002\"}','49.145.107.83, 104.23.160.80, 10.22.127.62','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 13:14:31'),(57,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"part_id\":2,\"quantity_requested\":5,\"reason\":\"need now\",\"priority\":\"urgent\"},\"description\":\"POST /\"}','49.145.107.83, 104.23.160.143, 10.22.182.251','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 13:20:07'),(58,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"part_id\":1,\"quantity_requested\":5,\"reason\":\"need now\",\"priority\":\"medium\"},\"description\":\"POST /\"}','49.145.107.83, 104.23.160.181, 10.22.182.251','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 13:20:19'),(59,12,'operations_officer','PATCH /1','update',NULL,NULL,'{\"method\":\"PATCH\",\"path\":\"/1\",\"params\":{\"id\":\"1\"},\"body\":{\"status\":\"approved\",\"admin_response\":\"\"},\"description\":\"PATCH /1\"}','49.145.107.83, 172.71.218.18, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 13:20:47'),(60,1,'admin','PATCH /2','update',NULL,NULL,'{\"method\":\"PATCH\",\"path\":\"/2\",\"params\":{\"id\":\"2\"},\"body\":{\"status\":\"approved\",\"admin_response\":\"\"},\"description\":\"PATCH /2\"}','49.145.107.83, 162.158.179.194, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 13:21:02'),(61,12,'operations_officer','Created service request','create','service_request',NULL,'{\"method\":\"POST\",\"path\":\"/api/walk-in-service-requests\",\"params\":{},\"body\":{\"walk_in_customer_name\":\"Liam Andre Morales\",\"printer_brand\":\"HP\",\"priority\":\"urgent\",\"issue\":\"Need now\",\"location\":\"Front Desk\"},\"description\":\"Created service request\"}','49.145.107.83, 104.23.160.227, 10.22.127.62','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 13:39:19'),(62,11,'technician','User login','login','user','11','{\"email\":\"markivan.storm@gmail.com\"}','49.145.107.83, 104.23.160.147, 10.22.127.62','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36','2025-12-10 13:40:29'),(63,11,'technician','Updated service request 1','update','service_request','1','{\"method\":\"PUT\",\"path\":\"/service-requests/1/status\",\"params\":{\"requestId\":\"1\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 1\"}','49.145.107.83, 162.158.193.104, 10.22.114.235','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:04:22'),(64,11,'technician','Updated service request 1','update','service_request','1','{\"method\":\"PUT\",\"path\":\"/service-requests/1/status\",\"params\":{\"requestId\":\"1\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 1\"}','49.145.107.83, 172.68.175.95, 10.22.114.235','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:04:24'),(65,11,'technician','Updated service request 2','update','service_request','2','{\"method\":\"PUT\",\"path\":\"/service-requests/2/status\",\"params\":{\"requestId\":\"2\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 2\"}','49.145.107.83, 162.158.193.104, 10.22.114.235','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:05:08'),(66,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"part_id\":3,\"quantity_requested\":7,\"reason\":\"need\",\"priority\":\"urgent\"},\"description\":\"POST /\"}','49.145.107.83, 104.23.160.82, 10.22.114.235','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:07:48'),(67,12,'operations_officer','PATCH /3','update',NULL,NULL,'{\"method\":\"PATCH\",\"path\":\"/3\",\"params\":{\"id\":\"3\"},\"body\":{\"status\":\"approved\",\"admin_response\":\"\"},\"description\":\"PATCH /3\"}','49.145.107.83, 104.23.160.50, 10.22.127.62','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 14:08:03'),(68,12,'operations_officer','Approved service request 1','approve','service_request','1','{\"method\":\"POST\",\"path\":\"/api/service-requests/1/approve-completion\",\"params\":{\"id\":\"1\"},\"body\":{\"approved\":true,\"notes\":null},\"description\":\"Approved service request 1\"}','49.145.107.83, 172.71.218.19, 10.22.114.235','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-10 14:09:34'),(69,11,'technician','Updated service request 3','update','service_request','3','{\"method\":\"PUT\",\"path\":\"/service-requests/3/status\",\"params\":{\"requestId\":\"3\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 3\"}','49.145.107.83, 104.23.160.223, 10.22.127.62','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:36:22'),(70,11,'technician','Updated service request 3','update','service_request','3','{\"method\":\"PUT\",\"path\":\"/service-requests/3/status\",\"params\":{\"requestId\":\"3\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 3\"}','49.145.107.83, 104.23.160.112, 10.22.182.251','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:36:23'),(71,11,'technician','Updated service request 3','update','service_request','3','{\"method\":\"PUT\",\"path\":\"/service-requests/3/status\",\"params\":{\"requestId\":\"3\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 3\"}','49.145.107.83, 162.158.179.194, 10.22.114.235','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:36:24'),(72,11,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.83, 104.23.160.111, 10.22.114.235','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:38:39'),(73,11,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.83, 162.158.179.194, 10.22.127.62','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:39:14'),(74,11,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.83, 104.23.160.230, 10.22.127.62','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:45:32'),(75,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"printer_id\":4,\"institution_id\":\"INST-002\",\"service_description\":\"done\",\"completion_photo\":\"https://res.cloudinary.com/duodt5wlv/image/upload/v1765377932/maintenance_services/i4bouvuqzlu3qkcan4hg.png\",\"parts_used\":[{\"part_id\":3,\"qty\":1,\"unit\":\"pieces\"},{\"part_id\":3,\"qty\":1,\"unit\":\"pieces\"}]},\"description\":\"POST /\"}','49.145.107.83, 104.23.160.246, 10.22.182.251','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 14:45:33'),(76,11,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.107.83, 162.158.193.104, 10.22.114.235','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 15:17:07'),(77,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"printer_id\":4,\"institution_id\":\"INST-002\",\"service_description\":\"done\",\"completion_photo\":\"https://res.cloudinary.com/duodt5wlv/image/upload/v1765379826/maintenance_services/nxkfwqkq9stssx4rwdk3.png\",\"parts_used\":[{\"part_id\":3,\"qty\":1,\"unit\":\"pieces\"}]},\"description\":\"POST /\"}','49.145.107.83, 104.23.160.164, 10.22.182.251','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-10 15:17:08'),(78,1,'admin','User login','login','user','1','{\"email\":\"serviceeaseph@gmail.com\"}','49.145.107.83, 104.23.160.171, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-10 15:20:57'),(79,11,'technician','Updated service request 4','update','service_request','4','{\"method\":\"PUT\",\"path\":\"/service-requests/4/status\",\"params\":{\"requestId\":\"4\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 4\"}','49.145.107.83, 172.71.218.18, 10.22.127.62','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-11 04:48:24'),(80,11,'technician','Updated service request 5','update','service_request','5','{\"method\":\"PUT\",\"path\":\"/service-requests/5/status\",\"params\":{\"requestId\":\"5\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 5\"}','49.145.107.83, 172.68.175.45, 10.22.182.251','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-11 06:04:09'),(81,11,'technician','Updated service request 5','update','service_request','5','{\"method\":\"PUT\",\"path\":\"/service-requests/5/status\",\"params\":{\"requestId\":\"5\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 5\"}','49.145.107.83, 104.23.160.224, 10.22.182.251','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-11 06:04:10'),(82,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"part_id\":3,\"quantity_requested\":10,\"reason\":\"needs\",\"priority\":\"medium\"},\"description\":\"POST /\"}','49.145.107.83, 172.68.174.98, 10.22.114.235','Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/143.0.0.0','2025-12-11 06:09:19'),(83,1,'admin','PATCH /4','update',NULL,NULL,'{\"method\":\"PATCH\",\"path\":\"/4\",\"params\":{\"id\":\"4\"},\"body\":{\"status\":\"approved\",\"admin_response\":\"\"},\"description\":\"PATCH /4\"}','49.145.107.83, 162.158.114.67, 10.22.182.251','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-11 06:09:45'),(84,1,'admin','Assigned printer to client INST-002','create','printer_assignment','INST-002','{\"method\":\"POST\",\"path\":\"/api/institutions/INST-002/printers\",\"params\":{\"institutionId\":\"INST-002\"},\"body\":{\"printer_id\":\"3\"},\"description\":\"Assigned printer to client INST-002\"}','49.145.101.70, 172.68.175.43, 10.22.127.62','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-11 11:53:05'),(85,1,'admin','User login','login','user','1','{\"email\":\"serviceeaseph@gmail.com\"}','49.145.101.70, 104.23.160.178, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-12 10:48:12'),(86,11,'technician','User login','login','user','11','{\"email\":\"markivan.storm@gmail.com\"}','49.145.101.70, 104.23.160.143, 10.23.132.205','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-12 10:48:27'),(87,12,'operations_officer','User login','login','user','12','{\"email\":\"markivan.light@gmail.com\"}','49.145.101.70, 162.158.193.104, 10.22.39.70','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-12 10:48:41'),(88,11,'technician','User login','login','user','11','{\"email\":\"markivan.storm@gmail.com\"}','49.145.101.70, 172.71.218.19, 10.23.132.205','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-12 10:49:40'),(89,1,'admin','POST /verify-captcha','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/verify-captcha\",\"params\":{},\"body\":{\"captchaId\":\"a983938f-ac19-4e6c-b97e-a36f69dc29d1\",\"selectedIndices\":[0,1,2,6]},\"description\":\"POST /verify-captcha\"}','49.145.101.70, 172.68.211.221, 10.23.11.80','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-12 10:52:07'),(90,11,'technician','User login','login','user','11','{\"email\":\"markivan.storm@gmail.com\"}','49.145.101.70, 104.23.160.65, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0','2025-12-12 11:36:28'),(91,11,'technician','Updated service request 8','update','service_request','8','{\"method\":\"PUT\",\"path\":\"/service-requests/8/status\",\"params\":{\"requestId\":\"8\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 8\"}','49.145.101.70, 162.158.114.66, 10.22.39.70','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-12 15:11:26'),(92,11,'technician','Updated service request 9','update','service_request','9','{\"method\":\"PUT\",\"path\":\"/service-requests/9/status\",\"params\":{\"requestId\":\"9\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 9\"}','49.145.101.70, 162.158.114.66, 10.23.11.80','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-12 15:15:35'),(93,11,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.101.70, 172.71.218.19, 10.23.11.80','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-12 15:20:12'),(94,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"printer_id\":4,\"institution_id\":\"INST-002\",\"service_description\":\"DONES\",\"completion_photo\":\"https://res.cloudinary.com/duodt5wlv/image/upload/v1765552811/maintenance_services/f7tecpbpljieiq8ibwww.png\",\"parts_used\":[{\"part_id\":3,\"qty\":1,\"unit\":\"pieces\"}]},\"description\":\"POST /\"}','49.145.101.70, 104.23.160.230, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-12 15:20:13'),(95,11,'technician','User login','login','user','11','{\"email\":\"markivan.storm@gmail.com\"}','49.145.101.70, 162.158.193.105, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-12 23:43:02'),(96,11,'technician','User login','login','user','11','{\"email\":\"markivan.storm@gmail.com\"}','49.145.101.70, 172.71.218.19, 10.22.39.70','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-12 23:51:08'),(97,11,'technician','User login','login','user','11','{\"email\":\"markivan.storm@gmail.com\"}','49.145.101.70, 104.23.160.155, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-12 23:56:25'),(98,11,'technician','User login','login','user','11','{\"email\":\"markivan.storm@gmail.com\"}','49.145.101.70, 104.23.160.121, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-13 00:34:51'),(99,1,'admin','User login','login','user','1','{\"email\":\"serviceeaseph@gmail.com\"}','49.145.101.70, 104.23.160.187, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 00:49:02'),(100,11,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.101.70, 104.23.160.183, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-13 00:53:00'),(101,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"printer_id\":4,\"institution_id\":\"INST-002\",\"service_description\":\"dones\",\"completion_photo\":\"https://res.cloudinary.com/duodt5wlv/image/upload/v1765587179/maintenance_services/xv7koizte4em4ucsvksv.png\",\"parts_used\":[{\"part_id\":3,\"qty\":1,\"unit\":\"pieces\"}]},\"description\":\"POST /\"}','49.145.101.70, 172.68.175.40, 10.23.11.80','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-13 00:53:01'),(102,12,'operations_officer','User login','login','user','12','{\"email\":\"markivan.light@gmail.com\"}','49.145.101.70, 172.71.218.18, 10.23.11.80','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 00:54:07'),(103,1,'admin','Added new inventory item','create','inventory',NULL,'{\"method\":\"POST\",\"path\":\"/api/inventory-items\",\"params\":{},\"body\":{\"brand\":\"Epson\",\"model\":\"LaserPro123\",\"serial_number\":\"ABCD9001\",\"quantity\":1},\"description\":\"Added new inventory item\"}','49.145.101.70, 104.23.160.179, 10.22.39.70','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 01:22:16'),(104,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"part_id\":2,\"quantity_requested\":5,\"reason\":\"need now\",\"priority\":\"medium\"},\"description\":\"POST /\"}','49.145.101.70, 104.23.160.16, 10.22.39.70','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-13 01:23:33'),(105,1,'admin','PATCH /5','update',NULL,NULL,'{\"method\":\"PATCH\",\"path\":\"/5\",\"params\":{\"id\":\"5\"},\"body\":{\"status\":\"approved\",\"admin_response\":\"\"},\"description\":\"PATCH /5\"}','49.145.101.70, 104.23.160.199, 10.23.11.80','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 01:23:44'),(106,12,'operations_officer','Created service request','create','service_request',NULL,'{\"method\":\"POST\",\"path\":\"/api/walk-in-service-requests\",\"params\":{},\"body\":{\"walk_in_customer_name\":\"Test User 3\",\"printer_brand\":\"Canon\",\"priority\":\"urgent\",\"issue\":\"needs\"},\"description\":\"Created service request\"}','49.145.101.70, 104.23.160.168, 10.22.39.70','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 01:25:49'),(107,11,'technician','Updated service request 10','update','service_request','10','{\"method\":\"PUT\",\"path\":\"/service-requests/10/status\",\"params\":{\"requestId\":\"10\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 10\"}','49.145.101.70, 172.71.218.18, 10.23.11.80','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-13 01:26:07'),(108,11,'technician','Updated service request 10','update','service_request','10','{\"method\":\"PUT\",\"path\":\"/service-requests/10/status\",\"params\":{\"requestId\":\"10\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 10\"}','49.145.101.70, 172.71.218.18, 10.23.11.80','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-13 01:26:10'),(109,12,'operations_officer','Approved service request 10','approve','service_request','10','{\"method\":\"POST\",\"path\":\"/api/service-requests/10/approve-completion\",\"params\":{\"id\":\"10\"},\"body\":{\"approved\":true,\"notes\":null},\"description\":\"Approved service request 10\"}','49.145.101.70, 104.23.160.48, 10.23.163.86','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 01:27:01'),(110,12,'operations_officer','Assigned printer to client INST-002','create','printer_assignment','INST-002','{\"method\":\"POST\",\"path\":\"/api/institutions/INST-002/printers\",\"params\":{\"institutionId\":\"INST-002\"},\"body\":{\"printer_id\":\"2\"},\"description\":\"Assigned printer to client INST-002\"}','49.145.101.70, 162.158.193.104, 10.23.11.80','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 01:27:22'),(111,11,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.101.70, 104.23.160.173, 10.23.163.86','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-13 01:30:49'),(112,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"printer_id\":4,\"institution_id\":\"INST-002\",\"service_description\":\"dones\",\"completion_photo\":\"https://res.cloudinary.com/duodt5wlv/image/upload/v1765589448/maintenance_services/y9bzd07zi1jwzrvrkgld.png\",\"parts_used\":[{\"part_id\":3,\"qty\":1,\"unit\":\"pieces\"}]},\"description\":\"POST /\"}','49.145.101.70, 104.23.160.21, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-13 01:30:50'),(113,11,'technician','POST /api/upload-image','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/upload-image\",\"params\":{},\"body\":{},\"description\":\"POST /api/upload-image\"}','49.145.101.70, 104.23.160.158, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-13 02:45:40'),(114,11,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"printer_id\":4,\"institution_id\":\"INST-002\",\"service_description\":\"ers\",\"completion_photo\":\"https://res.cloudinary.com/duodt5wlv/image/upload/v1765593936/maintenance_services/dmdrcgn2bk1qrs3cej6i.png\",\"parts_used\":[{\"part_id\":3,\"qty\":1,\"unit\":\"pieces\"}]},\"description\":\"POST /\"}','49.145.101.70, 162.158.179.194, 10.23.132.205','Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1','2025-12-13 02:45:41'),(115,1,'admin','POST /verify-captcha','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/verify-captcha\",\"params\":{},\"body\":{\"captchaId\":\"7ebe7efc-688e-4ddf-94e8-b5f3110f2522\",\"selectedIndices\":[0,1,3,7]},\"description\":\"POST /verify-captcha\"}','49.145.101.70, 104.23.160.145, 10.22.39.70','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 04:58:20'),(116,1,'admin','POST /request-password-change','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/request-password-change\",\"params\":{},\"body\":{},\"description\":\"POST /request-password-change\"}','49.145.101.70, 104.23.160.28, 10.22.39.70','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 04:58:23'),(117,1,'admin','POST /verify-password-code','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/verify-password-code\",\"params\":{},\"body\":{\"verificationCode\":\"413003\"},\"description\":\"POST /verify-password-code\"}','49.145.101.70, 172.68.211.221, 10.23.11.80','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 04:59:18'),(118,1,'admin','PUT /password','update',NULL,NULL,'{\"method\":\"PUT\",\"path\":\"/password\",\"params\":{},\"body\":{\"currentPassword\":\"Yopop321.\",\"confirmPassword\":\"Admin@123\",\"verificationCode\":\"413003\"},\"description\":\"PUT /password\"}','49.145.101.70, 104.23.160.30, 10.23.132.205','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-13 04:59:46'),(119,1,'admin','User login','login','user','1','{\"email\":\"serviceeaseph@gmail.com\"}','49.145.101.70, 104.23.160.211, 10.22.108.195','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-13 05:00:03'),(120,1,'admin','User login','login','user','1','{\"email\":\"serviceeaseph@gmail.com\"}','222.127.188.93, 104.23.160.226, 10.23.132.205','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 07:57:34'),(121,1,'admin','Created new technician account: sample tec1 (alekrosas28@gmail.com)','create','user','19','{\"action\":\"staff_creation\",\"staff_id\":19,\"staff_name\":\"sample tec1\",\"staff_email\":\"alekrosas28@gmail.com\",\"staff_role\":\"technician\",\"status\":\"active\"}','222.127.188.93, 162.158.136.179, 10.22.39.70','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 07:58:34'),(122,1,'admin','Created new user account','create','user',NULL,'{\"method\":\"POST\",\"path\":\"/api/staff\",\"params\":{},\"body\":{\"firstName\":\"sample\",\"lastName\":\"tec1\",\"email\":\"alekrosas28@gmail.com\",\"role\":\"technician\"},\"description\":\"Created new user account\"}','222.127.188.93, 162.158.136.179, 10.22.39.70','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36','2025-12-13 07:58:35'),(123,19,'technician','Changed temporary password','update','user','19','{\"email\":\"alekrosas28@gmail.com\"}','131.226.111.176, 104.23.160.20, 10.23.11.80','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-13 08:01:06'),(124,1,'admin','User login','login','user','1','{\"email\":\"serviceeaseph@gmail.com\"}','222.127.188.93, 104.23.160.115, 10.22.39.70','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:02:27'),(125,19,'technician','User login','login','user','19','{\"email\":\"alekrosas28@gmail.com\"}','131.226.111.176, 172.68.174.103, 10.22.39.70','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-13 08:04:19'),(126,1,'admin','Approved institution_admin registration: arch cabanero (archcabanero0@gmail.com)','approve','user','20','{\"action\":\"institution_admin_approval\",\"user_id\":\"20\",\"user_name\":\"arch cabanero\",\"user_email\":\"archcabanero0@gmail.com\",\"user_role\":\"institution_admin\",\"previous_status\":\"pending\",\"new_status\":\"approved\"}','222.127.188.93, 172.68.174.250, 10.23.11.80','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:08:54'),(127,1,'admin','POST /api/approve-user/20','approve',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/approve-user/20\",\"params\":{\"userId\":\"20\"},\"body\":{},\"description\":\"POST /api/approve-user/20\"}','222.127.188.93, 172.68.174.250, 10.23.11.80','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:08:54'),(128,1,'admin','Added new inventory item','create','inventory',NULL,'{\"method\":\"POST\",\"path\":\"/api/inventory-items\",\"params\":{},\"body\":{\"brand\":\"HP SMART TANK\",\"model\":\"500\",\"serial_number\":\"CN0C234000\",\"quantity\":1},\"description\":\"Added new inventory item\"}','222.127.188.93, 162.158.136.179, 10.22.39.70','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:11:09'),(129,1,'admin','Assigned printer to client INST-002','create','printer_assignment','INST-002','{\"method\":\"POST\",\"path\":\"/api/institutions/INST-002/printers\",\"params\":{\"institutionId\":\"INST-002\"},\"body\":{\"printer_id\":\"6\"},\"description\":\"Assigned printer to client INST-002\"}','222.127.188.93, 104.23.160.164, 10.22.39.70','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:12:47'),(130,1,'admin','Assigned printer to client INST-001','create','printer_assignment','INST-001','{\"method\":\"POST\",\"path\":\"/api/institutions/INST-001/printers\",\"params\":{\"institutionId\":\"INST-001\"},\"body\":{\"printer_id\":\"5\"},\"description\":\"Assigned printer to client INST-001\"}','222.127.188.93, 172.68.174.218, 10.23.11.80','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:13:44'),(131,1,'admin','Created new operations_officer account: MARIENOLL SARI (sarimarienoll@gmail.com)','create','user','21','{\"action\":\"staff_creation\",\"staff_id\":21,\"staff_name\":\"MARIENOLL SARI\",\"staff_email\":\"sarimarienoll@gmail.com\",\"staff_role\":\"operations_officer\",\"status\":\"active\"}','222.127.188.93, 104.23.160.83, 10.23.11.80','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:24:46'),(132,1,'admin','Created new user account','create','user',NULL,'{\"method\":\"POST\",\"path\":\"/api/staff\",\"params\":{},\"body\":{\"firstName\":\"MARIENOLL\",\"lastName\":\"SARI\",\"email\":\"sarimarienoll@gmail.com\",\"role\":\"operations_officer\"},\"description\":\"Created new user account\"}','222.127.188.93, 104.23.160.83, 10.23.11.80','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:24:47'),(133,1,'admin','POST /api/technician-assignments','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/api/technician-assignments\",\"params\":{},\"body\":{\"technician_id\":19,\"institution_id\":\"INST-001\",\"assigned_by\":1},\"description\":\"POST /api/technician-assignments\"}','222.127.188.93, 162.158.136.178, 10.22.39.70','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:26:28'),(134,19,'technician','POST /','create',NULL,NULL,'{\"method\":\"POST\",\"path\":\"/\",\"params\":{},\"body\":{\"part_id\":3,\"quantity_requested\":1,\"reason\":\"For printer refill\",\"priority\":\"medium\"},\"description\":\"POST /\"}','222.127.188.93, 172.68.175.101, 10.23.11.80','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-13 08:29:23'),(135,1,'admin','PATCH /6','update',NULL,NULL,'{\"method\":\"PATCH\",\"path\":\"/6\",\"params\":{\"id\":\"6\"},\"body\":{\"status\":\"approved\",\"admin_response\":\"SVXAABDSB\"},\"description\":\"PATCH /6\"}','222.127.188.93, 104.23.160.6, 10.23.132.205','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:30:08'),(136,1,'admin','PATCH /6','update',NULL,NULL,'{\"method\":\"PATCH\",\"path\":\"/6\",\"params\":{\"id\":\"6\"},\"body\":{\"status\":\"approved\",\"admin_response\":\"SVXAABDSB\"},\"description\":\"PATCH /6\"}','222.127.188.93, 104.23.160.210, 10.23.132.205','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36','2025-12-13 08:30:09'),(137,19,'technician','Updated service request 22','update','service_request','22','{\"method\":\"PUT\",\"path\":\"/service-requests/22/status\",\"params\":{\"requestId\":\"22\"},\"body\":{\"status\":\"in_progress\"},\"description\":\"Updated service request 22\"}','222.127.188.93, 104.23.160.246, 10.23.11.80','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','2025-12-13 08:30:44');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `institution_printer_assignments`
--

LOCK TABLES `institution_printer_assignments` WRITE;
/*!40000 ALTER TABLE `institution_printer_assignments` DISABLE KEYS */;
INSERT INTO `institution_printer_assignments` VALUES (2,'INST-002',4,'2025-12-10 13:14:31','assigned',NULL),(3,'INST-002',3,'2025-12-11 11:53:05','assigned',NULL),(4,'INST-002',2,'2025-12-13 01:27:21','assigned',NULL),(5,'INST-002',6,'2025-12-13 08:12:46','assigned',NULL),(6,'INST-001',5,'2025-12-13 08:13:44','assigned',NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `institutions`
--

LOCK TABLES `institutions` WRITE;
/*!40000 ALTER TABLE `institutions` DISABLE KEYS */;
INSERT INTO `institutions` VALUES (41,'INST-001',20,'Pajo Elementary School','public_school','Pajo Elementary School, Sangi Road, Lapu-Lapu, Central Visayas, Philippines','2025-12-10 12:47:42','2025-12-13 08:08:53','active',NULL),(42,'INST-002',15,'Cebu Technological University','public_school','Cebu Technological University, M. J. Cuenco Avenue, Cebu City, Central Visayas, Philippines','2025-12-10 12:48:09','2025-12-10 13:10:58','active',NULL);
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
  `parts_used` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `completion_photo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by_user_id` int DEFAULT NULL COMMENT 'User ID of approver (can be institution_admin or institution_user)',
  `approval_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Notes from approver (institution_admin or institution_user)',
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_services`
--

LOCK TABLES `maintenance_services` WRITE;
/*!40000 ALTER TABLE `maintenance_services` DISABLE KEYS */;
INSERT INTO `maintenance_services` VALUES (1,11,4,'INST-002','done','[{\"part_id\":3,\"name\":\"Epson 664 Magenta Ink Bottle\",\"brand\":\"Epson\",\"qty\":1,\"unit\":\"pieces\"},{\"part_id\":3,\"name\":\"Epson 664 Magenta Ink Bottle\",\"brand\":\"Epson\",\"qty\":1,\"unit\":\"pieces\"}]','https://res.cloudinary.com/duodt5wlv/image/upload/v1765377932/maintenance_services/i4bouvuqzlu3qkcan4hg.png','completed',17,NULL,'2025-12-10 14:45:33','2025-12-10 15:11:49','2025-12-10 15:11:49'),(2,11,4,'INST-002','done','[{\"part_id\":3,\"name\":\"Epson 664 Magenta Ink Bottle\",\"brand\":\"Epson\",\"qty\":1,\"unit\":\"pieces\"}]','https://res.cloudinary.com/duodt5wlv/image/upload/v1765379826/maintenance_services/nxkfwqkq9stssx4rwdk3.png','completed',15,NULL,'2025-12-10 15:17:08','2025-12-10 15:18:18','2025-12-10 15:18:18'),(3,11,4,'INST-002','DONES','[{\"part_id\":3,\"name\":\"Epson 664 Magenta Ink Bottle\",\"brand\":\"Epson\",\"qty\":1,\"unit\":\"pieces\"}]','https://res.cloudinary.com/duodt5wlv/image/upload/v1765552811/maintenance_services/f7tecpbpljieiq8ibwww.png','completed',17,NULL,'2025-12-12 15:20:13','2025-12-12 15:20:33','2025-12-12 15:20:33'),(4,11,4,'INST-002','dones','[{\"part_id\":3,\"name\":\"Epson 664 Magenta Ink Bottle\",\"brand\":\"Epson\",\"qty\":1,\"unit\":\"pieces\"}]','https://res.cloudinary.com/duodt5wlv/image/upload/v1765587179/maintenance_services/xv7koizte4em4ucsvksv.png','completed',15,NULL,'2025-12-13 00:53:01','2025-12-13 01:17:04','2025-12-13 01:17:04'),(6,11,4,'INST-002','ers','[{\"part_id\":3,\"name\":\"Epson 664 Magenta Ink Bottle\",\"brand\":\"Epson\",\"qty\":1,\"unit\":\"pieces\"}]','https://res.cloudinary.com/duodt5wlv/image/upload/v1765593936/maintenance_services/dmdrcgn2bk1qrs3cej6i.png','pending',NULL,NULL,'2025-12-13 02:45:41',NULL,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (2,'institution_assigned','New Institution Assigned','You have been assigned to Pajo Elementary School',11,1,'institution','INST-001',11,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"INST-001\", \"reference_type\": \"institution\"}',0,'2025-12-10 12:48:20','2025-12-10 12:48:20','medium'),(3,'institution_assigned','New Institution Assigned','You have been assigned to Cebu Technological University',11,12,'institution','INST-002',11,'{\"priority\": \"medium\", \"sender_id\": 12, \"reference_id\": \"INST-002\", \"reference_type\": \"institution\"}',0,'2025-12-10 12:48:41','2025-12-10 12:48:41','medium'),(4,'institution_admin_registration','New institution_admin Registration','Ethan Robert Cruz from Cebu Technological University has registered and is awaiting approval.',NULL,NULL,NULL,NULL,NULL,'{\"email\": \"markivan.note@gmail.com\", \"institution_id\": \"INST-002\", \"institution_name\": \"Cebu Technological University\", \"institution_type\": \"public_school\", \"institution_address\": \"Cebu Technological University, M. J. Cuenco Avenue, Cebu City, Central Visayas, Philippines\"}',0,'2025-12-10 12:51:41','2025-12-10 12:51:41','medium'),(5,'institution_admin_registration','New institution_admin Registration','Ethan Robert Cruz from Cebu Technological University has registered and is awaiting approval.',NULL,NULL,NULL,NULL,NULL,'{\"email\": \"markivan.note@gmail.com\", \"institution_id\": \"INST-002\", \"institution_name\": \"Cebu Technological University\", \"institution_type\": \"public_school\", \"institution_address\": \"Cebu Technological University, M. J. Cuenco Avenue, Cebu City, Central Visayas, Philippines\"}',0,'2025-12-10 13:07:32','2025-12-10 13:07:32','medium'),(6,'institution_admin_registration','New institution_admin Registration','Ethan Robert Cruz from Cebu Technological University has registered and is awaiting approval.',NULL,NULL,NULL,NULL,15,'{\"email\": \"markivan.note@gmail.com\", \"institution_id\": \"INST-002\", \"institution_name\": \"Cebu Technological University\", \"institution_type\": \"public_school\", \"institution_address\": \"Cebu Technological University, M. J. Cuenco Avenue, Cebu City, Central Visayas, Philippines\"}',0,'2025-12-10 13:10:26','2025-12-10 13:10:26','medium'),(7,'info','New Printer Assigned to Your Institution','A printer has been assigned to Cebu Technological University: Epson EcoTank L3250 (SN: EP-L3250-QW78B1).',15,NULL,'printer','4',15,'{\"priority\": \"medium\", \"sender_id\": null, \"reference_id\": \"4\", \"reference_type\": \"printer\"}',0,'2025-12-10 13:14:31','2025-12-10 13:14:31','medium'),(8,'parts_request','New Parts Request','John Michael Reyes has requested 5 units of Canon PG-47 Black Ink Cartridge',NULL,11,'parts_request','1',NULL,'{\"priority\": \"urgent\", \"sender_id\": 11, \"reference_id\": 1, \"reference_type\": \"parts_request\"}',0,'2025-12-10 13:20:07','2025-12-10 13:20:07','urgent'),(9,'parts_request','New Parts Request','John Michael Reyes has requested 5 units of HP 26A Black LaserJet Toner Cartridge',NULL,11,'parts_request','2',NULL,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": 2, \"reference_type\": \"parts_request\"}',0,'2025-12-10 13:20:19','2025-12-10 13:20:19','medium'),(10,'parts_approved','Parts Request Approved','Your request for 5 units has been approved and added to your inventory.',11,12,'parts_request','1',11,'{\"priority\": \"medium\", \"sender_id\": 12, \"reference_id\": \"1\", \"reference_type\": \"parts_request\"}',0,'2025-12-10 13:20:47','2025-12-10 13:20:47','medium'),(11,'parts_approved','Parts Request Approved','Your request for 5 units has been approved and added to your inventory.',11,1,'parts_request','2',11,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"2\", \"reference_type\": \"parts_request\"}',0,'2025-12-10 13:21:01','2025-12-10 13:21:01','medium'),(12,'service_request','New Walk-In Service Request','Walk-in customer \"Liam Andre Morales\" needs service for HP printer. Issue: Need now...',11,12,'service_request','1',11,'{\"priority\": \"urgent\", \"sender_id\": 12, \"reference_id\": 1, \"reference_type\": \"service_request\"}',0,'2025-12-10 13:39:19','2025-12-10 13:39:19','urgent'),(13,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: need now',11,15,'service_request','2',11,'{\"priority\": \"urgent\", \"sender_id\": 15, \"reference_id\": 2, \"reference_type\": \"service_request\"}',0,'2025-12-10 13:43:55','2025-12-10 13:43:55','urgent'),(14,'service_request','Walk-In Service Request In Progress','Technician John Michael Reyes has started working on walk-in service request SR-2025-0001 for Liam Andre Morales.',1,11,'service_request','1',1,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"1\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:04:22','2025-12-10 14:04:22','medium'),(15,'service_request','Walk-In Service Request In Progress','Technician John Michael Reyes has started working on walk-in service request SR-2025-0001 for Liam Andre Morales.',12,11,'service_request','1',12,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"1\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:04:22','2025-12-10 14:04:22','medium'),(16,'service_request','Walk-In Service Completed - Requires Approval','Technician John Michael Reyes has completed walk-in service request SR-2025-0001 for customer \"Liam Andre Morales\". Please review and approve.',1,11,'service_request','1',1,'{\"priority\": \"high\", \"sender_id\": 11, \"reference_id\": \"1\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:04:49','2025-12-10 14:04:49','high'),(17,'service_request','Walk-In Service Completed - Requires Approval','Technician John Michael Reyes has completed walk-in service request SR-2025-0001 for customer \"Liam Andre Morales\". Please review and approve.',12,11,'service_request','1',12,'{\"priority\": \"high\", \"sender_id\": 11, \"reference_id\": \"1\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:04:49','2025-12-10 14:04:49','high'),(18,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on service request SR-2025-0002 at Cebu Technological University.',15,11,'service_request','2',15,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"2\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:05:07','2025-12-10 14:05:08','medium'),(19,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on your service request SR-2025-0002.',15,11,'service_request','2',15,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"2\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:05:08','2025-12-10 14:05:08','medium'),(20,'parts_request','New Parts Request','John Michael Reyes has requested 7 units of Epson 664 Magenta Ink Bottle',NULL,11,'parts_request','3',NULL,'{\"priority\": \"urgent\", \"sender_id\": 11, \"reference_id\": 3, \"reference_type\": \"parts_request\"}',0,'2025-12-10 14:07:48','2025-12-10 14:07:48','urgent'),(21,'parts_approved','Parts Request Approved','Your request for 7 units has been approved and added to your inventory.',11,12,'parts_request','3',11,'{\"priority\": \"medium\", \"sender_id\": 12, \"reference_id\": \"3\", \"reference_type\": \"parts_request\"}',0,'2025-12-10 14:08:03','2025-12-10 14:08:03','medium'),(22,'service_request','Service Request Pending Your Approval','Technician John Michael Reyes has completed service request SR-2025-0002 at Cebu Technological University. Please review and approve.',15,11,'service_request','2',15,'{\"priority\": \"high\", \"sender_id\": 11, \"reference_id\": \"2\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:09:04','2025-12-10 14:09:04','high'),(23,'service_approved','Service Completion Approved','Your completed service for Liam Andre Morales\'s the printer (Request #SR-2025-0001) has been approved by the institution_admin.',11,12,'service_request','1',11,'{\"priority\": \"high\", \"sender_id\": 12, \"reference_id\": \"1\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:09:34','2025-12-10 14:09:34','high'),(24,'institution_user_registration','New institution_user Registration','Sunny Bird has registered and is awaiting your approval.',15,NULL,NULL,'17',NULL,NULL,0,'2025-12-10 14:12:05','2025-12-10 14:12:05','medium'),(25,'service_approved','Service Completion Approved','Your service completion for request #2 has been approved by Ethan Robert Cruz at Cebu Technological University. ',11,15,'service_request','2',NULL,NULL,0,'2025-12-10 14:35:24','2025-12-10 14:35:24','low'),(26,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: need',11,17,'service_request','3',11,'{\"priority\": \"high\", \"sender_id\": 17, \"reference_id\": 3, \"reference_type\": \"service_request\"}',0,'2025-12-10 14:36:06','2025-12-10 14:36:06','high'),(27,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on service request SR-2025-0003 at Cebu Technological University.',15,11,'service_request','3',15,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"3\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:36:22','2025-12-10 14:36:22','medium'),(28,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on your service request SR-2025-0003.',17,11,'service_request','3',17,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"3\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:36:22','2025-12-10 14:36:22','medium'),(29,'service_request','Service Request Pending Your Approval','Technician John Michael Reyes has completed service request SR-2025-0003 at Cebu Technological University. Please review and approve.',15,11,'service_request','3',15,'{\"priority\": \"high\", \"sender_id\": 11, \"reference_id\": \"3\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:36:53','2025-12-10 14:36:53','high'),(30,'success','Service Request Approved','Sunny Bird approved your completed work on SR-2025-0003',11,17,'service_request','3',11,'{\"priority\": \"high\", \"sender_id\": 17, \"reference_id\": \"3\", \"reference_type\": \"service_request\"}',0,'2025-12-10 14:37:18','2025-12-10 14:37:18','high'),(31,'maintenance_service','New Maintenance Service Submitted','A technician has submitted a maintenance service for Epson EcoTank L3250 at Cebu Technological University',15,NULL,NULL,'1',NULL,NULL,0,'2025-12-10 14:45:33','2025-12-10 14:45:33','medium'),(32,'maintenance_service','Maintenance Service Pending','A technician has performed service on your printer. Awaiting institution_admin approval.',16,NULL,NULL,'1',NULL,NULL,0,'2025-12-10 14:45:33','2025-12-10 14:45:33','medium'),(33,'maintenance_service','Maintenance Service Approved','Your Maintenance Service has been approved by the institution_user',11,NULL,NULL,'1',NULL,NULL,0,'2025-12-10 15:11:49','2025-12-10 15:11:49','medium'),(34,'maintenance_service','New Maintenance Service Submitted','A technician has submitted a maintenance service for Epson EcoTank L3250 at Cebu Technological University',15,NULL,NULL,'2',NULL,NULL,0,'2025-12-10 15:17:08','2025-12-10 15:17:08','medium'),(35,'maintenance_service','Maintenance Service Pending','A technician has performed service on your printer. Awaiting institution_admin approval.',16,NULL,NULL,'2',NULL,NULL,0,'2025-12-10 15:17:08','2025-12-10 15:17:08','medium'),(36,'maintenance_service','Maintenance Service Approved','Your maintenance service has been approved by the institution_admin and is now completed',11,NULL,NULL,'2',NULL,NULL,0,'2025-12-10 15:18:18','2025-12-10 15:18:18','medium'),(37,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: pls help',11,15,'service_request','4',11,'{\"priority\": \"urgent\", \"sender_id\": 15, \"reference_id\": 4, \"reference_type\": \"service_request\"}',0,'2025-12-11 03:05:28','2025-12-11 03:05:28','urgent'),(38,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on service request SR-2025-0004 at Cebu Technological University.',15,11,'service_request','4',15,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"4\", \"reference_type\": \"service_request\"}',0,'2025-12-11 04:48:23','2025-12-11 04:48:23','medium'),(39,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on your service request SR-2025-0004.',15,11,'service_request','4',15,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"4\", \"reference_type\": \"service_request\"}',0,'2025-12-11 04:48:24','2025-12-11 04:48:24','medium'),(40,'service_request','Service Request Pending Your Approval','Technician John Michael Reyes has completed service request SR-2025-0004 at Cebu Technological University. Please review and approve.',15,11,'service_request','4',15,'{\"priority\": \"high\", \"sender_id\": 11, \"reference_id\": \"4\", \"reference_type\": \"service_request\"}',0,'2025-12-11 04:48:44','2025-12-11 04:48:45','high'),(41,'service_approved','Service Completion Approved','Your service completion for request #4 has been approved by Ethan Robert Cruz at Cebu Technological University. ',11,15,'service_request','4',NULL,NULL,0,'2025-12-11 04:56:15','2025-12-11 04:56:15','low'),(42,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: nweee',11,15,'service_request','5',11,'{\"priority\": \"urgent\", \"sender_id\": 15, \"reference_id\": 5, \"reference_type\": \"service_request\"}',0,'2025-12-11 06:03:18','2025-12-11 06:03:18','urgent'),(43,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on service request SR-2025-0005 at Cebu Technological University.',15,11,'service_request','5',15,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"5\", \"reference_type\": \"service_request\"}',0,'2025-12-11 06:04:08','2025-12-11 06:04:09','medium'),(44,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on your service request SR-2025-0005.',15,11,'service_request','5',15,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"5\", \"reference_type\": \"service_request\"}',0,'2025-12-11 06:04:09','2025-12-11 06:04:09','medium'),(45,'service_request','Service Request Pending Your Approval','Technician John Michael Reyes has completed service request SR-2025-0005 at Cebu Technological University. Please review and approve.',15,11,'service_request','5',15,'{\"priority\": \"high\", \"sender_id\": 11, \"reference_id\": \"5\", \"reference_type\": \"service_request\"}',0,'2025-12-11 06:04:38','2025-12-11 06:04:38','high'),(46,'service_approved','Service Completion Approved','Your service completion for request #5 has been approved by Ethan Robert Cruz at Cebu Technological University. ',11,15,'service_request','5',NULL,NULL,0,'2025-12-11 06:04:59','2025-12-11 06:04:59','low'),(47,'parts_request','New Parts Request','John Michael Reyes has requested 10 units of Epson 664 Magenta Ink Bottle',NULL,11,'parts_request','4',NULL,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": 4, \"reference_type\": \"parts_request\"}',0,'2025-12-11 06:09:18','2025-12-11 06:09:19','medium'),(48,'parts_approved','Parts Request Approved','Your request for 10 units has been approved and added to your inventory.',11,1,'parts_request','4',11,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"4\", \"reference_type\": \"parts_request\"}',0,'2025-12-11 06:09:45','2025-12-11 06:09:45','medium'),(49,'info','New Printer Assigned to Your Institution','A printer has been assigned to Cebu Technological University: Canon Pixma G3010 (SN: CN-G3010-FF12X9).',15,NULL,'printer','3',15,'{\"priority\": \"medium\", \"sender_id\": null, \"reference_id\": \"3\", \"reference_type\": \"printer\"}',0,'2025-12-11 11:53:05','2025-12-11 11:53:05','medium'),(50,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: need now',11,17,'service_request','6',11,'{\"priority\": \"high\", \"sender_id\": 17, \"reference_id\": 6, \"reference_type\": \"service_request\"}',0,'2025-12-12 11:28:11','2025-12-12 11:28:11','high'),(51,'info','New Printer Assigned','institution_admin Ethan Robert Cruz has assigned you a new printer: Canon Pixma G3010 (SN: CN-G3010-FF12X9)',17,15,'printer','3',17,'{\"priority\": \"medium\", \"sender_id\": 15, \"reference_id\": 3, \"reference_type\": \"printer\"}',0,'2025-12-12 11:59:00','2025-12-12 11:59:00','medium'),(52,'service_request','New Service Request','New service request for Canon Pixma G3010. Issue: need now',11,15,'service_request','7',11,'{\"priority\": \"urgent\", \"sender_id\": 15, \"reference_id\": 7, \"reference_type\": \"service_request\"}',0,'2025-12-12 14:43:47','2025-12-12 14:43:47','urgent'),(53,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: NEEEDS',11,15,'service_request','8',11,'{\"priority\": \"high\", \"sender_id\": 15, \"reference_id\": 8, \"reference_type\": \"service_request\"}',0,'2025-12-12 15:11:01','2025-12-12 15:11:01','high'),(54,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on service request SR-2025-0006 at Cebu Technological University.',15,11,'service_request','8',15,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"8\", \"reference_type\": \"service_request\"}',0,'2025-12-12 15:11:25','2025-12-12 15:11:25','medium'),(55,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on your service request SR-2025-0006.',15,11,'service_request','8',15,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"8\", \"reference_type\": \"service_request\"}',0,'2025-12-12 15:11:25','2025-12-12 15:11:26','medium'),(56,'service_request','Service Request Pending Your Approval','Technician John Michael Reyes has completed service request SR-2025-0006 at Cebu Technological University. Please review and approve.',15,11,'service_request','8',15,'{\"priority\": \"high\", \"sender_id\": 11, \"reference_id\": \"8\", \"reference_type\": \"service_request\"}',0,'2025-12-12 15:12:15','2025-12-12 15:12:15','high'),(57,'service_approved','Service Completion Approved','Your service completion for request #8 has been approved by Ethan Robert Cruz at Cebu Technological University. ',11,15,'service_request','8',NULL,NULL,0,'2025-12-12 15:13:30','2025-12-12 15:13:30','low'),(58,'service_request','New Service Request','New service request for Canon Pixma G3010. Issue: NEED NOWS',11,17,'service_request','9',11,'{\"priority\": \"urgent\", \"sender_id\": 17, \"reference_id\": 9, \"reference_type\": \"service_request\"}',0,'2025-12-12 15:15:15','2025-12-12 15:15:15','urgent'),(59,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on service request SR-2025-0007 at Cebu Technological University.',15,11,'service_request','9',15,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"9\", \"reference_type\": \"service_request\"}',0,'2025-12-12 15:15:35','2025-12-12 15:15:35','medium'),(60,'service_request','Service Request In Progress','Technician John Michael Reyes has started working on your service request SR-2025-0007.',17,11,'service_request','9',17,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"9\", \"reference_type\": \"service_request\"}',0,'2025-12-12 15:15:35','2025-12-12 15:15:35','medium'),(61,'service_request','Service Request Pending Your Approval','Technician John Michael Reyes has completed service request SR-2025-0007 at Cebu Technological University. Please review and approve.',15,11,'service_request','9',15,'{\"priority\": \"high\", \"sender_id\": 11, \"reference_id\": \"9\", \"reference_type\": \"service_request\"}',0,'2025-12-12 15:16:01','2025-12-12 15:16:01','high'),(62,'success','Service Request Approved','Sunny Bird approved your completed work on SR-2025-0007',11,17,'service_request','9',11,'{\"priority\": \"high\", \"sender_id\": 17, \"reference_id\": \"9\", \"reference_type\": \"service_request\"}',0,'2025-12-12 15:16:49','2025-12-12 15:16:49','high'),(63,'maintenance_service','New Maintenance Service Submitted','A technician has submitted a maintenance service for Epson EcoTank L3250 at Cebu Technological University',15,NULL,NULL,'3',NULL,NULL,0,'2025-12-12 15:20:13','2025-12-12 15:20:13','medium'),(64,'maintenance_service','Maintenance Service Pending','A technician has performed service on your printer. Awaiting institution_admin approval.',16,NULL,NULL,'3',NULL,NULL,0,'2025-12-12 15:20:13','2025-12-12 15:20:13','medium'),(65,'maintenance_service','Maintenance Service Approved','Your Maintenance Service has been approved by the institution_user',11,NULL,NULL,'3',NULL,NULL,0,'2025-12-12 15:20:33','2025-12-12 15:20:33','medium'),(66,'institution_user_registration','New institution_user Registration','Sofia Marie Gab has registered and is awaiting your approval.',15,NULL,NULL,'18',NULL,NULL,0,'2025-12-12 15:32:34','2025-12-12 15:32:34','medium'),(67,'maintenance_service','New Maintenance Service Submitted','A technician has submitted a maintenance service for Epson EcoTank L3250 at Cebu Technological University',15,NULL,NULL,'4',NULL,NULL,0,'2025-12-13 00:53:01','2025-12-13 00:53:01','medium'),(68,'maintenance_service','Maintenance Service Pending','A technician has performed service on your printer. Awaiting institution_admin approval.',16,NULL,NULL,'4',NULL,NULL,0,'2025-12-13 00:53:01','2025-12-13 00:53:01','medium'),(69,'maintenance_service','Maintenance Service Approved','Your maintenance service has been approved by the institution_admin and is now completed',11,NULL,NULL,'4',NULL,NULL,0,'2025-12-13 01:17:04','2025-12-13 01:17:04','medium'),(70,'parts_request','New Parts Request','John Michael Reyes has requested 5 units of Canon PG-47 Black Ink Cartridge',NULL,11,'parts_request','5',NULL,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": 5, \"reference_type\": \"parts_request\"}',0,'2025-12-13 01:23:33','2025-12-13 01:23:33','medium'),(71,'parts_approved','Parts Request Approved','Your request for 5 units has been approved and added to your inventory.',11,1,'parts_request','5',11,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"5\", \"reference_type\": \"parts_request\"}',0,'2025-12-13 01:23:44','2025-12-13 01:23:44','medium'),(72,'service_request','New Walk-In Service Request','Walk-in customer \"Test User 3\" needs service for Canon printer. Issue: needs...',11,12,'service_request','10',11,'{\"priority\": \"urgent\", \"sender_id\": 12, \"reference_id\": 10, \"reference_type\": \"service_request\"}',0,'2025-12-13 01:25:49','2025-12-13 01:25:49','urgent'),(73,'service_request','Walk-In Service Request In Progress','Technician John Michael Reyes has started working on walk-in service request SR-2025-0008 for Test User 3.',1,11,'service_request','10',1,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"10\", \"reference_type\": \"service_request\"}',0,'2025-12-13 01:26:07','2025-12-13 01:26:07','medium'),(74,'service_request','Walk-In Service Request In Progress','Technician John Michael Reyes has started working on walk-in service request SR-2025-0008 for Test User 3.',12,11,'service_request','10',12,'{\"priority\": \"medium\", \"sender_id\": 11, \"reference_id\": \"10\", \"reference_type\": \"service_request\"}',0,'2025-12-13 01:26:07','2025-12-13 01:26:07','medium'),(75,'service_request','Walk-In Service Completed - Requires Approval','Technician John Michael Reyes has completed walk-in service request SR-2025-0008 for customer \"Test User 3\". Please review and approve.',1,11,'service_request','10',1,'{\"priority\": \"high\", \"sender_id\": 11, \"reference_id\": \"10\", \"reference_type\": \"service_request\"}',0,'2025-12-13 01:26:32','2025-12-13 01:26:32','high'),(76,'service_request','Walk-In Service Completed - Requires Approval','Technician John Michael Reyes has completed walk-in service request SR-2025-0008 for customer \"Test User 3\". Please review and approve.',12,11,'service_request','10',12,'{\"priority\": \"high\", \"sender_id\": 11, \"reference_id\": \"10\", \"reference_type\": \"service_request\"}',0,'2025-12-13 01:26:32','2025-12-13 01:26:32','high'),(77,'service_approved','Service Completion Approved','Your completed service for Test User 3\'s the printer (Request #SR-2025-0008) has been approved by the institution_admin.',11,12,'service_request','10',11,'{\"priority\": \"high\", \"sender_id\": 12, \"reference_id\": \"10\", \"reference_type\": \"service_request\"}',0,'2025-12-13 01:27:01','2025-12-13 01:27:01','high'),(78,'info','New Printer Assigned to Your Institution','A printer has been assigned to Cebu Technological University: HP LaserJet Pro M404dn (SN: HP-M404-AX92L3).',15,NULL,'printer','2',15,'{\"priority\": \"medium\", \"sender_id\": null, \"reference_id\": \"2\", \"reference_type\": \"printer\"}',0,'2025-12-13 01:27:22','2025-12-13 01:27:22','medium'),(79,'maintenance_service','New Maintenance Service Submitted','A technician has submitted a maintenance service for Epson EcoTank L3250 at Cebu Technological University',15,NULL,NULL,'5',NULL,NULL,0,'2025-12-13 01:30:50','2025-12-13 01:30:50','medium'),(80,'maintenance_service','Maintenance Service Pending','A technician has performed service on your printer. Awaiting institution_admin approval.',16,NULL,NULL,'5',NULL,NULL,0,'2025-12-13 01:30:50','2025-12-13 01:30:50','medium'),(81,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: ssssssss',11,15,'service_request','11',11,'{\"priority\": \"urgent\", \"sender_id\": 15, \"reference_id\": 11, \"reference_type\": \"service_request\"}',0,'2025-12-13 01:47:11','2025-12-13 01:47:11','urgent'),(82,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: aaaaaaaaaaaaaaaaaa',11,15,'service_request','12',11,'{\"priority\": \"medium\", \"sender_id\": 15, \"reference_id\": 12, \"reference_type\": \"service_request\"}',0,'2025-12-13 01:52:00','2025-12-13 01:52:00','medium'),(83,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: wwwwwwwwwwwwww',11,15,'service_request','13',11,'{\"priority\": \"medium\", \"sender_id\": 15, \"reference_id\": 13, \"reference_type\": \"service_request\"}',0,'2025-12-13 01:53:51','2025-12-13 01:53:51','medium'),(84,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: ssssssssssssssssa',11,15,'service_request','14',11,'{\"priority\": \"medium\", \"sender_id\": 15, \"reference_id\": 14, \"reference_type\": \"service_request\"}',0,'2025-12-13 01:57:43','2025-12-13 01:57:44','medium'),(85,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: ssssssss',11,15,'service_request','15',11,'{\"priority\": \"medium\", \"sender_id\": 15, \"reference_id\": 15, \"reference_type\": \"service_request\"}',0,'2025-12-13 02:17:01','2025-12-13 02:17:01','medium'),(86,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: wwwwwwwwwwwwwww',11,15,'service_request','16',11,'{\"priority\": \"urgent\", \"sender_id\": 15, \"reference_id\": 16, \"reference_type\": \"service_request\"}',0,'2025-12-13 02:24:05','2025-12-13 02:24:05','urgent'),(87,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: sssssssssaaaaaaaaaaaaaaaaaaaaaaaaaa',11,15,'service_request','17',11,'{\"priority\": \"urgent\", \"sender_id\": 15, \"reference_id\": 17, \"reference_type\": \"service_request\"}',0,'2025-12-13 02:33:50','2025-12-13 02:33:50','urgent'),(88,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: wwwwwwwwwwwwwwwwwwwwwwwwweeeeeeeeee',11,15,'service_request','18',11,'{\"priority\": \"medium\", \"sender_id\": 15, \"reference_id\": 18, \"reference_type\": \"service_request\"}',0,'2025-12-13 02:38:27','2025-12-13 02:38:27','medium'),(89,'maintenance_service','New Maintenance Service Submitted','A technician has submitted a maintenance service for Epson EcoTank L3250 at Cebu Technological University',15,NULL,NULL,'6',NULL,NULL,0,'2025-12-13 02:45:41','2025-12-13 02:45:41','medium'),(90,'maintenance_service','Maintenance Service Pending','A technician has performed service on your printer. Awaiting institution_admin approval.',16,NULL,NULL,'6',NULL,NULL,0,'2025-12-13 02:45:41','2025-12-13 02:45:41','medium'),(91,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: asssssssssssssd',11,15,'service_request','19',11,'{\"priority\": \"medium\", \"sender_id\": 15, \"reference_id\": 19, \"reference_type\": \"service_request\"}',0,'2025-12-13 02:47:50','2025-12-13 02:47:51','medium'),(92,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: qweweqweqweqwe',11,15,'service_request','20',11,'{\"priority\": \"medium\", \"sender_id\": 15, \"reference_id\": 20, \"reference_type\": \"service_request\"}',0,'2025-12-13 02:51:13','2025-12-13 02:51:13','medium'),(93,'service_request','New Service Request','New service request for Epson EcoTank L3250. Issue: asdasdasd',11,15,'service_request','21',11,'{\"priority\": \"medium\", \"sender_id\": 15, \"reference_id\": 21, \"reference_type\": \"service_request\"}',0,'2025-12-13 03:07:34','2025-12-13 03:07:34','medium'),(94,'institution_admin_registration','New institution_admin Registration','arch cabanero from Pajo Elementary School has registered and is awaiting approval.',NULL,NULL,NULL,NULL,20,'{\"email\": \"archcabanero0@gmail.com\", \"institution_id\": \"INST-001\", \"institution_name\": \"Pajo Elementary School\", \"institution_type\": \"public_school\", \"institution_address\": \"Pajo Elementary School, Sangi Road, Lapu-Lapu, Central Visayas, Philippines\"}',0,'2025-12-13 08:07:42','2025-12-13 08:07:42','medium'),(95,'info','New Printer Assigned to Your Institution','A printer has been assigned to Cebu Technological University: HP SMART TANK 500 (SN: CN0C234000).',15,NULL,'printer','6',15,'{\"priority\": \"medium\", \"sender_id\": null, \"reference_id\": \"6\", \"reference_type\": \"printer\"}',0,'2025-12-13 08:12:47','2025-12-13 08:12:47','medium'),(96,'info','New Printer Assigned to Your Institution','A printer has been assigned to Pajo Elementary School: Epson LaserPro123 (SN: ABCD9001).',20,NULL,'printer','5',20,'{\"priority\": \"medium\", \"sender_id\": null, \"reference_id\": \"5\", \"reference_type\": \"printer\"}',0,'2025-12-13 08:13:44','2025-12-13 08:13:44','medium'),(97,'service_request','New Service Request','New service request for Epson LaserPro123. Issue: sadsa',11,20,'service_request','22',11,'{\"priority\": \"medium\", \"sender_id\": 20, \"reference_id\": 22, \"reference_type\": \"service_request\"}',0,'2025-12-13 08:24:09','2025-12-13 08:24:09','medium'),(98,'service_request','New Service Request','New service request for Epson LaserPro123. Issue: sadsa',19,20,'service_request','22',19,'{\"priority\": \"medium\", \"sender_id\": 20, \"reference_id\": 22, \"reference_type\": \"service_request\"}',0,'2025-12-13 08:24:09','2025-12-13 08:24:09','medium'),(99,'institution_assigned','New Institution Assigned','You have been assigned to Pajo Elementary School',19,1,'institution','INST-001',19,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"INST-001\", \"reference_type\": \"institution\"}',0,'2025-12-13 08:26:27','2025-12-13 08:26:27','medium'),(100,'parts_request','New Parts Request','sample tec1 has requested 1 units of Epson 664 Magenta Ink Bottle',NULL,19,'parts_request','6',NULL,'{\"priority\": \"medium\", \"sender_id\": 19, \"reference_id\": 6, \"reference_type\": \"parts_request\"}',0,'2025-12-13 08:29:23','2025-12-13 08:29:23','medium'),(101,'parts_approved','Parts Request Approved','Your request for 1 units has been approved and added to your inventory. Admin note: SVXAABDSB',19,1,'parts_request','6',19,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"6\", \"reference_type\": \"parts_request\"}',0,'2025-12-13 08:30:08','2025-12-13 08:30:08','medium'),(102,'parts_approved','Parts Request Approved','Your request for 1 units has been approved and added to your inventory. Admin note: SVXAABDSB',19,1,'parts_request','6',19,'{\"priority\": \"medium\", \"sender_id\": 1, \"reference_id\": \"6\", \"reference_type\": \"parts_request\"}',0,'2025-12-13 08:30:09','2025-12-13 08:30:09','medium'),(103,'service_request','Service Request In Progress','Technician sample tec1 has started working on service request SR-2025-0010 at Pajo Elementary School.',20,19,'service_request','22',20,'{\"priority\": \"medium\", \"sender_id\": 19, \"reference_id\": \"22\", \"reference_type\": \"service_request\"}',0,'2025-12-13 08:30:43','2025-12-13 08:30:43','medium'),(104,'service_request','Service Request In Progress','Technician sample tec1 has started working on your service request SR-2025-0010.',20,19,'service_request','22',20,'{\"priority\": \"medium\", \"sender_id\": 19, \"reference_id\": \"22\", \"reference_type\": \"service_request\"}',0,'2025-12-13 08:30:43','2025-12-13 08:30:44','medium'),(105,'service_request','Service Request Pending Your Approval','Technician sample tec1 has completed service request SR-2025-0010 at Pajo Elementary School. Please review and approve.',20,19,'service_request','22',20,'{\"priority\": \"high\", \"sender_id\": 19, \"reference_id\": \"22\", \"reference_type\": \"service_request\"}',0,'2025-12-13 08:32:02','2025-12-13 08:32:02','high'),(106,'service_approved','Service Completion Approved','Your service completion for request #22 has been approved by arch cabanero at Pajo Elementary School. Notes: ZXZ',19,20,'service_request','22',NULL,NULL,0,'2025-12-13 08:33:04','2025-12-13 08:33:04','low');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parts_requests`
--

LOCK TABLES `parts_requests` WRITE;
/*!40000 ALTER TABLE `parts_requests` DISABLE KEYS */;
INSERT INTO `parts_requests` VALUES (1,2,11,5,'need now','urgent','approved',NULL,12,'2025-12-10 13:20:47','2025-12-10 13:20:07','2025-12-10 13:20:47',20),(2,1,11,5,'need now','medium','approved',NULL,1,'2025-12-10 13:21:01','2025-12-10 13:20:19','2025-12-10 13:21:01',15),(3,3,11,7,'need','urgent','approved',NULL,12,'2025-12-10 14:08:02','2025-12-10 14:07:48','2025-12-10 14:08:02',32),(4,3,11,10,'needs','medium','approved',NULL,1,'2025-12-11 06:09:45','2025-12-11 06:09:18','2025-12-11 06:09:45',25),(5,2,11,5,'need now','medium','approved',NULL,1,'2025-12-13 01:23:43','2025-12-13 01:23:33','2025-12-13 01:23:43',15),(6,3,19,1,'For printer refill','medium','approved','SVXAABDSB',1,'2025-12-13 08:30:08','2025-12-13 08:29:23','2025-12-13 08:30:08',14);
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (1,19,'eea6a51ec951c24cf483504a48552954fd66632e9b4158bd9bd940cee05e736d','2025-12-13 09:02:00',0,'2025-12-13 08:01:59');
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `printer_parts`
--

LOCK TABLES `printer_parts` WRITE;
/*!40000 ALTER TABLE `printer_parts` DISABLE KEYS */;
INSERT INTO `printer_parts` VALUES (1,'HP 26A Black LaserJet Toner Cartridge','HP','toner','printer_part',10,5,'in_stock','2025-12-10 13:16:53','2025-12-10 13:21:01',0,'pieces',3100,NULL,'black'),(2,'Canon PG-47 Black Ink Cartridge','Canon','ink','printer_part',10,5,'in_stock','2025-12-10 13:17:56','2025-12-13 01:23:44',0,'pieces',400,NULL,'black'),(3,'Epson 664 Magenta Ink Bottle','Epson','ink-bottle','printer_part',13,5,'in_stock','2025-12-10 14:07:04','2025-12-13 08:30:08',0,'pieces',NULL,100.00,'magenta');
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
  `department` varchar(255) DEFAULT NULL,
  `status` enum('available','assigned','retired') NOT NULL DEFAULT 'available',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_number` (`serial_number`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `printers`
--

LOCK TABLES `printers` WRITE;
/*!40000 ALTER TABLE `printers` DISABLE KEYS */;
INSERT INTO `printers` VALUES (2,'printer','HP LaserJet Pro M404dn','HP','LaserJet Pro M404dn','HP-M404-AX92L3',1,NULL,NULL,'assigned','2025-12-10 13:13:34','2025-12-13 01:27:22'),(3,'printer','Canon Pixma G3010','Canon','Pixma G3010','CN-G3010-FF12X9',1,'Building 10','FinanceS','assigned','2025-12-10 13:13:54','2025-12-12 15:15:14'),(4,'printer','Epson EcoTank L3250','Epson','EcoTank L3250','EP-L3250-QW78B1',1,'Building 20','HR Office','assigned','2025-12-10 13:14:12','2025-12-12 15:11:00'),(5,'printer','Epson LaserPro123','Epson','LaserPro123','ABCD9001',1,'aadasd','asdsa','assigned','2025-12-13 01:22:16','2025-12-13 08:24:08'),(6,'printer','HP SMART TANK 500','HP SMART TANK','500','CN0C234000',1,NULL,NULL,'assigned','2025-12-13 08:11:09','2025-12-13 08:12:47');
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
  `status` enum('pending_approval','approved','rejected','revision_requested') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by` int DEFAULT NULL,
  `technician_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `institution_admin_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_service_request` (`service_request_id`),
  KEY `idx_coordinator` (`approved_by`),
  KEY `idx_status` (`status`),
  KEY `idx_submitted_at` (`submitted_at`),
  CONSTRAINT `service_approvals_ibfk_1` FOREIGN KEY (`service_request_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_approvals_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_approvals`
--

LOCK TABLES `service_approvals` WRITE;
/*!40000 ALTER TABLE `service_approvals` DISABLE KEYS */;
INSERT INTO `service_approvals` VALUES (1,1,'approved',12,'Done',NULL,'2025-12-10 14:04:49','2025-12-10 14:09:33'),(2,2,'approved',NULL,'dones',NULL,'2025-12-10 14:09:04','2025-12-10 14:35:23'),(3,3,'pending_approval',NULL,'done',NULL,'2025-12-10 14:36:53',NULL),(4,4,'approved',15,'dones',NULL,'2025-12-11 04:48:44','2025-12-11 04:56:15'),(5,5,'approved',15,'done',NULL,'2025-12-11 06:04:37','2025-12-11 06:04:58'),(6,8,'approved',15,'DONE\n\nNotes: DONE',NULL,'2025-12-12 15:12:15','2025-12-12 15:13:29'),(7,9,'approved',17,'DONES',NULL,'2025-12-12 15:16:01','2025-12-12 15:16:48'),(8,10,'approved',12,'done',NULL,'2025-12-13 01:26:32','2025-12-13 01:27:01'),(9,22,'approved',20,'Dhdhcjvj',NULL,'2025-12-13 08:32:02','2025-12-13 08:33:04');
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
  `notes` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `used_by` int NOT NULL,
  `used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_request` (`service_request_id`),
  KEY `idx_part_id` (`part_id`),
  KEY `idx_used_by` (`used_by`),
  CONSTRAINT `service_parts_used_ibfk_1` FOREIGN KEY (`service_request_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_parts_used_ibfk_2` FOREIGN KEY (`part_id`) REFERENCES `printer_parts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_parts_used_ibfk_3` FOREIGN KEY (`used_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_parts_used`
--

LOCK TABLES `service_parts_used` WRITE;
/*!40000 ALTER TABLE `service_parts_used` DISABLE KEYS */;
INSERT INTO `service_parts_used` VALUES (1,1,1,1,'Used 1 pieces (Brand: HP)',11,'2025-12-10 14:04:49'),(2,2,3,1,'Used 1 pieces (Brand: Epson)',11,'2025-12-10 14:09:04'),(3,3,3,1,'Used 1 pieces (Brand: Epson)',11,'2025-12-10 14:36:53'),(4,4,3,1,'Used 1 pieces (Brand: Epson)',11,'2025-12-11 04:48:44'),(5,5,3,1,'Used 1 pieces (Brand: Epson)',11,'2025-12-11 06:04:37'),(6,8,3,1,'Used 1 pieces (Brand: Epson)',11,'2025-12-12 15:12:15'),(7,9,2,1,'Used 1 pieces (Brand: Canon)',11,'2025-12-12 15:16:01'),(8,10,2,1,'Used 1 pieces (Brand: Canon)',11,'2025-12-13 01:26:32');
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
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_request_history`
--

LOCK TABLES `service_request_history` WRITE;
/*!40000 ALTER TABLE `service_request_history` DISABLE KEYS */;
INSERT INTO `service_request_history` VALUES (1,1,'pending','in_progress',11,'Status updated by technician to in_progress','2025-12-10 14:04:21'),(2,1,'in_progress','in_progress',11,'Status updated by technician to in_progress','2025-12-10 14:04:24'),(3,1,'in_progress','pending_approval',11,'Service completion submitted for approval. Actions: Done...','2025-12-10 14:04:48'),(4,2,'pending','in_progress',11,'Status updated by technician to in_progress','2025-12-10 14:05:07'),(5,2,'in_progress','pending_approval',11,'Service completion submitted for approval. Actions: dones...','2025-12-10 14:09:04'),(6,2,'pending_approval','completed',15,'Service completion approved by institution_admin. ','2025-12-10 14:35:23'),(7,3,'pending','in_progress',11,'Status updated by technician to in_progress','2025-12-10 14:36:21'),(8,3,'in_progress','in_progress',11,'Status updated by technician to in_progress','2025-12-10 14:36:23'),(9,3,'in_progress','in_progress',11,'Status updated by technician to in_progress','2025-12-10 14:36:24'),(10,3,'in_progress','pending_approval',11,'Service completion submitted for approval. Actions: done...','2025-12-10 14:36:52'),(11,3,'pending_approval','completed',17,'Approved by institution_user','2025-12-10 14:37:18'),(12,4,'pending','in_progress',11,'Status updated by technician to in_progress','2025-12-11 04:48:23'),(13,4,'in_progress','pending_approval',11,'Service completion submitted for approval. Actions: dones...','2025-12-11 04:48:44'),(14,4,'pending_approval','completed',15,'Service completion approved by institution_admin - Ethan Robert Cruz. ','2025-12-11 04:56:15'),(15,5,'pending','in_progress',11,'Status updated by technician to in_progress','2025-12-11 06:04:08'),(16,5,'in_progress','in_progress',11,'Status updated by technician to in_progress','2025-12-11 06:04:10'),(17,5,'in_progress','pending_approval',11,'Service completion submitted for approval. Actions: done...','2025-12-11 06:04:37'),(18,5,'pending_approval','completed',15,'Service completion approved by Institution Admin - Ethan Robert Cruz. ','2025-12-11 06:04:58'),(19,8,'pending','in_progress',11,'Status updated by technician to in_progress','2025-12-12 15:11:25'),(20,8,'in_progress','pending_approval',11,'Service completion submitted for approval. Actions: DONE\n\nNotes: DONE...','2025-12-12 15:12:14'),(21,8,'pending_approval','completed',15,'Service completion approved by Institution Admin - Ethan Robert Cruz. ','2025-12-12 15:13:30'),(22,9,'pending','in_progress',11,'Status updated by technician to in_progress','2025-12-12 15:15:34'),(23,9,'in_progress','pending_approval',11,'Service completion submitted for approval. Actions: DONES...','2025-12-12 15:16:01'),(24,9,'pending_approval','completed',17,'Approved by Institution User - Sunny Bird','2025-12-12 15:16:48'),(25,10,'pending','in_progress',11,'Status updated by technician to in_progress','2025-12-13 01:26:06'),(26,10,'in_progress','in_progress',11,'Status updated by technician to in_progress','2025-12-13 01:26:10'),(27,10,'in_progress','pending_approval',11,'Service completion submitted for approval. Actions: done...','2025-12-13 01:26:31'),(28,22,'pending','in_progress',19,'Status updated by technician to in_progress','2025-12-13 08:30:43'),(29,22,'in_progress','pending_approval',19,'Service completion submitted for approval. Actions: Dhdhcjvj...','2025-12-13 08:32:02'),(30,22,'pending_approval','completed',20,'Service completion approved by Institution Admin - arch cabanero. ZXZ','2025-12-13 08:33:04');
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
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_requests`
--

LOCK TABLES `service_requests` WRITE;
/*!40000 ALTER TABLE `service_requests` DISABLE KEYS */;
INSERT INTO `service_requests` VALUES (1,'SR-2025-0001',NULL,12,11,'urgent','completed','Need now','2025-12-10 13:39:19',NULL,'2025-12-10 14:04:21',NULL,'Done','https://res.cloudinary.com/duodt5wlv/image/upload/v1765375487/serviceease/completion_photos/aorfharcm6vfoyjybdrt.png','Liam Andre Morales','HP',1),(2,'SR-2025-0002','INST-002',15,11,'urgent','completed','need now','2025-12-10 13:43:55',4,'2025-12-10 14:05:07','2025-12-10 14:35:23','dones','https://res.cloudinary.com/duodt5wlv/image/upload/v1765375743/serviceease/completion_photos/nosb1fgucfbpo7ejrpwo.png',NULL,NULL,0),(3,'SR-2025-0003','INST-002',17,11,'high','completed','need','2025-12-10 14:36:05',4,'2025-12-10 14:36:21','2025-12-10 14:37:18','Approved by institution_user','https://res.cloudinary.com/duodt5wlv/image/upload/v1765377411/serviceease/completion_photos/chcrtqndcojttzrkfeu4.png',NULL,NULL,0),(4,'SR-2025-0004','INST-002',15,11,'urgent','completed','pls help','2025-12-11 03:05:28',4,'2025-12-11 04:48:23','2025-12-11 04:56:15','Approved by institution_admin - Ethan Robert Cruz','https://res.cloudinary.com/duodt5wlv/image/upload/v1765428523/serviceease/completion_photos/ve1cbvnioqu7cc9c0q4w.png',NULL,NULL,0),(5,'SR-2025-0005','INST-002',15,11,'urgent','completed','nweee','2025-12-11 06:03:18',4,'2025-12-11 06:04:08','2025-12-11 06:04:58','Approved by Institution Admin - Ethan Robert Cruz','https://res.cloudinary.com/duodt5wlv/image/upload/v1765433075/serviceease/completion_photos/ojzoyc10izyiubaqsfna.png',NULL,NULL,0),(8,'SR-2025-0006','INST-002',15,11,'high','completed','NEEEDS','2025-12-12 15:11:01',4,'2025-12-12 15:11:25','2025-12-12 15:13:29','Approved by Institution Admin - Ethan Robert Cruz','https://res.cloudinary.com/duodt5wlv/image/upload/v1765552333/serviceease/completion_photos/sh99jmc39bnwzdvhrhhc.png',NULL,NULL,0),(9,'SR-2025-0007','INST-002',17,11,'urgent','completed','NEED NOWS','2025-12-12 15:15:14',3,'2025-12-12 15:15:34','2025-12-12 15:16:48','Approved by Institution User - Sunny Bird','https://res.cloudinary.com/duodt5wlv/image/upload/v1765552560/serviceease/completion_photos/ggxtxhabu4uckqb6ls15.png',NULL,NULL,0),(10,'SR-2025-0008',NULL,12,11,'urgent','completed','needs','2025-12-13 01:25:48',NULL,'2025-12-13 01:26:06','2025-12-13 01:27:01','Approved by Operations Officer - Anna Louise Santos','https://res.cloudinary.com/duodt5wlv/image/upload/v1765589191/serviceease/completion_photos/lexkzilicbdmme4einjn.png','Test User 3','Canon',1),(21,'SR-2025-0009','INST-002',15,NULL,'medium','pending','asdasdasd','2025-12-13 03:07:33',4,NULL,NULL,NULL,NULL,NULL,NULL,0),(22,'SR-2025-0010','INST-001',20,19,'medium','completed','sadsa','2025-12-13 08:24:09',5,'2025-12-13 08:30:43','2025-12-13 08:33:04','Approved by Institution Admin - arch cabanero. ZXZ','https://res.cloudinary.com/duodt5wlv/image/upload/v1765614721/serviceease/completion_photos/lbhxz9chrrlfjr9kj0me.jpg',NULL,NULL,0);
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_assignments`
--

LOCK TABLES `technician_assignments` WRITE;
/*!40000 ALTER TABLE `technician_assignments` DISABLE KEYS */;
INSERT INTO `technician_assignments` VALUES (2,11,'INST-001',1,'2025-12-10 12:48:19',1,'2025-12-10 12:48:19','2025-12-10 12:48:19'),(3,11,'INST-002',12,'2025-12-10 12:48:40',1,'2025-12-10 12:48:40','2025-12-10 12:48:40'),(4,19,'INST-001',1,'2025-12-13 08:26:27',1,'2025-12-13 08:26:27','2025-12-13 08:26:27');
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_inventory`
--

LOCK TABLES `technician_inventory` WRITE;
/*!40000 ALTER TABLE `technician_inventory` DISABLE KEYS */;
INSERT INTO `technician_inventory` VALUES (1,11,2,8,12,'2025-12-10 13:20:47','2025-12-13 01:27:01',NULL),(2,11,1,4,1,'2025-12-10 13:21:01','2025-12-10 14:09:34',NULL),(3,11,3,7,12,'2025-12-10 14:08:03','2025-12-13 01:17:04',NULL),(4,19,3,2,1,'2025-12-13 08:30:08','2025-12-13 08:30:09',NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_printer_assignments`
--

LOCK TABLES `user_printer_assignments` WRITE;
/*!40000 ALTER TABLE `user_printer_assignments` DISABLE KEYS */;
INSERT INTO `user_printer_assignments` VALUES (1,16,4,'INST-002','2025-12-10 13:38:00'),(2,17,4,'INST-002','2025-12-10 14:12:04'),(3,17,3,'INST-002','2025-12-12 11:58:59'),(4,18,3,'INST-002','2025-12-12 15:32:34');
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
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Marienoll','Sari','serviceeaseph@gmail.com','$2a$10$lpKHwimaeeoBbQxN.Hfa0etR4Vvpz9SaC4i2VL01LOamJIdQxnE1q','admin',1,'active','2025-08-25 10:22:12','2025-12-13 04:59:45','approved',NULL,NULL,4,0),(11,'John Michael','Reyes','markivan.storm@gmail.com','$2b$10$1srnAuxrp53z7iGxci.dAePw7dxrfhuKKqkG6H9Xguj5gmTFp4SCy','technician',1,'active','2025-12-10 12:36:59','2025-12-10 12:43:31','approved',NULL,NULL,0,0),(12,'Anna Louise','Santos','markivan.light@gmail.com','$2b$10$yFgNeMXUgpLccFuSP5qcker5rfllFDdo3haam/tWHytg.jpQbrzL.','operations_officer',1,'active','2025-12-10 12:44:27','2025-12-10 12:46:53','approved',NULL,NULL,0,0),(15,'Ethan Robert','Cruz','markivan.note@gmail.com','$2b$10$AjsZe9NLbf/WKWAw7W3st.RgbNeQWExCmZnBjH3BzECggDIoQNeNO','institution_admin',1,'active','2025-12-10 13:10:26','2025-12-10 13:10:58','approved',NULL,NULL,0,0),(16,'Sofia Marie','Delgado','davetriciamae3@gmail.com','$2b$10$0QFNdY0hZLD51UtZLm0JFuZcMtBdxG1kYL9i21n07Fe2fpnkZcvn6','institution_user',1,'active','2025-12-10 13:37:58','2025-12-10 13:37:58','approved',NULL,NULL,0,1),(17,'Sunny','Bird','markivan1110@gmail.com','$2a$10$LykvlhHxWICkkpxEmI218.7SzOBzR9hIz71lEK5cJFU2TS4rU7YtW','institution_user',1,'active','2025-12-10 14:12:00','2025-12-12 11:58:59','approved',15,'2025-12-10 14:15:25',0,0),(18,'Sofia Marie','Gab','markivan.1101@gmail.com','$2a$10$Dz7D7N7U5TSlyGu6AKju0.jBF7/jOiNyMUSLZqn3sok.0gf5fADpu','institution_user',1,'active','2025-12-12 15:32:31','2025-12-12 15:33:15','approved',15,'2025-12-12 15:33:15',0,0),(19,'sample','tec1','alekrosas28@gmail.com','$2b$10$yelKRJLD5ZPr6JGq5zrM..c9rbwexS.2qwfnHDoLUfCqlq8eTvx46','technician',1,'active','2025-12-13 07:58:34','2025-12-13 08:04:12','approved',NULL,NULL,1,0),(20,'arch','cabanero','archcabanero0@gmail.com','$2b$10$9Iu8ZYODI1JJweU8eL1cAuDfSMQ7/xMxHwi5lAbIDb7UVOXIjfVbK','institution_admin',1,'active','2025-12-13 08:07:42','2025-12-13 08:08:52','approved',NULL,NULL,0,0),(21,'MARIENOLL','SARI','sarimarienoll@gmail.com','$2b$10$EeIuj1MbquviBNRFOUPy8ubjQ4.XgPjJNKHUdpw/CLfmZK6xP4obW','operations_officer',1,'active','2025-12-13 08:24:46','2025-12-13 08:24:46','approved',NULL,NULL,0,1);
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verification_tokens`
--

LOCK TABLES `verification_tokens` WRITE;
/*!40000 ALTER TABLE `verification_tokens` DISABLE KEYS */;
INSERT INTO `verification_tokens` VALUES (1,NULL,'navisunzcy@gmail.com','451522','email','2025-12-11 13:41:12','2025-12-10 13:41:12');
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

-- Dump completed on 2025-12-14 15:17:20
