function HomePage() {
  return (
    <div style={styles.container}>
      <h1>Backlog Registration Portal</h1>

      <div style={styles.buttons}>
        <button
          style={styles.button}
          onClick={() => (window.location.href = "/register")}
        >
          Student
        </button>

        <button
          style={styles.button}
          onClick={() => (window.location.href = "/admin/login")}
        >
          Admin
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "30px",
  },
  buttons: {
    display: "flex",
    gap: "20px",
  },
  button: {
    padding: "12px 24px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },
};

export default HomePage;
