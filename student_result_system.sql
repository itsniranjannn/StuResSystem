-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 19, 2025 at 04:58 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `student_result_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `marks`
--

CREATE TABLE `marks` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `student_name` varchar(100) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `subject_name` varchar(100) NOT NULL,
  `marks_obtained` int(11) DEFAULT NULL CHECK (`marks_obtained` >= 0 and `marks_obtained` <= 100),
  `full_marks` int(11) DEFAULT 100,
  `exam_type` enum('internal','final','practical') DEFAULT 'final',
  `exam_year` year(4) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `marks`
--

INSERT INTO `marks` (`id`, `student_id`, `student_name`, `subject_id`, `subject_name`, `marks_obtained`, `full_marks`, `exam_type`, `exam_year`, `created_at`) VALUES
(19, 1, 'Aarav Sharma', 1, 'Web Technology', 85, 100, 'final', '2024', '2025-12-19 15:32:01'),
(20, 1, 'Aarav Sharma', 2, 'Database Management System', 78, 100, 'final', '2024', '2025-12-19 15:32:01'),
(21, 1, 'Aarav Sharma', 3, 'Software Engineering', 92, 100, 'final', '2024', '2025-12-19 15:32:01'),
(22, 1, 'Aarav Sharma', 4, 'Computer Graphics', 88, 100, 'final', '2024', '2025-12-19 15:32:01'),
(23, 1, 'Aarav Sharma', 5, 'Project Work', 95, 100, 'final', '2024', '2025-12-19 15:32:01'),
(24, 2, 'Priya Karki', 1, 'Web Technology', 90, 100, 'final', '2024', '2025-12-19 15:32:01'),
(25, 2, 'Priya Karki', 2, 'Database Management System', 88, 100, 'final', '2024', '2025-12-19 15:32:01'),
(26, 2, 'Priya Karki', 3, 'Software Engineering', 85, 100, 'final', '2024', '2025-12-19 15:32:01'),
(27, 2, 'Priya Karki', 4, 'Computer Graphics', 92, 100, 'final', '2024', '2025-12-19 15:32:01'),
(28, 2, 'Priya Karki', 5, 'Project Work', 90, 100, 'final', '2024', '2025-12-19 15:32:01'),
(29, 3, 'Sujan Thapa', 1, 'Web Technology', 72, 100, 'final', '2024', '2025-12-19 15:32:01'),
(30, 3, 'Sujan Thapa', 2, 'Database Management System', 65, 100, 'final', '2024', '2025-12-19 15:32:01'),
(31, 3, 'Sujan Thapa', 3, 'Software Engineering', 70, 100, 'final', '2024', '2025-12-19 15:32:01'),
(32, 3, 'Sujan Thapa', 4, 'Computer Graphics', 68, 100, 'final', '2024', '2025-12-19 15:32:01'),
(33, 3, 'Sujan Thapa', 5, 'Project Work', 75, 100, 'final', '2024', '2025-12-19 15:32:01');

-- --------------------------------------------------------

--
-- Table structure for table `notices`
--

CREATE TABLE `notices` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `type` enum('general','exam','result','holiday') DEFAULT 'general',
  `published_by` int(11) DEFAULT NULL,
  `is_important` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notices`
--

INSERT INTO `notices` (`id`, `title`, `content`, `type`, `published_by`, `is_important`, `created_at`) VALUES
(1, 'Final Exam Schedule - 6th Semester', 'The final examination for 6th Semester BCA will commence from December 20, 2024. Please check the detailed schedule on the notice board.', 'exam', 1, 1, '2024-12-01 04:15:00'),
(2, 'Result Publication Date', 'The results for 6th Semester BCA will be published on January 10, 2025. Students can view their results online through the portal.', 'result', 1, 1, '2024-12-05 08:45:00'),
(3, 'Holiday Announcement', 'The college will remain closed from December 25, 2024 to January 1, 2025 for Christmas and New Year holidays.', 'holiday', 1, 0, '2024-12-10 03:15:00'),
(4, 'Project Submission Deadline', 'Last date for submission of final year project is December 15, 2024. Late submissions will be penalized.', 'general', 2, 1, '2024-12-12 05:15:00'),
(5, 'Web Technology Lab Schedule', 'New lab schedule for Web Technology has been updated. Please check your respective time slots.', 'general', 1, 0, '2024-12-15 10:15:00');

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `results`
--

CREATE TABLE `results` (
  `id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `student_name` varchar(100) NOT NULL,
  `roll_no` varchar(20) NOT NULL,
  `total_marks` int(11) DEFAULT 0,
  `gpa` float DEFAULT 0,
  `grade` varchar(5) DEFAULT 'F',
  `rank` int(11) DEFAULT 0,
  `semester` int(11) DEFAULT NULL,
  `exam_year` year(4) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('pending','approved','published') DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `results`
--

INSERT INTO `results` (`id`, `student_id`, `student_name`, `roll_no`, `total_marks`, `gpa`, `grade`, `rank`, `semester`, `exam_year`, `created_at`, `updated_at`, `status`, `approved_by`, `published_at`) VALUES
(1, 10, 'Aarav Sharma', 'BCA2021-001', NULL, 0, 'F', 1, 6, '2024', '2025-12-19 15:32:01', '2025-12-19 15:32:01', 'published', NULL, NULL),
(2, 11, 'Priya Karki', 'BCA2021-002', NULL, 0, 'F', 1, 6, '2024', '2025-12-19 15:32:01', '2025-12-19 15:32:01', 'published', NULL, NULL),
(3, 12, 'Sujan Thapa', 'BCA2021-003', NULL, 0, 'F', 1, 6, '2024', '2025-12-19 15:32:01', '2025-12-19 15:32:01', 'published', NULL, NULL),
(4, 13, 'Anjali Gurung', 'BCA2021-004', NULL, 0, 'F', 1, 6, '2024', '2025-12-19 15:32:01', '2025-12-19 15:32:01', 'published', NULL, NULL),
(5, 14, 'Rohan Basnet', 'BCA2021-005', NULL, 0, 'F', 1, 6, '2024', '2025-12-19 15:32:01', '2025-12-19 15:32:01', 'published', NULL, NULL),
(6, 15, 'Sita Rai', 'BCA2021-006', NULL, 0, 'F', 1, 6, '2024', '2025-12-19 15:32:01', '2025-12-19 15:32:01', 'published', NULL, NULL),
(7, 16, 'Bikash Tamang', 'BCA2021-007', NULL, 0, 'F', 1, 6, '2024', '2025-12-19 15:32:01', '2025-12-19 15:32:01', 'published', NULL, NULL),
(8, 17, 'Nisha Magar', 'BCA2021-008', NULL, 0, 'F', 1, 6, '2024', '2025-12-19 15:32:01', '2025-12-19 15:32:01', 'published', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `roll_no` varchar(20) NOT NULL,
  `student_name` varchar(100) NOT NULL,
  `semester` int(11) NOT NULL,
  `program` varchar(50) NOT NULL,
  `father_name` varchar(100) DEFAULT NULL,
  `mother_name` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `user_id`, `roll_no`, `student_name`, `semester`, `program`, `father_name`, `mother_name`, `address`, `phone`, `dob`, `created_at`) VALUES
(10, 5, 'BCA2021-001', 'Aarav Sharma', 6, 'BCA', 'Rajesh Sharma', 'Sita Sharma', 'Kathmandu, Nepal', '9842000001', '2002-03-15', '2025-12-19 15:32:00'),
(11, 6, 'BCA2021-002', 'Priya Karki', 6, 'BCA', 'Mohan Karki', 'Gita Karki', 'Lalitpur, Nepal', '9842000002', '2002-06-22', '2025-12-19 15:32:00'),
(12, 7, 'BCA2021-003', 'Sujan Thapa', 6, 'BCA', 'Ramesh Thapa', 'Mina Thapa', 'Bhaktapur, Nepal', '9842000003', '2002-01-10', '2025-12-19 15:32:00'),
(13, 8, 'BCA2021-004', 'Anjali Gurung', 6, 'BCA', 'Suresh Gurung', 'Laxmi Gurung', 'Pokhara, Nepal', '9842000004', '2002-11-05', '2025-12-19 15:32:00'),
(14, 9, 'BCA2021-005', 'Rohan Basnet', 6, 'BCA', 'Krishna Basnet', 'Radha Basnet', 'Chitwan, Nepal', '9842000005', '2002-07-30', '2025-12-19 15:32:00'),
(15, 10, 'BCA2021-006', 'Sita Rai', 6, 'BCA', 'Hari Rai', 'Saraswati Rai', 'Dharan, Nepal', '9842000006', '2002-04-18', '2025-12-19 15:32:00'),
(16, 11, 'BCA2021-007', 'Bikash Tamang', 6, 'BCA', 'Gopal Tamang', 'Maya Tamang', 'Kavre, Nepal', '9842000007', '2002-09-12', '2025-12-19 15:32:00'),
(17, 12, 'BCA2021-008', 'Nisha Magar', 6, 'BCA', 'Bhim Magar', 'Kumari Magar', 'Nuwakot, Nepal', '9842000008', '2002-12-25', '2025-12-19 15:32:00');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `credit` int(11) NOT NULL DEFAULT 3,
  `semester` int(11) NOT NULL,
  `type` enum('theory','practical','project') DEFAULT 'theory',
  `teacher_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `code`, `name`, `description`, `credit`, `semester`, `type`, `teacher_id`, `created_at`) VALUES
(1, 'CSC361', 'Web Technology', 'Advanced web development concepts including React, Node.js, and modern frameworks', 3, 6, 'theory', 1, '2025-12-19 12:03:38'),
(2, 'CSC362', 'Database Management System', 'Database design, SQL queries, normalization, and database administration', 3, 6, 'theory', 3, '2025-12-19 12:03:38'),
(3, 'CSC363', 'Software Engineering', 'Software development life cycle, UML diagrams, testing, and project management', 3, 6, 'theory', 2, '2025-12-19 12:03:38'),
(4, 'CSC364', 'Computer Graphics', 'Computer graphics algorithms, OpenGL, and 3D modeling', 3, 6, 'theory', 1, '2025-12-19 12:03:38'),
(5, 'CSC365', 'Project Work', 'Final year project work with research and implementation', 3, 6, 'theory', 2, '2025-12-19 12:03:38');

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `teacher_name` varchar(100) NOT NULL,
  `department` varchar(50) NOT NULL,
  `qualification` varchar(100) DEFAULT NULL,
  `experience` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teachers`
--

INSERT INTO `teachers` (`id`, `user_id`, `teacher_name`, `department`, `qualification`, `experience`, `created_at`) VALUES
(7, 2, 'Dr. Rajesh Sharma', 'Computer Science', 'Ph.D in Computer Science', 15, '2025-12-19 15:32:00'),
(8, 3, 'Prof. Sunita Adhikari', 'Computer Science', 'M.Sc. in Software Engineering', 10, '2025-12-19 15:32:00'),
(9, 4, 'Dr. Mohan Gurung', 'Computer Science', 'Ph.D in Database Systems', 12, '2025-12-19 15:32:00');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','teacher','student') NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `profile_image`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'niranjan katwal', 'katwalniranjan40@gmail.com', NULL, '$2a$10$xdFxa8taYSfxgNHgygYOJ.34mqaxEM.e9RDlv3aK0twSt4kxzXmMC', 'admin', NULL, 1, '2025-12-19 12:04:57', '2025-12-19 12:06:16'),
(2, 'Dr. Rajesh Sharma', 'r.sharma@college.edu', '9841001001', '$2a$10$YourActualHash1', 'teacher', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03'),
(3, 'Prof. Sunita Adhikari', 's.adhikari@college.edu', '9841001002', '$2a$10$YourActualHash2', 'teacher', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03'),
(4, 'Dr. Mohan Gurung', 'm.gurung@college.edu', '9841001003', '$2a$10$YourActualHash3', 'teacher', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03'),
(5, 'Aarav Sharma', 'aarav.sharma@student.edu', '9842000001', '$2a$10$YourActualHash4', 'student', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03'),
(6, 'Priya Karki', 'priya.karki@student.edu', '9842000002', '$2a$10$YourActualHash5', 'student', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03'),
(7, 'Sujan Thapa', 'sujan.thapa@student.edu', '9842000003', '$2a$10$YourActualHash6', 'student', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03'),
(8, 'Anjali Gurung', 'anjali.gurung@student.edu', '9842000004', '$2a$10$YourActualHash7', 'student', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03'),
(9, 'Rohan Basnet', 'rohan.basnet@student.edu', '9842000005', '$2a$10$YourActualHash8', 'student', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03'),
(10, 'Sita Rai', 'sita.rai@student.edu', '9842000006', '$2a$10$YourActualHash9', 'student', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03'),
(11, 'Bikash Tamang', 'bikash.tamang@student.edu', '9842000007', '$2a$10$YourActualHash10', 'student', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03'),
(12, 'Nisha Magar', 'nisha.magar@student.edu', '9842000008', '$2a$10$YourActualHash11', 'student', NULL, 1, '2025-12-19 15:31:03', '2025-12-19 15:31:03');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `marks`
--
ALTER TABLE `marks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_marks` (`student_id`,`subject_id`,`exam_type`,`exam_year`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `notices`
--
ALTER TABLE `notices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `published_by` (`published_by`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `results`
--
ALTER TABLE `results`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id` (`student_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `roll_no` (`roll_no`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `teacher_id` (`teacher_id`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `marks`
--
ALTER TABLE `marks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `notices`
--
ALTER TABLE `notices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `results`
--
ALTER TABLE `results`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `marks`
--
ALTER TABLE `marks`
  ADD CONSTRAINT `marks_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marks_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notices`
--
ALTER TABLE `notices`
  ADD CONSTRAINT `notices_ibfk_1` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `results`
--
ALTER TABLE `results`
  ADD CONSTRAINT `results_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`);

--
-- Constraints for table `teachers`
--
ALTER TABLE `teachers`
  ADD CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
