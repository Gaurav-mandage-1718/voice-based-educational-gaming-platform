import React, { useEffect, useState } from "react";
import "./Profile.css";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/user/profile");
      setProfile(res.data?.data || null);
    } catch (err) {
      console.error(err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-status">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-status error">{error}</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-banner"></div>

        <div className="profile-content">
          <div className="profile-top">
            <button className="back-btn" onClick={() => navigate("/user")}>
              Back
            </button>
          </div>

          <div className="profile-avatar">
            {profile?.username?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <h1>{profile?.username || "User"}</h1>
          <p className="profile-role">{profile?.role || "USER"}</p>

          <div className="profile-grid">
            <div className="profile-item">
              <span>Name</span>
              <strong>{profile?.username || "-"}</strong>
            </div>

            <div className="profile-item">
              <span>Email</span>
              <strong>{profile?.email || "-"}</strong>
            </div>

            <div className="profile-item">
              <span>Role</span>
              <strong>{profile?.role || "-"}</strong>
            </div>

            <div className="profile-item">
              <span>Status</span>
              <strong>Active</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
