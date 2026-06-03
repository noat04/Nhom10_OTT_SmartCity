import React, { useEffect, useState } from "react";
import { getFriendsAPI } from "../../api/friendAPI";
import { createGroupAPI } from "../../api/chatApi";

export default function CreateGroupModal({
  setShowCreateGroupModal,
  loadChats,
}) {
  const [friends, setFriends] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);

    const res = await getFriendsAPI();

    if (res?.success) {
      setFriends(Array.isArray(res.data) ? res.data : []);
    } else {
      setFriends([]);
    }

    setLoading(false);
  };

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Vui lòng nhập tên nhóm");
      return;
    }

    if (selectedMembers.length === 0) {
      alert("Phải chọn ít nhất 1 thành viên");
      return;
    }

    setCreating(true);

    const res = await createGroupAPI({
      name: groupName,
      memberIds: selectedMembers,
      avatar: groupAvatar,
    });

    if (!res?.success) {
      alert(res?.message || "Tạo nhóm thất bại");
      setCreating(false);
      return;
    }

    await loadChats();
    setCreating(false);
    setShowCreateGroupModal(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 4000,
      }}
    >
      <div
        className="bg-white rounded shadow p-4"
        style={{
          width: "500px",
          maxWidth: "92%",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <h4 className="text-center mb-3">Tạo nhóm chat</h4>

        <div className="mb-3">
          <label className="form-label fw-semibold">Tên nhóm</label>
          <input
            className="form-control"
            placeholder="Nhập tên nhóm..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Avatar nhóm (URL)</label>
          <input
            className="form-control"
            placeholder="Dán link ảnh nhóm (không bắt buộc)"
            value={groupAvatar}
            onChange={(e) => setGroupAvatar(e.target.value)}
          />
        </div>

        <div className="mb-2 fw-semibold">Chọn thành viên</div>

        {loading ? (
          <div className="text-center text-muted py-3">Đang tải bạn bè...</div>
        ) : friends.length === 0 ? (
          <div className="text-center text-muted py-3">
            Bạn chưa có bạn bè nào để tạo nhóm
          </div>
        ) : (
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {friends.map((friend) => {
              const user = friend.friendInfo || friend.user || friend;

              const avatar =
                user.avatar && String(user.avatar).trim()
                  ? user.avatar
                  : "https://i.pravatar.cc/60";

              const checked = selectedMembers.includes(user._id);

              return (
                <div
                  key={user._id}
                  className="d-flex align-items-center border rounded p-2 mb-2"
                  style={{
                    cursor: "pointer",
                    background: checked ? "#e7f1ff" : "#fff",
                  }}
                  onClick={() => toggleMember(user._id)}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="me-2"
                  />

                  <img
                    src={avatar}
                    alt=""
                    className="rounded-circle me-2"
                    width="42"
                    height="42"
                  />

                  <div>
                    <div className="fw-semibold">
                      {user.fullName || "Chưa có tên"}
                    </div>
                    <small className="text-muted">
                      {user.email || user.username || ""}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button
            className="btn btn-secondary"
            onClick={() => setShowCreateGroupModal(false)}
          >
            Hủy
          </button>

          <button
            className="btn btn-primary"
            onClick={handleCreateGroup}
            disabled={creating}
          >
            {creating ? "Đang tạo..." : "Tạo nhóm"}
          </button>
        </div>
      </div>
    </div>
  );
}