import { useState, useEffect } from "react";
import axios from "axios";

function RegistrationPage() {
  const [formData, setFormData] = useState({
    usn: "",
    name: "",
    email: "",
    phone: "",
    yearOfJoining: "",
    semester: "",
  });
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [regId, setRegId] = useState("");

  // whenever year or semester changes, fetch subjects
  useEffect(() => {
    if (formData.yearOfJoining && formData.semester) {
      setLoadingSubjects(true);
      axios
        .get(`http://localhost:8080/api/subjects`, {
          params: {
            year: formData.yearOfJoining,
            semester: formData.semester,
          },
        })
        .then((res) => {
          setSubjects(res.data);
          setSelectedSubjects([]);
          setLoadingSubjects(false);
        });
    } else {
      setSubjects([]);
    }
  }, [formData.yearOfJoining, formData.semester]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
  };

  const handleSubmit = async () => {
    if (!formData.usn || !formData.name || !formData.email) {
      alert("Please fill in all required fields");
      return;
    }
    if (selectedSubjects.length === 0) {
      alert("Please select at least one subject");
      return;
    }

    try {
      const res = await axios.post("http://localhost:8080/api/register", {
        rollNo: formData.usn,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        yearOfJoining: parseInt(formData.yearOfJoining),
        currentSemester: parseInt(formData.semester),
        subjectIds: selectedSubjects,
      });
      setRegId(res.data.regId);
      setSubmitted(true);
    } catch (err) {
      alert("Submission failed. Please try again.");
      console.error(err);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`http://localhost:8080/api/pdf/${regId}`, "_blank");
  };

  // success screen
  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={{ color: "green" }}>✓ Registration Submitted</h2>
          <p>
            Your registration ID is: <strong>{regId}</strong>
          </p>
          <p>
            Please download your form, print it, and get it signed by your
            Proctor and HOD.
          </p>
          <button style={styles.primaryBtn} onClick={handleDownloadPdf}>
            Download PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Backlog Registration</h1>
        <p style={styles.subtitle}>
          CS Department — Fill in your details below
        </p>

        {/* Student Details */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Student Details</h3>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>USN *</label>
              <input
                style={styles.input}
                name="usn"
                placeholder="e.g. 1CS22CS001"
                value={formData.usn}
                onChange={handleChange}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Full Name *</label>
              <input
                style={styles.input}
                name="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email *</label>
              <input
                style={styles.input}
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone</label>
              <input
                style={styles.input}
                name="phone"
                placeholder="10 digit number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Year of Joining *</label>
              <select
                style={styles.input}
                name="yearOfJoining"
                value={formData.yearOfJoining}
                onChange={handleChange}
              >
                <option value="">Select year</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Semester *</label>
              <select
                style={styles.input}
                name="semester"
                value={formData.semester}
                onChange={handleChange}
              >
                <option value="">Select semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subject Selection */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Select Backlog Subjects</h3>
          {!formData.yearOfJoining || !formData.semester ? (
            <p style={{ color: "#888" }}>
              Select your year and semester above to see subjects.
            </p>
          ) : loadingSubjects ? (
            <p>Loading subjects...</p>
          ) : subjects.length === 0 ? (
            <p style={{ color: "#888" }}>
              No subjects found for this year and semester.
            </p>
          ) : (
            subjects.map((subject) => (
              <div
                key={subject.id}
                style={{
                  ...styles.subjectRow,
                  background: selectedSubjects.includes(subject.id)
                    ? "#e8f4e8"
                    : "#f9f9f9",
                }}
              >
                <input
                  type="checkbox"
                  id={`subject-${subject.id}`}
                  checked={selectedSubjects.includes(subject.id)}
                  onChange={() => handleSubjectToggle(subject.id)}
                />
                <label
                  htmlFor={`subject-${subject.id}`}
                  style={{
                    marginLeft: "12px",
                    fontSize: "1rem",
                    cursor: "pointer",
                    flex: 1,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{subject.subjectName}</span>
                  <span style={{ color: "#888", fontSize: "0.85rem" }}>
                    {subject.department.deptName}
                  </span>
                </label>
              </div>
            ))
          )}
        </div>

        {/* Submit */}
        <button
          style={styles.primaryBtn}
          onClick={handleSubmit}
          disabled={selectedSubjects.length === 0}
        >
          Submit Registration
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f0f2f5", padding: "2rem" },
  card: {
    maxWidth: "700px",
    margin: "0 auto",
    background: "white",
    borderRadius: "12px",
    padding: "2rem",
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
  },
  title: { fontSize: "1.8rem", fontWeight: "700", marginBottom: "4px" },
  subtitle: { color: "#666", marginBottom: "2rem" },
  section: {
    marginBottom: "2rem",
    borderTop: "1px solid #eee",
    paddingTop: "1.5rem",
  },
  sectionTitle: { fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  field: { display: "flex", flexDirection: "column", gap: "4px" },
  label: { fontSize: "0.85rem", fontWeight: "500", color: "#444" },
  input: {
    padding: "0.6rem 0.8rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "0.95rem",
  },
  subjectRow: {
    display: "flex",
    alignItems: "center",
    padding: "0.8rem 1rem",
    borderRadius: "8px",
    marginBottom: "0.5rem",
    cursor: "pointer",
    border: "1px solid #eee",
  },
  primaryBtn: {
    width: "100%",
    padding: "0.9rem",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "1rem",
  },
};

export default RegistrationPage;
