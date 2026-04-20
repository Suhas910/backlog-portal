SET search_path TO public;
CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    dept_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS subjects (
    id BIGSERIAL PRIMARY KEY,
    subject_name VARCHAR(255) NOT NULL,
    semester INTEGER NOT NULL,
    year_of_joining INTEGER NOT NULL,
    dept_id BIGINT REFERENCES departments(id)
);