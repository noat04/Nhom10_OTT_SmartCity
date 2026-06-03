import React, { useEffect, useState } from "react";
// 👉 Nhớ import thêm getFriendRequestsAPI vào đây
import { getFriendsAPI, sendFriendRequestAPI, getFriendRequestsAPI } from "../../api/friendAPI";
import {
  getGroupInfoAPI,
  addMembersAPI,
  removeMemberAPI,
  leaveGroupAPI,
  dissolveGroupAPI,
  promoteAdminAPI,
  updateGroupInfoAPI,
  getGroupInviteAPI,
} from "../../api/chatApi";
import { onGroupDissolved, offGroupDissolved } from "../../socket/socket";

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

  const [selectedMember, setSelectedMember] = useState(null);
  const [inviteToken, setInviteToken] = useState("");

  // Mảng chứa ID những người đã được mình gửi lời mời kết bạn
  const [sentRequestIds, setSentRequestIds] = useState([]);

  const myId = localStorage.getItem("userId");

  useEffect(() => {
    if (!show || !conversationId) return;
    loadGroupInfo();
    loadFriends();
    loadFriendRequests(); // 👉 BƯỚC 1: Gọi hàm lấy danh sách lời mời ngay khi mở Modal
  }, [show, conversationId]);

  useEffect(() => {
    if (!show || !conversationId) return;

    const handleGroupDissolved = (payload) => {
      const data = payload?.data || payload;
      const eventConversationId = data?.conversationId || data?.group?._id || data?._id;
      if (String(eventConversationId) !== String(conversationId)) return;

      setGroupInfo((prev) => ({
        ...(prev || data?.group || {}),
        ...(data?.group || {}),
        _id: eventConversationId,
        isActive: false,
      }));
      setSelectedAdd([]);
      setInviteToken("");
      setSelectedMember(null);
      loadChats?.();
    };

    onGroupDissolved(handleGroupDissolved);
    return () => offGroupDissolved(handleGroupDissolved);
  }, [show, conversationId]);

  if (!show) return null;

  // ================= CÁC HÀM LOAD DỮ LIỆU =================

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

  //Hàm xử lý lấy danh sách đã gửi kết bạn từ API
  const loadFriendRequests = async () => {
    try {
      const res = await getFriendRequestsAPI();
      console.log("📥 Dữ liệu API Lời mời kết bạn trả về:", res);

      let sentIds = [];

      if (res?.data?.sent && Array.isArray(res.data.sent)) {

        // 👉 CHỈ LẤY NHỮNG LỜI MỜI ĐANG Ở TRẠNG THÁI CHỜ XÁC NHẬN (pending)
        const pendingRequests = res.data.sent.filter(req => req.status === 'pending');

        sentIds = pendingRequests.map(req => {
          const receiver = req.friendId || req.receiverId || req.receiver || req.toUser;
          return String(typeof receiver === 'object' && receiver !== null ? (receiver._id || receiver.id) : receiver);
        });
      }

      console.log("🎯 Các ID đang chờ xác nhận (pending):", sentIds);

      // Cập nhật vào state
      setSentRequestIds(sentIds);

    } catch (error) {
      console.log("❌ Lỗi khi load danh sách kết bạn", error);
    }
  };

  // ================= CÁC HÀM XỬ LÝ LOGIC =================

  const isAdmin = groupInfo?.members?.some(
    (m) => String(m.user?._id) === String(myId) && m.role === "admin"
  );
  const isGroupDissolved = groupInfo?.isActive === false;
  const inviteUrl = inviteToken ? `${window.location.origin}/join-group/${inviteToken}` : "";

  const checkIsFriend = (userId) => {
    return friends.some((f) => {
      const fUser = f.friendInfo || f.user || f;
      return String(fUser._id) === String(userId);
    });
  };

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

  const handleLoadInvite = async () => {
    const res = await getGroupInviteAPI(conversationId);
    if (res?.success) {
      setInviteToken(res.data?.token || "");
    } else {
      alert(res?.message || "Khong the tao link moi nhom");
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

  const handleDissolveGroup = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Ban chac chan muon giai tan nhom nay? Tat ca thanh vien se khong the nhan tin tiep.")) return;

    const res = await dissolveGroupAPI({ conversationId });

    if (res?.success) {
      setGroupInfo((prev) => ({
        ...(prev || {}),
        ...(res.data || {}),
        isActive: false,
      }));
      setSelectedAdd([]);
      setInviteToken("");
      setSelectedMember(null);
      await loadChats();
    } else {
      alert(res?.message || "Khong the giai tan nhom");
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

  const handleAddFriend = async (targetUserId) => {
    try {
      const rawId = typeof targetUserId === 'object' ? (targetUserId._id || targetUserId.id) : targetUserId;
      const safeId = String(rawId);

      const res = await sendFriendRequestAPI(safeId);

      if (res?.success) {
        setSentRequestIds((prev) => [...prev, safeId]);
      } else {
        if (res?.message?.toLowerCase().includes("đã gửi")) {
          setSentRequestIds((prev) => [...prev, safeId]);
        } else {
          alert(res?.message || "Lỗi khi gửi kết bạn");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const friendCandidates = friends.filter((f) => {
    const user = f.friendInfo || f.user || f;
    return !groupInfo?.members?.some(
      (m) => String(m.user?._id) === String(user._id)
    );
  });

  // ================= GIAO DIỆN (UI) =================

  return (
    <>
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

          <div className="text-center mb-3">
            <img
              src={editAvatar || groupInfo?.avatar || "https://i.pravatar.cc/80"}
              alt=""
              width="80"
              height="80"
              className="rounded-circle"
              style={{ objectFit: "cover" }}
            />
          </div>

          {isGroupDissolved ? (
            <div className="text-center">
              <div className="fw-bold fs-5 mb-2">{groupInfo?.name}</div>
              <div className="alert alert-warning py-2 mb-0">
                Nhom da giai tan
              </div>
            </div>
          ) : isAdmin ? (
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

          {!isGroupDissolved && (
            <>
          <hr />

          <div className="fw-bold mb-2">
            Thành viên nhóm ({groupInfo?.members?.length || 0})
          </div>

          {groupInfo?.members?.map((m) => {
            const isMe = String(m.user?._id) === String(myId);
            const isFriend = checkIsFriend(m.user?._id);
            const unavailable = Boolean(m.user?.isDeleted || m.user?.isLocked);
            // 👉 BƯỚC 3: Dùng mảng sentRequestIds (đã lấy từ API) để quyết định UI
            const isSentRequest = sentRequestIds.includes(String(m.user?._id));

            return (
              <div
                key={m.user?._id}
                className="border rounded p-2 mb-2 d-flex justify-content-between align-items-center"
              >
                <div
                  className="d-flex align-items-center"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedMember(m.user)}
                  title="Xem thông tin"
                >
                  <img
                    src={m.user?.avatar || "https://i.pravatar.cc/50"}
                    alt=""
                    width="42"
                    height="42"
                    className="rounded-circle me-2"
                    style={{ objectFit: "cover" }}
                  />
                  <div>
                    <div className="fw-semibold">
                      {m.user?.fullName || "Thanh vien"} {isMe && "(Ban)"}
                      {m.role === "admin" && (
                        <span className="badge bg-warning text-dark ms-2">Admin</span>
                      )}
                      {unavailable && (
                        <span className="badge bg-secondary ms-2">Tai khoan bi khoa</span>
                      )}
                    </div>
                    <small className="text-muted">{unavailable ? "" : m.user?.email}</small>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  {!unavailable && !isMe && !isFriend && (
                    isSentRequest ? (
                      <button className="btn btn-sm btn-secondary" disabled>
                        Đã gửi lời mời
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleAddFriend(m.user._id)}
                      >
                        Kết bạn
                      </button>
                    )
                  )}

                  {isAdmin && !isMe && !unavailable && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            );
          })}

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
                        style={{ objectFit: "cover" }}
                      />
                      <div>
                        <div>{user.fullName}</div>
                        <small className="text-muted">{user.email}</small>
                      </div>
                    </div>
                  );
                })}
                {friendCandidates.length === 0 && (
                  <div className="text-muted text-center py-2">
                    Không có bạn bè nào phù hợp để thêm.
                  </div>
                )}
              </div>

              <button className="btn btn-success w-100 mt-2" onClick={handleAddMembers}>
                Thêm vào nhóm
              </button>
              <div className="border rounded p-3 mt-3">
                <div className="fw-bold mb-2">Them thanh vien bang duong link</div>
                {!inviteToken ? (
                  <button className="btn btn-outline-primary w-100" onClick={handleLoadInvite}>
                    Tao link moi nhom
                  </button>
                ) : (
                  <div>
                    <div className="input-group input-group-sm">
                      <input className="form-control" readOnly value={inviteUrl} />
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(inviteUrl)}
                      >
                        Copy
                      </button>
                    </div>
                    <small className="text-muted">Nguoi dung mo link va dang nhap de tham gia nhom.</small>
                  </div>
                )}
              </div>
            </>
          )}
            </>
          )}

          <hr />

          <div className="d-flex justify-content-between align-items-center gap-2">
            <button className="btn btn-danger" onClick={handleLeaveGroup}>
              Rời nhóm
            </button>

            {isAdmin && !isGroupDissolved && (
              <button className="btn btn-outline-danger ms-2" onClick={handleDissolveGroup}>
                Giai tan nhom
              </button>
            )}

            {!isGroupDissolved && (
            <button className="btn btn-secondary" onClick={onClose}>
              Đóng
            </button>
            )}
          </div>
        </div>
      </div>

      {/* 👉 MODAL HIỂN THỊ THÔNG TIN CHI TIẾT THÀNH VIÊN */}
      {selectedMember && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100000,
          }}
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="bg-white rounded shadow p-4 text-center"
            style={{ width: "350px", maxWidth: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedMember.avatar || "https://i.pravatar.cc/150"}
              alt=""
              width="100"
              height="100"
              className="rounded-circle mb-3"
              style={{ objectFit: "cover", border: "2px solid #ddd" }}
            />
            <h4 className="fw-bold mb-1">{selectedMember.fullName}</h4>
            <p className="text-muted mb-2">{selectedMember.email}</p>
            <span className="badge bg-success mb-4">
              {selectedMember.status || "Đang hoạt động"}
            </span>

            <div className="d-flex justify-content-center gap-2 mt-2">
              {!checkIsFriend(selectedMember._id) && String(selectedMember._id) !== String(myId) && (
                sentRequestIds.includes(String(selectedMember._id)) ? (
                  <button className="btn btn-secondary px-4" disabled>
                    Đã gửi lời mời
                  </button>
                ) : (
                  <button
                    className="btn btn-primary px-4"
                    onClick={() => handleAddFriend(selectedMember._id)}
                  >
                    Kết bạn
                  </button>
                )
              )}
              <button
                className="btn btn-outline-secondary px-4"
                onClick={() => setSelectedMember(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



