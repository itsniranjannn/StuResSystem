// Seed curriculum for three kinds of institution so the same system proves it works for any level:
//   BCA  - TU 4-year semester system, GPA grading
//   BBS  - TU 4-year annual system, percentage divisions
//   SCI  - +2 Science (NEB) grades 11-12, grade-point grading
// Codes/credits follow the published curricula as best known; admins can edit all of it in the UI.
// Subject tuple: [code, name, credit, type, internal_full, external_full]
const T = 'theory';
const P = 'project';

const programs = [
  { code: 'BCA', name: 'Bachelor of Computer Applications', level: 'bachelor', grading_scheme: 'tu_gpa', term_label: 'Semester', term_count: 8, term_offset: 0, terms_per_year: 2, pass_percent: 40, attendance_required: 80 },
  { code: 'BBS', name: 'Bachelor of Business Studies', level: 'bachelor', grading_scheme: 'division', term_label: 'Year', term_count: 4, term_offset: 0, terms_per_year: 1, pass_percent: 40, attendance_required: 80 },
  { code: 'SCI', name: '+2 Science (NEB)', level: 'higher_secondary', grading_scheme: 'neb_gpa', term_label: 'Grade', term_count: 2, term_offset: 10, terms_per_year: 1, pass_percent: 35, attendance_required: 80 },
];

const bca = {
  1: [['CACS101', 'Computer Fundamentals and Applications', 3, T, 40, 60], ['CACS102', 'Society and Technology', 3, T, 40, 60], ['CACS103', 'English I', 3, T, 40, 60], ['CACS104', 'Mathematics I', 3, T, 40, 60], ['CACS105', 'Digital Logic', 3, T, 40, 60]],
  2: [['CACS151', 'C Programming', 3, T, 40, 60], ['CACS152', 'Financial Accounting', 3, T, 40, 60], ['CACS153', 'English II', 3, T, 40, 60], ['CACS154', 'Mathematics II', 3, T, 40, 60], ['CACS155', 'Microprocessor and Computer Architecture', 3, T, 40, 60]],
  3: [['CACS201', 'Data Structure and Algorithm', 3, T, 40, 60], ['CACS202', 'Probability and Statistics', 3, T, 40, 60], ['CACS203', 'System Analysis and Design', 3, T, 40, 60], ['CACS204', 'OOP in Java', 3, T, 40, 60], ['CACS205', 'Web Technology', 3, T, 40, 60]],
  4: [['CACS251', 'Operating System', 3, T, 40, 60], ['CACS252', 'Numerical Methods', 3, T, 40, 60], ['CACS253', 'Software Engineering', 3, T, 40, 60], ['CACS254', 'Scripting Language', 3, T, 40, 60], ['CACS255', 'Database Management System', 3, T, 40, 60], ['CACS256', 'Project I', 1.5, P, 100, 0]],
  5: [['CACS301', 'MIS and e-Business', 3, T, 40, 60], ['CACS302', '.NET Technology', 3, T, 40, 60], ['CACS303', 'Computer Networking', 3, T, 40, 60], ['CACS304', 'Introduction to Management', 3, T, 40, 60], ['CACS305', 'Computer Graphics and Animation', 3, T, 40, 60]],
  6: [['CACS351', 'Mobile Programming', 3, T, 40, 60], ['CACS352', 'Distributed System', 3, T, 40, 60], ['CACS353', 'Applied Economics', 3, T, 40, 60], ['CACS354', 'Advanced Java Programming', 3, T, 40, 60], ['CACS355', 'Network Programming', 3, T, 40, 60], ['CACS356', 'Project II', 1.5, P, 100, 0]],
  7: [['CACS401', 'Cyber Law and Professional Ethics', 3, T, 40, 60], ['CACS402', 'Cloud Computing', 3, T, 40, 60], ['CACS403', 'Internship', 3, P, 100, 0]],
  8: [['CACS451', 'Elective (Image Processing / Database Administration)', 3, T, 40, 60], ['CACS452', 'Project III', 6, P, 100, 0]],
};

const bbs = {
  1: [['BBS101', 'Business English', 3, T, 20, 80], ['BBS102', 'Business Statistics', 3, T, 20, 80], ['BBS103', 'Microeconomics for Business', 3, T, 20, 80], ['BBS104', 'Principles of Management', 3, T, 20, 80], ['BBS105', 'Financial Accounting', 3, T, 20, 80]],
  2: [['BBS201', 'Business Communication', 3, T, 20, 80], ['BBS202', 'Macroeconomics', 3, T, 20, 80], ['BBS203', 'Cost and Management Accounting', 3, T, 20, 80], ['BBS204', 'Business Law', 3, T, 20, 80], ['BBS205', 'Organizational Behavior', 3, T, 20, 80]],
  3: [['BBS301', 'Marketing Management', 3, T, 20, 80], ['BBS302', 'Human Resource Management', 3, T, 20, 80], ['BBS303', 'Business Research Methods', 3, T, 20, 80], ['BBS304', 'Taxation in Nepal', 3, T, 20, 80], ['BBS305', 'Financial Management', 3, T, 20, 80]],
  4: [['BBS401', 'Strategic Management', 3, T, 20, 80], ['BBS402', 'Entrepreneurship', 3, T, 20, 80], ['BBS403', 'Banking and Insurance', 3, T, 20, 80], ['BBS404', 'Business Project', 3, P, 100, 0]],
};

const sci = {
  1: [['SCI111', 'Compulsory English (Grade 11)', 3, T, 25, 75], ['SCI112', 'Compulsory Nepali (Grade 11)', 3, T, 25, 75], ['SCI113', 'Physics (Grade 11)', 5, T, 25, 75], ['SCI114', 'Chemistry (Grade 11)', 5, T, 25, 75], ['SCI115', 'Mathematics (Grade 11)', 5, T, 25, 75], ['SCI116', 'Computer Science (Grade 11)', 5, T, 25, 75]],
  2: [['SCI121', 'Compulsory English (Grade 12)', 3, T, 25, 75], ['SCI122', 'Compulsory Nepali (Grade 12)', 3, T, 25, 75], ['SCI123', 'Physics (Grade 12)', 5, T, 25, 75], ['SCI124', 'Chemistry (Grade 12)', 5, T, 25, 75], ['SCI125', 'Mathematics (Grade 12)', 5, T, 25, 75], ['SCI126', 'Computer Science (Grade 12)', 5, T, 25, 75]],
};

module.exports = { programs, curricula: { BCA: bca, BBS: bbs, SCI: sci } };
