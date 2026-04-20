import { useState } from "react";
import axios from "axios";

function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:8080/api/auth/login", {
        username,
        password,
      });

      if (res.data.role === "ADMIN") {
        localStorage.setItem("isAdmin", "true");
        window.location.href = "/admin";
      }
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <div>
      <h2>Admin Login</h2>
      <input
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default AdminLoginPage;