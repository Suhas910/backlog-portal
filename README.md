# Backlog Registration Portal

This project is a modern, full-stack web application designed to digitize and streamline the process of student registration for backlog (supplementary) examinations at an academic institution. It replaces a tedious, manual, paper-based system with an efficient, accurate, and user-friendly digital workflow.

Built for my college, this portal aims to significantly reduce administrative overhead, minimize data entry errors, and provide a much-improved experience for both students and staff.

## The Problem: A Manual Process

Traditionally, registering for backlog exams involves several manual steps that are inefficient and prone to error:

- **Manual Form Filling:** Students have to physically collect forms, fill them out by hand, and risk making mistakes with subject codes or personal details.
- **Data Entry Burden:** Administrative staff must manually enter the data from hundreds of physical forms into a spreadsheet or database, a time-consuming and error-prone task.
- **Difficult Tracking:** There is no centralized, real-time system to track the status of registrations, making it hard to know who has submitted forms and whose are pending approval.
- **Wasted Time:** Students and staff spend valuable time standing in queues, handling paperwork, and correcting errors.

## The Solution: A Digital-First Approach

This portal solves these problems by providing a centralized, web-based platform for the entire registration lifecycle.

### How It Works

The workflow is divided into two simple parts for the student and the administrator.

#### Student Flow

1.  **Enter Details:** The student visits the portal, enters their personal and academic information (Name, USN, Semester, etc.).
2.  **Select Subjects:** The system displays a list of relevant backlog subjects for their batch and semester. The student selects the subjects they need to register for.
3.  **Submit & Download:** Upon submission, the system instantly generates a pre-filled, professional PDF registration form containing all the entered details.
4.  **Sign & Submit Physically:** The student downloads, prints, and obtains the required physical signatures (Student, Proctor, HOD).
5.  **Final Submission:** The signed hard copy is submitted to the department office for final verification.

#### Admin Flow

1.  **Login:** The administrator securely logs into a dedicated admin dashboard.
2.  **View Registrations:** The dashboard displays a comprehensive list of all student registrations, which can be filtered by status (e.g., `SUBMITTED`, `VERIFIED`).
3.  **Verify:** When a student submits the physical form, the admin finds the corresponding digital record using the Registration ID or student name.
4.  **Approve:** The admin clicks "Verify" to mark the registration as complete, updating its status in the central database.

## Key Features

- **Dynamic Student Form:** A clean, user-friendly interface for students to enter their information.
- **Automated Subject Filtering:** Intelligently fetches and displays only the relevant subjects based on the student's batch and semester.
- **Instant PDF Generation:** Uses the **iTextPDF** library to create a standardized, professional, and ready-to-print A4 registration form on the fly.
- **Centralized Admin Dashboard:** A secure area for administrators to view, manage, and track all registrations in real-time.
- **Status Tracking:** Clear `SUBMITTED` and `VERIFIED` statuses provide visibility into the progress of each registration.
- **Secure Authentication:** The admin portal is protected by JWT-based authentication with security features like brute-force login prevention.

## Benefits for the College

- **Increased Efficiency:** Frees up administrative staff from hours of manual data entry, allowing them to focus on more critical tasks.
- **Improved Accuracy:** Dramatically reduces errors by eliminating handwritten forms and ensuring data is captured correctly from the start.
- **Centralized Data:** Provides a single, searchable source of truth for all backlog registrations, making reporting and auditing simple.
- **Enhanced Student Experience:** Offers students a convenient, fast, and modern way to complete their registration from anywhere.
- **Standardization:** Enforces a consistent format for all registration documents, simplifying processing and filing.
- **Cost and Paper Reduction:** Reduces the reliance on pre-printed forms and minimizes paper waste.

## Technology Stack

This project is built with a modern, robust, and scalable technology stack.

| Area         | Technology                                                           |
| :----------- | :------------------------------------------------------------------- |
| **Backend**  | Java, Spring Boot, Spring Data JPA, Spring Security, iTextPDF, Maven |
| **Frontend** | React, Vite, JavaScript, CSS, Framer Motion                          |
| **Database** | PostgreSQL / MySQL (or any JPA-compatible relational database)       |
| **Testing**  | Cypress (for End-to-End tests)                                       |

---

This project serves as a practical demonstration of how modern software engineering can be applied to solve real-world administrative challenges within an educational institution.
