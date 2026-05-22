import React, { useEffect, useState } from "react";
import api from "../../api/axios";

function ManageUsers({ onRefreshStats }) {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER"
  });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  const authHeader = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users", authHeader);
      setUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "USER"
    });
    setEditingId(null);
    setShowForm(false);
    setMessage("");
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      email: "",
      password: "",
      role: "USER"
    });
    setShowForm(true);
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (editingId) {
        await api.put(
          `/admin/users/${editingId}`,
          {
            name: form.name,
            email: form.email,
            role: form.role
          },
          authHeader
        );
        setMessage("User updated successfully");
      } else {
        await api.post(
          "/admin/users",
          {
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role
          },
          authHeader
        );
        setMessage("User added successfully");
      }

      resetForm();
      fetchUsers();
      onRefreshStats?.();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Operation failed");
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setForm({
      name: user.username || "",
      email: user.email || "",
      password: "",
      role: user.role || "USER"
    });
    setShowForm(true);
    setMessage("");
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this user?");
    if (!ok) return;

    try {
      await api.delete(`/admin/users/${id}`, authHeader);
      setMessage("User deleted successfully");
      fetchUsers();
      onRefreshStats?.();
    } catch (err) {
      console.error(err);
      setMessage("Delete failed");
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-table-title">All Player's</div>

          <button
            type="button"
            className="admin-primary-btn"
            onClick={openAddForm}
          >
            Add User
          </button>
        </div>

        {showForm && (
          <div className="admin-form-wrapper">
            <h2>{editingId ? "Edit User" : "Add User"}</h2>

            <form
              className="admin-form"
              onSubmit={handleSubmit}
              autoComplete="off"
            >
              <input
                type="text"
                placeholder="Enter name"
                value={form.name}
                autoComplete="off"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />

              <input
                type="email"
                placeholder="Enter email"
                value={form.email}
                autoComplete="off"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />

              {!editingId && (
                <input
                  type="password"
                  placeholder="Enter password"
                  value={form.password}
                  autoComplete="new-password"
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                />
              )}

              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>

              <div className="admin-form-actions">
                <button type="submit" className="admin-primary-btn">
                  {editingId ? "Update User" : "Save User"}
                </button>

                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {message && <p className="admin-message">{message}</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Player name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td className="admin-action-cell">
                      <button
                        type="button"
                        className="admin-edit-btn"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="admin-delete-btn"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ManageUsers;
