import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { joinGroupByInviteAPI } from "../api/chatApi";
import { useAuth } from "../context/AuthContext";

export default function JoinGroupPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState("Dang tham gia nhom...");

  useEffect(() => {
    const join = async () => {
      if (!localStorage.getItem("token") || !user) {
        navigate("/login", {
          replace: true,
          state: { from: `/join-group/${token}` },
        });
        return;
      }

      const res = await joinGroupByInviteAPI(token);
      if (res?.success) {
        setMessage("Da tham gia nhom. Dang chuyen ve man hinh chat...");
        setTimeout(() => navigate("/", { replace: true }), 800);
      } else {
        setMessage(res?.message || "Khong the tham gia nhom");
      }
    };

    join();
  }, [token, navigate, user]);

  return (
    <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="bg-white rounded shadow p-4 text-center" style={{ width: 360, maxWidth: "90%" }}>
        <h5 className="fw-bold mb-3">Tham gia nhom</h5>
        <p className="text-muted mb-3">{message}</p>
        <button className="btn btn-primary" onClick={() => navigate("/", { replace: true })}>
          Ve chat
        </button>
      </div>
    </div>
  );
}
