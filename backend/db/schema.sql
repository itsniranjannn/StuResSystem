DROP DATABASE IF EXISTS student_result_system;
CREATE DATABASE student_result_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE student_result_system;

CREATE TABLE settings (
  k VARCHAR(60) PRIMARY KEY,
  v TEXT NOT NULL
);

-- A program is any course of study: BCA (semesters), BBS (years), +2 Science (grades), school classes ...
CREATE TABLE programs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  level ENUM('school','higher_secondary','bachelor','master') NOT NULL DEFAULT 'bachelor',
  grading_scheme ENUM('tu_gpa','neb_gpa','division') NOT NULL DEFAULT 'tu_gpa',
  term_label VARCHAR(20) NOT NULL DEFAULT 'Semester',
  term_count TINYINT NOT NULL DEFAULT 8,
  term_offset TINYINT NOT NULL DEFAULT 0 COMMENT 'display number = term + offset (Grade 11 = term 1 + 10)',
  terms_per_year TINYINT NOT NULL DEFAULT 1,
  pass_percent TINYINT NOT NULL DEFAULT 40,
  attendance_required TINYINT NOT NULL DEFAULT 80,
  CONSTRAINT chk_prog CHECK (term_count BETWEEN 1 AND 12)
);

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','teacher','student') NOT NULL DEFAULT 'student',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  reset_token_hash VARCHAR(64) NULL,
  reset_expires DATETIME NULL,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role (role)
);

CREATE TABLE teachers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  teacher_name VARCHAR(100) NOT NULL,
  department VARCHAR(80) NOT NULL DEFAULT 'Computer Science',
  qualification VARCHAR(120),
  phone VARCHAR(20),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  program_id INT NOT NULL,
  roll_no VARCHAR(30) NOT NULL UNIQUE COMMENT 'symbol / roll number',
  reg_no VARCHAR(40) NULL,
  student_name VARCHAR(100) NOT NULL,
  semester TINYINT NOT NULL COMMENT 'current term (semester / year / grade index)',
  batch YEAR NULL,
  gender ENUM('male','female','other') NULL,
  father_name VARCHAR(100),
  guardian_email VARCHAR(120) NULL,
  address VARCHAR(200),
  phone VARCHAR(20),
  dob DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES programs(id),
  CONSTRAINT chk_sem CHECK (semester BETWEEN 1 AND 12),
  INDEX idx_program_sem (program_id, semester)
);

CREATE TABLE subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  program_id INT NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  semester TINYINT NOT NULL,
  credit DECIMAL(3,1) NOT NULL DEFAULT 3,
  type ENUM('theory','practical','project') NOT NULL DEFAULT 'theory',
  internal_full SMALLINT NOT NULL DEFAULT 40,
  external_full SMALLINT NOT NULL DEFAULT 60,
  teacher_id INT NULL,
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  CONSTRAINT chk_ssem CHECK (semester BETWEEN 1 AND 12),
  INDEX idx_subject_prog (program_id, semester)
);

CREATE TABLE marks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  exam_year SMALLINT NOT NULL,
  attempt TINYINT NOT NULL DEFAULT 1 COMMENT '1 = regular exam, 2+ = back paper (reappear)',
  internal_marks DECIMAL(5,2) NOT NULL DEFAULT 0,
  external_marks DECIMAL(5,2) NOT NULL DEFAULT 0,
  entered_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_mark (student_id, subject_id, exam_year),
  INDEX idx_subject_year (subject_id, exam_year)
);

CREATE TABLE results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  semester TINYINT NOT NULL,
  exam_year SMALLINT NOT NULL,
  total_marks DECIMAL(7,2) NOT NULL DEFAULT 0,
  full_marks DECIMAL(7,2) NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_credits DECIMAL(4,1) NOT NULL DEFAULT 0,
  gpa DECIMAL(3,2) NOT NULL DEFAULT 0,
  grade VARCHAR(16) NOT NULL DEFAULT 'F',
  division VARCHAR(24) NULL,
  backpapers TINYINT NOT NULL DEFAULT 0 COMMENT 'subjects cleared through back papers',
  status ENUM('pass','fail','incomplete') NOT NULL DEFAULT 'incomplete',
  class_rank INT NULL,
  verify_code CHAR(10) NULL UNIQUE,
  published TINYINT(1) NOT NULL DEFAULT 0,
  published_at TIMESTAMP NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY uq_result (student_id, semester, exam_year),
  INDEX idx_rank (semester, exam_year, class_rank)
);

CREATE TABLE attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  att_date DATE NOT NULL,
  status ENUM('present','absent','late') NOT NULL,
  marked_by INT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_att (student_id, subject_id, att_date),
  INDEX idx_att_subject_date (subject_id, att_date)
);

CREATE TABLE notices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  audience ENUM('all','teacher','student') NOT NULL DEFAULT 'all',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE email_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  to_email VARCHAR(160) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  kind VARCHAR(30) NOT NULL,
  html MEDIUMTEXT NOT NULL,
  status ENUM('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
  attempts TINYINT NOT NULL DEFAULT 0,
  error VARCHAR(300) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  INDEX idx_mail_status (status, id)
);

CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  user_name VARCHAR(100),
  action VARCHAR(60) NOT NULL,
  detail VARCHAR(300),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_time (created_at)
);

-- ---- Daily class automation: timetable, class diary, assignments ----
CREATE TABLE timetable (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_id INT NOT NULL,
  weekday TINYINT NOT NULL COMMENT '0 = Sunday ... 6 = Saturday',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(40) NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT chk_weekday CHECK (weekday BETWEEN 0 AND 6),
  INDEX idx_tt_day (weekday, start_time)
);

CREATE TABLE class_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_id INT NOT NULL,
  log_date DATE NOT NULL,
  topic VARCHAR(200) NOT NULL,
  notes TEXT NULL,
  created_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_log (subject_id, log_date)
);

CREATE TABLE assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NULL,
  due_date DATE NOT NULL,
  max_marks DECIMAL(5,1) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_asg_due (due_date)
);

CREATE TABLE assignment_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  status ENUM('submitted','late','missing') NOT NULL,
  marks DECIMAL(5,1) NULL,
  feedback VARCHAR(200) NULL,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY uq_asg_student (assignment_id, student_id)
);
