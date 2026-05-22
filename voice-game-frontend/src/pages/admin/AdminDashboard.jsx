import React, { useEffect, useState } from "react";
import ManageUsers from "./ManageUsers";
import ManageGames from "./ManageGames";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGames: 0
  });

  const authHeader = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  };

  const fetchStats = async () => {
    try {
      const [usersRes, gamesRes] = await Promise.all([
        api.get("/admin/users", authHeader),
        api.get("/admin/games", authHeader)
      ]);

      const users = usersRes.data.data || [];
      const games = gamesRes.data.data || [];

      setStats({
        totalUsers: users.length,
        totalGames: games.length
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    navigate("/");
  };

  const getPageTitle = () => {
    if (activeTab === "home") return "DASHBOARD";
    if (activeTab === "users") return "PLAYERS";
    return "GAMES";
  };

  return (
    <div className="admin-dashboard-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">ADMIN PANEL</h2>
        <div className="admin-sidebar-divider"></div>

        <ul className="admin-menu">
          <li
            className={activeTab === "home" ? "active" : ""}
            onClick={() => setActiveTab("home")}
          >
            Dashboard
          </li>

          <li
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            Player's
          </li>

          <li
            className={activeTab === "games" ? "active" : ""}
            onClick={() => setActiveTab("games")}
          >
            Games
          </li>

          <li onClick={logout}>Logout</li>
        </ul>
      </aside>

      <main className="admin-main-content">
        <div className="admin-top-header">
          <h3>{getPageTitle()}</h3>
          <span>{localStorage.getItem("email") || "admin"}</span>
        </div>

        {activeTab === "home" && (
          <div className="admin-home-section">
            <div className="admin-stats-grid">
              <div className="admin-stat-box pink">
                <div className="admin-stat-icon-box">👥</div>
                <div className="admin-stat-content">
                  <p>Total player's</p>
                  <h2>{stats.totalUsers}</h2>
                  
                </div>
              </div>

              <div className="admin-stat-box orange">
                <div className="admin-stat-icon-box">🎮</div>
                <div className="admin-stat-content">
                  <p>Total games</p>
                  <h2>{stats.totalGames}</h2>
                 
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && <ManageUsers onRefreshStats={fetchStats} />}
        {activeTab === "games" && <ManageGames onRefreshStats={fetchStats} />}
      </main>
    </div>
  );
}

export default AdminDashboard;
