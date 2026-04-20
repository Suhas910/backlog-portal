import { useState, useEffect } from "react";
import axios from "axios";

function AdminPage() {
  if (localStorage.getItem("isAdmin") !== "true") {
    return <h2>Access Denied</h2>;
  }
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    axios.get("http://localhost:8080/api/admin/registrations").then((res) => {
      setRegistrations(res.data);
      setLoading(false);
    });
  }, []);

  const handleVerify = async (qrToken) => {
    try {
      await axios.put(`http://localhost:8080/api/register/verify/${qrToken}`);
      alert("Verified successfully");
      window.location.reload();
    } catch (err) {
      alert("Verification failed");
      console.error(err);
    }
  };

  const filtered =
    filter === "ALL"
      ? registrations
      : registrations.filter((r) => r.status === filter);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <p style={styles.subtitle}>CS Department — All Backlog Registrations</p>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <span style={styles.statNumber}>{registrations.length}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statNumber}>
              {registrations.filter((r) => r.status === "SUBMITTED").length}
            </span>
            <span style={styles.statLabel}>Pending</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statNumber}>
              {registrations.filter((r) => r.status === "VERIFIED").length}
            </span>
            <span style={styles.statLabel}>Verified</span>
          </div>
        </div>

        {/* Filter */}
        <div style={{ marginBottom: "1rem", display: "flex", gap: "8px" }}>
          {["ALL", "SUBMITTED", "VERIFIED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                border: "1px solid #ddd",
                background: filter === f ? "#2563eb" : "white",
                color: filter === f ? "white" : "#333",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>USN</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Semester</th>
                <th style={styles.th}>Subjects</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((reg) => (
                <tr key={reg.regId} style={styles.tableRow}>
                  <td style={styles.td}>{reg.rollNo}</td>
                  <td style={styles.td}>{reg.studentName}</td>
                  <td style={styles.td}>{reg.semester}</td>
                  <td style={styles.td}>{reg.subjects.join(", ")}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        background:
                          reg.status === "VERIFIED" ? "#d1fae5" : "#fef3c7",
                        color:
                          reg.status === "VERIFIED" ? "#065f46" : "#92400e",
                      }}
                    >
                      {reg.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(reg.registeredAt).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>
                    {reg.status === "SUBMITTED" ? (
                      <button
                        onClick={() => handleVerify(reg.qrToken)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: "none",
                          background: "#22c55e",
                          color: "white",
                          cursor: "pointer",
                        }}
                      >
                        Verify
                      </button>
                    ) : (
                      <span style={{ color: "green", fontWeight: "600" }}>
                        Verified
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f0f2f5", padding: "2rem" },
  card: {
    maxWidth: "900px",
    margin: "0 auto",
    background: "white",
    borderRadius: "12px",
    padding: "2rem",
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
  },
  title: { fontSize: "1.8rem", fontWeight: "700", marginBottom: "4px" },
  subtitle: { color: "#666", marginBottom: "2rem" },
  statsRow: { display: "flex", gap: "1rem", marginBottom: "2rem" },
  statBox: {
    flex: 1,
    background: "#f0f2f5",
    borderRadius: "8px",
    padding: "1rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statNumber: { fontSize: "2rem", fontWeight: "700", color: "#2563eb" },
  statLabel: { fontSize: "0.85rem", color: "#666" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHeader: { background: "#f8fafc" },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: "600",
    fontSize: "0.85rem",
    color: "#666",
    borderBottom: "2px solid #eee",
  },
  tableRow: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "12px 16px", fontSize: "0.9rem" },
};

export default AdminPage;
