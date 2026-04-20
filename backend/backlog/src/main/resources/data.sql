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

INSERT INTO subjects (subject_name, semester, year_of_joining, dept_id)
SELECT 'Mathematics-I', 1, 2022, d.id
FROM departments d
WHERE d.dept_name = 'CSE'
  AND NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.subject_name = 'Mathematics-I'
        AND s.semester = 1
        AND s.year_of_joining = 2022
        AND s.dept_id = d.id
  );

INSERT INTO subjects (subject_name, semester, year_of_joining, dept_id)
SELECT 'Programming Fundamentals', 1, 2022, d.id
FROM departments d
WHERE d.dept_name = 'CSE'
  AND NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.subject_name = 'Programming Fundamentals'
        AND s.semester = 1
        AND s.year_of_joining = 2022
        AND s.dept_id = d.id
  );

INSERT INTO subjects (subject_name, semester, year_of_joining, dept_id)
SELECT 'Data Structures', 3, 2022, d.id
FROM departments d
WHERE d.dept_name = 'CSE'
  AND NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.subject_name = 'Data Structures'
        AND s.semester = 3
        AND s.year_of_joining = 2022
        AND s.dept_id = d.id
  );

INSERT INTO subjects (subject_name, semester, year_of_joining, dept_id)
SELECT 'Database Systems', 4, 2023, d.id
FROM departments d
WHERE d.dept_name = 'ISE'
  AND NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.subject_name = 'Database Systems'
        AND s.semester = 4
        AND s.year_of_joining = 2023
        AND s.dept_id = d.id
  );

INSERT INTO subjects (subject_name, semester, year_of_joining, dept_id)
SELECT 'Operating Systems', 5, 2024, d.id
FROM departments d
WHERE d.dept_name = 'CSE'
  AND NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.subject_name = 'Operating Systems'
        AND s.semester = 5
        AND s.year_of_joining = 2024
        AND s.dept_id = d.id
  );