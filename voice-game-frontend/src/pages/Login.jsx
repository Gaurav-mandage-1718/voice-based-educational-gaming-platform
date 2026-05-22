import { useState } from "react";
import api from "../api/axios";
import "./Auth.css";
import { useNavigate } from "react-router-dom";

function Login() {

  const navigate = useNavigate();

  const [data, setData] = useState({
    email: "",
    password: ""
  });

 const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const res = await api.post("/auth/login", data);

    console.log(res.data); // 
    if (!res.data || !res.data.data) {
      alert("Something wrong in response");
      return;
    }

    const token = res.data.data.token;
    const role = res.data.data.role;

    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("email", data.email); 

    if (role === "ADMIN") {
      navigate("/admin");
    } else {
      navigate("/user");
    }

  }  catch (err) {
  console.error(err);
  console.log(err.response?.data);
  alert(err.response?.data?.message || "Login Failed");
  }
};

  return (
    <div className="auth-container">
      <div className="auth-card">

        <h2>Login Here</h2>

        <form onSubmit={handleSubmit} autoComplete="off">

          <input
            type="email"
            placeholder="Enter Email"
            onChange={e => setData({...data, email: e.target.value})}
          />

          <input
            type="password"
            placeholder="Enter Password"
            autoComplete="new-password"
            onChange={e => setData({...data, password: e.target.value})}
          />

          <button type="submit">Login</button>

           <p>
            I don't have an account? <a href="/Register">Register</a>
          </p>

      
        </form>

      </div>
    </div>
  );
}

export default Login;













