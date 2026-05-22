import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const categoryOrder = [
  "Mental Mathematics Games",
  "Attention & Memory Games",
  "Learning & Vocabulary Games"
];

const gameRouteMap = {
  "Basic Math Game": "/basic-math",
  "Find Operator": "/operator",
  "Tasty Fractions": "/Fractions",
  "Tricky Percentages": "/Percentages",

  "Missing number Game": "/find-missing-number",
  "Fan Count Game": "/fan-count",
  "Logical Puzzle": "/logical-puzzle",
  "Phone Number Memory Game": "/phone-number-memory",

  "Quiz Game": "/Quiz",
  "Spelling Game": "/spelling",
  "Rhyme Game": "/rhyme-words",
  "Odd One Out": "/odd-one-out"
};

const categoryMap = {
  "Basic Math Game": "Mental Mathematics Games",
  "Find Operator": "Mental Mathematics Games",
  "Tasty Fractions": "Mental Mathematics Games",
  "Tricky Percentages": "Mental Mathematics Games",

  "Missing number Game": "Attention & Memory Games",
  "Fan Count Game": "Attention & Memory Games",
  "Logical Puzzle": "Attention & Memory Games",
  "Phone Number Memory Game": "Attention & Memory Games",

  "Quiz Game": "Learning & Vocabulary Games",
  "Spelling Game": "Learning & Vocabulary Games",
  "Rhyme Game": "Learning & Vocabulary Games",
  "Odd One Out": "Learning & Vocabulary Games"
};

const gameOrder = {
  "Mental Mathematics Games": [
    "Basic Math Game",
    "Find Operator",
    "Tasty Fractions",
    "Tricky Percentages"
  ],
  "Attention & Memory Games": [
    "Missing number Game",
    "Fan Count Game",
    "Logical Puzzle",
    "Phone Number Memory Game"
  ],
  "Learning & Vocabulary Games": [
    "Quiz Game",
    "Spelling Game",
    "Rhyme Game",
    "Odd One Out"
  ]
};

function UserDashboard() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [dark, setDark] = useState(false);
  const [gamesByCategory, setGamesByCategory] = useState({});
  const [gamesLoading, setGamesLoading] = useState(true);

  const [stats, setStats] = useState({
    totalGames: 0,
    totalPlayers: 0
  });

  const [globalTopPlayers, setGlobalTopPlayers] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("email");
    setUsername(user || "User");
    fetchDashboardData();
    fetchActiveGames();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setStatsLoading(true);
      setLeaderboardLoading(true);
      setStatsError("");
      setLeaderboardError("");

      const [gamesRes, usersRes, globalRes] = await Promise.all([
        api.get("/user/games/active/count"),
        api.get("/users/count"),
        api.get("/user/global-leaderboard")
      ]);

      setStats({
        totalGames: gamesRes.data?.data ?? 0,
        totalPlayers: usersRes.data?.data ?? usersRes.data ?? 0
      });

      setGlobalTopPlayers((globalRes.data?.data || []).slice(0, 3));
    } catch (err) {
      console.error(err);
      setStatsError("Failed to load dashboard stats.");
      setLeaderboardError("Failed to load global leaderboard.");
      setGlobalTopPlayers([]);
    } finally {
      setStatsLoading(false);
      setLeaderboardLoading(false);
    }
  };

  const fetchActiveGames = async () => {
    try {
      setGamesLoading(true);
      const res = await api.get("/user/games/active");
      const activeGames = res.data?.data || [];

      const grouped = {};

      activeGames.forEach((game) => {
        const finalCategory = categoryMap[game.name];
        const finalPath = gameRouteMap[game.name] || "#";

        if (!finalCategory) return;

        if (!grouped[finalCategory]) {
          grouped[finalCategory] = [];
        }

        grouped[finalCategory].push({
          id: game.id,
          name: game.name,
          description: game.description,
          path: finalPath
        });
      });

      Object.keys(grouped).forEach((category) => {
        if (gameOrder[category]) {
          grouped[category].sort((a, b) => {
            const aIndex = gameOrder[category].indexOf(a.name);
            const bIndex = gameOrder[category].indexOf(b.name);
            return aIndex - bIndex;
          });
        }
      });

      setGamesByCategory(grouped);
    } catch (err) {
      console.error("Failed to load active games", err);
      setGamesByCategory({});
    } finally {
      setGamesLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    navigate("/");
  };

  return (
    <div className={`dashboard-layout ${dark ? "dark" : ""}`}>
      <div className="sidebar">
        <h2 className="sidebar-title">Play Zone</h2>

        <ul className="menu">
          <li onClick={() => navigate("/user")}>Games</li>
          <li onClick={() => navigate("/profile")}>Profile</li>
          <li onClick={() => navigate("/leaderboard")}>Leaderboard</li>
          <li onClick={logout}>Logout</li>
        </ul>
      </div>

      <div className="main-content">
        <div className="header">
          <h3>DASHBOARD</h3>

          <div className="header-actions">
            <button className="theme-btn" onClick={() => setDark(!dark)}>
              {dark ? "Light" : "Dark"}
            </button>
            <span className="user">{username}</span>
          </div>
        </div>

        <div className="stats">
          <div className="stat-card pink">
            <h4>Total Games</h4>
            {statsLoading ? <p>...</p> : <p>{stats.totalGames}</p>}
            <span>{statsError ? statsError : "Available in platform"}</span>
          </div>

          <div className="stat-card orange">
            <h4>Total Players</h4>
            {statsLoading ? <p>...</p> : <p>{stats.totalPlayers}</p>}
            <span>{statsError ? statsError : "Registered users"}</span>
          </div>

          <div className="stat-card purple">
            <h3 className="section-title leaderboard-title">Top Players</h3>

            {leaderboardLoading ? (
              <div className="mini-loader">Loading global leaderboard...</div>
            ) : leaderboardError ? (
              <div className="error-text">{leaderboardError}</div>
            ) : globalTopPlayers.length === 0 ? (
              <div className="empty-text">No leaderboard data yet.</div>
            ) : (
              <div className="leaderboard">
                {globalTopPlayers.map((player, index) => (
                  <div key={index} className={`leader-card rank-${index}`}>
                    <span>
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                    </span>
                    <span>{player.username}</span>
                    <span>{player.totalScore}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="games-header">
          <h2>Games</h2>
        </div>

        {gamesLoading ? (
          <p>Loading games...</p>
        ) : Object.keys(gamesByCategory).length === 0 ? (
          <p>No active games available.</p>
        ) : (
          categoryOrder
            .filter((category) => gamesByCategory[category]?.length > 0)
            .map((category) => (
              <div key={category}>
                <h3 className="section-title">{category}</h3>

                <div className="games-grid">
                  {gamesByCategory[category].map((game) => (
                    <div key={game.id} className="game-card">
                      <h4>{game.name}</h4>
                      <p>{game.description || "Play and improve your skills"}</p>
                      <button
                        onClick={() => {
                          if (game.path !== "#") {
                            navigate(game.path);
                          } else {
                            alert(`Route not added for ${game.name}`);
                          }
                        }}
                      >
                        Play
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default UserDashboard;