import React, { useEffect, useState } from "react";
import api from "../../api/axios";

function ManageGames() {
  const [games, setGames] = useState([]);
  const [editingGameId, setEditingGameId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: ""
  });
  const [message, setMessage] = useState("");

  const authHeader = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  };

  const fetchGames = async () => {
    try {
      const res = await api.get("/admin/games", authHeader);
      setGames(res.data.data || []);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load games");
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleVisibility = async (game) => {
    try {
      await api.put(
        `/admin/games/${game.id}/visibility`,
        { isActive: !game.isActive },
        authHeader
      );
      setMessage("Game visibility updated");
      fetchGames();
    } catch (err) {
      console.error(err);
      setMessage("Failed to update visibility");
    }
  };

  const handleEditClick = (game) => {
    setEditingGameId(game.id);
    setEditForm({
      name: game.name || "",
      description: game.description || ""
    });
    setMessage("");
  };

  const handleUpdateGame = async (e) => {
    e.preventDefault();

    try {
      await api.put(`/admin/games/${editingGameId}`, editForm, authHeader);
      setMessage("Game updated successfully");
      setEditingGameId(null);
      setEditForm({ name: "", description: "" });
      fetchGames();
    } catch (err) {
      console.error(err);
      setMessage("Failed to update game");
    }
  };

  const cancelEdit = () => {
    setEditingGameId(null);
    setEditForm({ name: "", description: "" });
  };

  return (
    <div className="admin-section">
      {editingGameId && (
        <div className="admin-card">
          <h2>Edit Game</h2>

          <form className="admin-form" onSubmit={handleUpdateGame}>
            <input
              type="text"
              placeholder="Game name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              required
            />

            <textarea
              placeholder="Game description"
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              required
            />

            <div className="admin-form-actions">
              <button type="submit" className="admin-primary-btn">
                Update Game
              </button>
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-card">
        <h2>Game List</h2>

        {message && <p className="admin-message">{message}</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {games.length > 0 ? (
                games.map((game) => (
                  <tr key={game.id}>
                    <td>{game.id}</td>
                    <td>{game.name}</td>
                    <td>{game.description}</td>
                    <td>
                      <span
                        className={`game-status ${
                          game.isActive ? "active" : "inactive"
                        }`}
                      >
                        {game.isActive ? "Visible" : "Hidden"}
                      </span>
                    </td>
                    <td className="admin-action-cell">
                      <button
                        className="admin-edit-btn"
                        onClick={() => handleEditClick(game)}
                      >
                        Edit
                      </button>

                      <button
                        className={
                          game.isActive
                            ? "admin-hide-btn"
                            : "admin-show-btn"
                        }
                        onClick={() => handleVisibility(game)}
                      >
                        {game.isActive ? "Hide" : "Show"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No games found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ManageGames;
