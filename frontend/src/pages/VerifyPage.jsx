import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"

function VerifyPage() {
  const { qrToken } = useParams()
  const [registration, setRegistration] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [verified, setVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    axios.get(`http://localhost:8080/api/register/verify/${qrToken}`)
      .then(res => {
        setRegistration(res.data)
        setLoading(false)
        if (res.data.status === "VERIFIED") setVerified(true)
      })
      .catch(() => {
        setError("Invalid or expired QR code.")
        setLoading(false)
      })
  }, [qrToken])

  const handleVerify = async () => {
    setVerifying(true)
    try {
      await axios.put(`http://localhost:8080/api/register/verify/${qrToken}`)
      setVerified(true)
      setRegistration(prev => ({ ...prev, status: "VERIFIED" }))
    } catch {
      setError("Verification failed. Please try again.")
    }
    setVerifying(false)
  }

  if (loading) return <div style={styles.container}><p>Loading...</p></div>
  if (error) return <div style={styles.container}><p style={{ color: "red" }}>{error}</p></div>

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Backlog Registration Verification</h2>
          <span style={{
            ...styles.badge,
            background: verified ? "#d1fae5" : "#fef3c7",
            color: verified ? "#065f46" : "#92400e"
          }}>
            {verified ? "✓ VERIFIED" : "⏳ SUBMITTED"}
          </span>
        </div>

        {/* Student Details */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Student Details</h3>
          <div style={styles.detailsGrid}>
            <div style={styles.detailRow}>
              <span style={styles.label}>USN</span>
              <span style={styles.value}>{registration.rollNo}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Name</span>
              <span style={styles.value}>{registration.studentName}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Email</span>
              <span style={styles.value}>{registration.email}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Year of Joining</span>
              <span style={styles.value}>{registration.yearOfJoining}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Semester</span>
              <span style={styles.value}>{registration.semester}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Registration ID</span>
              <span style={styles.value}>{registration.regId}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Registered At</span>
              <span style={styles.value}>
                {new Date(registration.registeredAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Subjects */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Registered Subjects</h3>
          {registration.subjects.map((subject, index) => (
            <div key={index} style={styles.subjectRow}>
              <span style={styles.subjectNumber}>{index + 1}</span>
              <span>{subject}</span>
            </div>
          ))}
        </div>

        {/* Verify Button */}
        {!verified ? (
          <div style={styles.section}>
            <p style={{ color: "#666", marginBottom: "1rem" }}>
              Physical form received and signatures verified? Click below to mark as official.
            </p>
            <button
              style={styles.verifyBtn}
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? "Verifying..." : "Mark as Verified"}
            </button>
          </div>
        ) : (
          <div style={{
            ...styles.section,
            background: "#d1fae5",
            borderRadius: "8px",
            padding: "1rem",
            textAlign: "center"
          }}>
            <p style={{ color: "#065f46", fontWeight: "600", margin: 0 }}>
              ✓ This registration has been officially verified
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: "100vh", background: "#f0f2f5", padding: "2rem" },
  card: { maxWidth: "600px", margin: "0 auto", background: "white", borderRadius: "12px", padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.1)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { fontSize: "1.3rem", fontWeight: "700", margin: 0 },
  badge: { padding: "4px 12px", borderRadius: "20px", fontWeight: "600", fontSize: "0.85rem" },
  section: { borderTop: "1px solid #eee", paddingTop: "1.5rem", marginBottom: "1.5rem" },
  sectionTitle: { fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" },
  detailsGrid: { display: "flex", flexDirection: "column", gap: "8px" },
  detailRow: { display: "flex", gap: "1rem" },
  label: { fontWeight: "500", color: "#666", minWidth: "140px", fontSize: "0.9rem" },
  value: { color: "#111", fontSize: "0.9rem" },
  subjectRow: { display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px", background: "#f9f9f9", borderRadius: "6px", marginBottom: "6px" },
  subjectNumber: { background: "#2563eb", color: "white", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "600" },
  verifyBtn: { width: "100%", padding: "0.9rem", background: "#059669", color: "white", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: "600", cursor: "pointer" }
}

export default VerifyPage