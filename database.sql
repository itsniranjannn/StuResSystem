-- Drop database if exists and recreate
DROP DATABASE IF EXISTS student_result_system;
CREATE DATABASE student_result_system;
USE student_result_system;

-- USERS table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'teacher', 'student') NOT NULL DEFAULT 'student',
  profile_image VARCHAR(255) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- STUDENTS table
CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE,
  roll_no VARCHAR(20) UNIQUE NOT NULL,
  student_name VARCHAR(100) NOT NULL,
  semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  program VARCHAR(50) NOT NULL DEFAULT 'BCA',
  faculty VARCHAR(100) DEFAULT 'Faculty of Humanities & Social Sciences',
  father_name VARCHAR(100),
  mother_name VARCHAR(100),
  address TEXT,
  phone VARCHAR(15),
  dob DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_roll_no (roll_no),
  INDEX idx_semester (semester),
  INDEX idx_program (program)
);

-- TEACHERS table
CREATE TABLE teachers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE,
  teacher_name VARCHAR(100) NOT NULL,
  department VARCHAR(50) NOT NULL DEFAULT 'Computer Science',
  qualification VARCHAR(100),
  experience INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_department (department)
);

-- SUBJECTS table
CREATE TABLE subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  credit INT NOT NULL DEFAULT 3 CHECK (credit BETWEEN 1 AND 5),
  semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  type ENUM('theory', 'practical', 'project') DEFAULT 'theory',
  teacher_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  INDEX idx_semester (semester),
  INDEX idx_code (code)
);

-- MARKS table
CREATE TABLE marks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  student_name VARCHAR(100) NOT NULL,
  subject_id INT NOT NULL,
  subject_name VARCHAR(100) NOT NULL,
  subject_code VARCHAR(20) NOT NULL,
  marks_obtained DECIMAL(5,2) CHECK (marks_obtained >= 0 AND marks_obtained <= 100),
  full_marks INT DEFAULT 100,
  exam_type ENUM('internal', 'final', 'practical') DEFAULT 'final',
  exam_year YEAR,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES teachers(id) ON DELETE SET NULL,
  UNIQUE KEY unique_marks_entry (student_id, subject_id, exam_type, exam_year),
  INDEX idx_student_marks (student_id, exam_year),
  INDEX idx_subject_performance (subject_id, exam_year)
);

-- RESULTS table
CREATE TABLE results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT,
  student_name VARCHAR(100) NOT NULL,
  roll_no VARCHAR(20) NOT NULL,
  semester INT NOT NULL,
  total_marks DECIMAL(7,2) DEFAULT 0,
  total_credits INT DEFAULT 0,
  gpa DECIMAL(3,2) DEFAULT 0.00 CHECK (gpa >= 0 AND gpa <= 4.00),
  grade VARCHAR(5) DEFAULT 'F',
  rank INT DEFAULT 0,
  exam_year YEAR,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY unique_semester_result (student_id, semester, exam_year),
  INDEX idx_ranking (semester, exam_year, rank),
  INDEX idx_student_results (student_id, semester)
);

-- Insert sample subjects for BCA
INSERT INTO subjects (code, name, credit, semester) VALUES
('CSC361', 'Web Technology', 3, 6),
('CSC362', 'Database Management System', 3, 6),
('CSC363', 'Software Engineering', 3, 6),
('CSC364', 'Computer Graphics', 3, 6),
('CSC365', 'Project Work', 3, 6);

-- Insert admin user with hashed password (password: admin123)
-- Generate hash using: node scripts/generateHash.js
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye7LY8lzYbL4rK3qK6J8qGq1n6YQYyW/G', 'admin');

-- Insert a test student user (password: student123)
INSERT INTO users (name, email, password, role) VALUES
('Test Student', 'student@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye7LY8lzYbL4rK3qK6J8qGq1n6YQYyW/G', 'student');

-- Insert student record for the test student
INSERT INTO students (user_id, roll_no, student_name, semester, program) VALUES
(2, 'BCA24001', 'Test Student', 6, 'BCA');

-- Insert a test teacher user (password: teacher123)
INSERT INTO users (name, email, password, role) VALUES
('Test Teacher', 'teacher@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye7LY8lzYbL4rK3qK6J8qGq1n6YQYyW/G', 'teacher');

-- Insert teacher record for the test teacher
INSERT INTO teachers (user_id, teacher_name, department) VALUES
(3, 'Test Teacher', 'Computer Science');

-- Insert sample marks for the test student
INSERT INTO marks (student_id, student_name, subject_id, subject_name, subject_code, marks_obtained, exam_year, created_by) VALUES
(1, 'Test Student', 1, 'Web Technology', 'CSC361', 85.5, 2024, 1),
(1, 'Test Student', 2, 'Database Management System', 'CSC362', 78.0, 2024, 1),
(1, 'Test Student', 3, 'Software Engineering', 'CSC363', 92.5, 2024, 1);

-- Insert sample result for the test student
INSERT INTO results (student_id, student_name, roll_no, semester, total_marks, total_credits, gpa, grade, rank, exam_year) VALUES
(1, 'Test Student', 'BCA24001', 6, 256.00, 9, 3.45, 'A', 1, 2024);

-- Show what we inserted
SELECT 'Database created successfully!' as message;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as student_count FROM students;
SELECT COUNT(*) as subject_count FROM subjects;