import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Leaderboard.css";

function GlobalLeaderboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, []);

  const fetchGlobalLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user/global-leaderboard");
      setData(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load global leaderboard:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <h2>Global Leaderboard</h2>
          <button className="back-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="leaderboard-table">
          <div className="leaderboard-table-header">
            <span>Rank</span>
            <span>Player Name</span>
            <span>Total Score</span>
          </div>

          {loading ? (
            <div className="empty-row">Loading leaderboard...</div>
          ) : data.length === 0 ? (
            <div className="empty-row">No leaderboard data found.</div>
          ) : (
            data.map((item, index) => (
              <div className="leaderboard-row" key={`${item.username}-${index}`}>
                <span className="rank-badge">
                  {index === 0
                    ? "🥇 1"
                    : index === 1
                    ? "🥈 2"
                    : index === 2
                    ? "🥉 3"
                    : index + 1}
                </span>
                <span>{item.username}</span>
                <span>{item.totalScore}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalLeaderboard;
