import { useState } from "react";
import api from "../api/axios";
import "./Auth.css";

function Register() {

  const [data, setData] = useState({
    username: "",
    email: "",
    password: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/auth/register", data);
      alert("Registered Successfully");
      window.location.href = "/";
    } catch (err) {
      alert("Error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        <h2>Create Account 🚀</h2>

        <form onSubmit={handleSubmit} autoComplete="off">

          <input
            type="text"
            placeholder="Username"
            onChange={e => setData({...data, username: e.target.value})}
          />

          <input
            type="email"
            placeholder="Email"
            onChange={e => setData({...data, email: e.target.value})}
          />

          <input
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            onChange={e => setData({...data, password: e.target.value})}
          />

          <button type="submit">Register</button>

        </form>

        <p>
          Already have an account? <a href="/">Login</a>
        </p>

      </div>
    </div>
  );
}

export default Register;