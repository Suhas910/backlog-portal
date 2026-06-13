INSERT INTO departments (dept_name, contact_email)
SELECT 'CSE', 'cse@example.edu'
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE dept_name = 'CSE'
);

INSERT INTO departments (dept_name, contact_email)
SELECT 'ISE', 'ise@example.edu'
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE dept_name = 'ISE'
);

INSERT INTO subjects (subject_name, course_code, credits, semester, academic_year_offered, dept_id)
SELECT 'Mathematics-I', '22MAT11', 4, 1, 2022, d.id
FROM departments d
WHERE d.dept_name = 'CSE'
  AND NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.subject_name = 'Mathematics-I'
  );

INSERT INTO subjects (subject_name, course_code, credits, semester, academic_year_offered, dept_id)
SELECT 'Programming Fundamentals', '22CSE12', 3, 1, 2022, d.id
FROM departments d
WHERE d.dept_name = 'CSE'
  AND NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.subject_name = 'Programming Fundamentals'
  );

INSERT INTO subjects (subject_name, course_code, credits, semester, academic_year_offered, dept_id)
SELECT 'Data Structures', '22CS32', 4, 3, 2022, d.id
FROM departments d
WHERE d.dept_name = 'CSE'
  AND NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.subject_name = 'Data Structures'
  );

INSERT INTO subjects (subject_name, course_code, credits, semester, academic_year_offered, dept_id)
SELECT 'Database Systems', '23IS41', 4, 4, 2023, d.id
FROM departments d
WHERE d.dept_name = 'ISE'
  AND NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.subject_name = 'Database Systems'
  );

INSERT INTO subjects (subject_name, course_code, credits, semester, academic_year_offered, dept_id)
SELECT 'Operating Systems', '24CS53', 3, 5, 2024, d.id
FROM departments d
WHERE d.dept_name = 'CSE'
  AND NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.subject_name = 'Operating Systems'
  );