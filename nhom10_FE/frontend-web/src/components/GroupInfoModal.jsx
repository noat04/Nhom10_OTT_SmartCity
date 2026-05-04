import React, { useEffect, useState } from "react";
import { getFriendsAPI } from "../api/friendAPI";
import {
  getGroupInfoAPI,
  addMembersAPI,
  removeMemberAPI,
  leaveGroupAPI,
  promoteAdminAPI,
  updateGroupInfoAPI,
} from "../api/chatApi";

export default function GroupInfoModal({
  show,
  onClose,
  conversationId,
  loadChats,
}) {
  const [groupInfo, setGroupInfo] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedAdd, setSelectedAdd] = useState([]);

  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const myId = localStorage.getItem("userId");
  
  useEffect(() => {
    if (!show || !conversationId) return;
    loadGroupInfo();
    loadFriends();
  }, [show, conversationId]);

  if (!show) return null;

  const loadGroupInfo = async () => {
    const res = await getGroupInfoAPI(conversationId);
    if (res?.success) {
      setGroupInfo(res.data);
      setEditName(res.data.name || "");
      setEditAvatar(res.data.avatar || "");
    }
  };

  const loadFriends = async () => {
    const res = await getFriendsAPI();
    if (res?.success) {
      setFriends(Array.isArray(res.data) ? res.data : []);
    }
  };

  const isAdmin = groupInfo?.members?.some(
    (m) => String(m.user?._id) === String(myId) && m.role === "admin"
  );

  const toggleAddMember = (id) => {
    setSelectedAdd((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleUpdateGroup = async () => {
    const res = await updateGroupInfoAPI({
      conversationId,
      name: editName,
      avatar: editAvatar,
    });

    if (res?.success) {
      await loadGroupInfo();
      await loadChats();
      alert("Đã cập nhật thông tin nhóm");
    }
  };

  const handleAddMembers = async () => {
    if (selectedAdd.length === 0) return;

    const res = await addMembersAPI({
      conversationId,
      memberIds: selectedAdd,
    });

    if (res?.success) {
      setSelectedAdd([]);
      await loadGroupInfo();
      await loadChats();
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Xóa thành viên này khỏi nhóm?")) return;

    const res = await removeMemberAPI({
      conversationId,
      memberId,
    });

    if (res?.success) {
      await loadGroupInfo();
      await loadChats();
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Bạn chắc chắn muốn rời nhóm?")) return;

    const res = await leaveGroupAPI({
      conversationId,
    });

    if (res?.success) {
      onClose();
      await loadChats();
    }
  };

  const handlePromoteAdmin = async (targetUserId) => {
    if (!window.confirm("Chuyển quyền admin cho người này?")) return;

    const res = await promoteAdminAPI({
      conversationId,
      targetUserId,
    });

    if (res?.success) {
      await loadGroupInfo();
      await loadChats();
    }
  };

  const friendCandidates = friends.filter((f) => {
    const user = f.friendInfo || f.user || f;

    return !groupInfo?.members?.some(
      (m) => String(m.user?._id) === String(user._id)
    );
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99999,
      }}
    >
      <div
        className="bg-white rounded shadow p-4"
        style={{
          width: "620px",
          maxWidth: "95%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h3 className="text-center fw-bold mb-3">Thông tin nhóm</h3>

        {/* avatar + name */}
        <div className="text-center mb-3">
          <img
            src={editAvatar || "https://i.pravatar.cc/80"}
            alt=""
            width="80"
            height="80"
            className="rounded-circle"
          />
        </div>

        {isAdmin ? (
          <>
            <input
              className="form-control mb-2"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Tên nhóm"
            />

            <input
              className="form-control mb-2"
              value={editAvatar}
              onChange={(e) => setEditAvatar(e.target.value)}
              placeholder="Avatar nhóm URL"
            />

            <button className="btn btn-primary w-100 mb-3" onClick={handleUpdateGroup}>
              Lưu thông tin nhóm
            </button>
          </>
        ) : (
          <div className="text-center fw-bold fs-5 mb-3">{groupInfo?.name}</div>
        )}

        <hr />

        {/* members */}
        <div className="fw-bold mb-2">
          Thành viên nhóm ({groupInfo?.members?.length || 0})
        </div>

        {groupInfo?.members?.map((m) => (
          <div
            key={m.user?._id}
            className="border rounded p-2 mb-2 d-flex justify-content-between align-items-center"
          >
            <div className="d-flex align-items-center">
              <img
                src={m.user?.avatar || "https://i.pravatar.cc/50"}
                alt=""
                width="42"
                height="42"
                className="rounded-circle me-2"
              />
              <div>
                <div className="fw-semibold">
                  {m.user?.fullName}{" "}
                  {m.role === "admin" && (
                    <span className="badge bg-warning text-dark">Admin</span>
                  )}
                </div>
                <small className="text-muted">{m.user?.email}</small>
              </div>
            </div>

            {isAdmin && String(m.user?._id) !== String(myId) && (
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-warning"
                  onClick={() => handlePromoteAdmin(m.user._id)}
                >
                  Chuyển admin
                </button>

                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleRemoveMember(m.user._id)}
                >
                  Xóa
                </button>
              </div>
            )}
          </div>
        ))}

        {/* add member */}
        {isAdmin && (
          <>
            <hr />
            <div className="fw-bold mb-2">Thêm thành viên</div>

            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {friendCandidates.map((f) => {
                const user = f.friendInfo || f.user || f;
                const checked = selectedAdd.includes(user._id);

                return (
                  <div
                    key={user._id}
                    className="border rounded p-2 mb-2 d-flex align-items-center"
                    style={{
                      cursor: "pointer",
                      background: checked ? "#e7f1ff" : "#fff",
                    }}
                    onClick={() => toggleAddMember(user._id)}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="me-2"
                    />
                    <img
                      src={user.avatar || "https://i.pravatar.cc/40"}
                      alt=""
                      width="36"
                      height="36"
                      className="rounded-circle me-2"
                    />
                    <div>
                      <div>{user.fullName}</div>
                      <small className="text-muted">{user.email}</small>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="btn btn-success w-100 mt-2" onClick={handleAddMembers}>
              Thêm vào nhóm
            </button>
          </>
        )}

        <hr />

        <div className="d-flex justify-content-between">
          <button className="btn btn-danger" onClick={handleLeaveGroup}>
            Rời nhóm
          </button>

          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}