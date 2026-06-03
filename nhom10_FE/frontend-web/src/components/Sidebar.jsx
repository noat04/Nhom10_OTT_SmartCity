import React, { useEffect, useRef, useState } from "react";
import { FaUserPlus, FaRobot, FaPlus, FaTrash } from "react-icons/fa";
import { searchUsersAPI, sendFriendRequestAPI } from "../api/friendAPI";
import { getAiSessionsAPI, deleteAiSessionAPI } from "../api/aiAPI";
import CreateGroupModal from "./CreateGroupModal";

export default function Sidebar({
  tab,
  contacts = [],
  selected,
  setSelected,
  friendSection,
  setFriendSection,
  hasNewFriendRequest,
  showAddFriendModal,
  setShowAddFriendModal,
  unreadMap,
  reloadTrigger,
  showCreateGroupModal,
  setShowCreateGroupModal,
  loadChats,
}) {
  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef();

  const [aiSessions, setAiSessions] = useState([]);
  const myId = localStorage.getItem("userId");

  // Combobox lọc loại hội thoại: "all" | "private" | "group"
  const [chatFilter, setChatFilter] = useState("all");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!menuRef.current?.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (tab === "ai") loadAiSessions();
  }, [tab, reloadTrigger]);

  const loadAiSessions = async () => {
    const res = await getAiSessionsAPI();
    if (res?.success) setAiSessions(res.data || []);
  };

  const handleDeleteAiSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này?")) return;
    const res = await deleteAiSessionAPI(sessionId);
    if (res?.success) {
      setAiSessions((prev) => prev.filter((s) => s._id !== sessionId));
      if (selected?._id === sessionId) setSelected(null);
    } else {
      alert("Xóa thất bại!");
    }
  };

  const handleNewAiChat = () => {
    setSelected({
      isAI: true,
      name: "Cuộc trò chuyện mới",
      _id: "new_ai_chat_" + Date.now(),
      isNew: true,
    });
  };

  // ✅ FIX: filter theo search + loại + sort theo thời gian tin nhắn cuối cùng
  const filteredContacts = Array.isArray(contacts)
    ? contacts
      .filter((chat) => {
        const matchSearch = (chat.name || "").toLowerCase().includes(search.toLowerCase());
        const matchType =
          chatFilter === "all" ||
          (chatFilter === "group" && chat.type === "group") ||
          (chatFilter === "private" && chat.type !== "group");
        return matchSearch && matchType;
      })
      .sort((a, b) => {
        // Lấy mốc thời gian đáng tin nhất: tin nhắn cuối → updatedAt → createdAt
        const getTime = (chat) => {
          const msgTime =
            chat.latestMessage?.createdAt ||
            chat.lastMessage?.createdAt ||
            null;
          return new Date(msgTime || chat.updatedAt || chat.createdAt || 0).getTime();
        };
        return getTime(b) - getTime(a);
      })
    : [];

  const filteredAiSessions = aiSessions.filter((session) =>
    (session.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSearchByEmail = async () => {
    if (!searchEmail.trim()) { setError("Vui lòng nhập email"); return; }
    setLoadingSearch(true); setError(""); setSearchResult([]);
    const res = await searchUsersAPI(searchEmail.trim());
    if (!res?.success) {
      setError(res?.message || "Không tìm thấy người dùng");
      setLoadingSearch(false); return;
    }
    setSearchResult(Array.isArray(res.data) ? res.data : []);
    setLoadingSearch(false);
  };

  const handleSendFriendRequest = async (receiverId) => {
    setSendingRequest(true); setError("");
    const res = await sendFriendRequestAPI(receiverId);
    if (!res?.success) {
      setError(res?.message || "Gửi lời mời thất bại");
      setSendingRequest(false); return;
    }
    setSearchResult((prev) =>
      prev.map((u) =>
        u._id === receiverId ? { ...u, friendshipStatus: "pending", isSender: true } : u
      )
    );
    setSendingRequest(false);
  };

  const formatLastMessagePreview = (chat) => {
    const msg = chat?.latestMessage;
    if (!msg) return "Chua co tin nhan";

    const senderId =
      typeof msg.senderId === "object"
        ? msg.senderId?._id || msg.senderId?.id
        : msg.senderId;
    const isMine = String(senderId) === String(myId);
    const senderName =
      typeof msg.senderId === "object"
        ? msg.senderId?.fullName || msg.senderId?.username || ""
        : "";
    const prefix = isMine ? "Ban: " : chat.type === "group" && senderName ? `${senderName}: ` : "";

    if (msg.isUnsent) return `${prefix}Tin nhan da thu hoi`;
    if (msg.type === "image") return `${prefix}Da gui anh`;
    if (msg.type === "video") return `${prefix}Da gui video`;
    if (msg.type === "file") return `${prefix}Da gui file`;
    if (msg.type === "call") return `${prefix}Cuoc goi`;
    return `${prefix}${msg.content || "Tin nhan"}`;
  };

  return (
    <>
      <div
        className="col-3 bg-white p-2"
        style={{
          width: "320px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: "1px solid #eee",
        }}
      >
        <div
          className="d-flex align-items-center px-2 position-relative"
          style={{ border: "1px solid #ddd", borderRadius: "12px", height: "42px" }}
          ref={menuRef}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "chat"
                ? "Tìm cuộc trò chuyện..."
                : tab === "friends"
                  ? "Chọn chức năng bạn bè..."
                  : "Tìm kiếm lịch sử AI..."
            }
            style={{ border: "none", outline: "none", flex: 1 }}
          />

          <span style={{ color: "#ccc", padding: "0 8px" }}>|</span>

          {tab === "ai" ? (
            <div
              onClick={handleNewAiChat}
              style={{
                backgroundColor: "#0284c7", width: "28px", height: "28px",
                borderRadius: "50%", display: "flex", justifyContent: "center",
                alignItems: "center", cursor: "pointer",
              }}
              title="Đoạn chat mới"
            >
              <FaPlus size={14} color="#fff" />
            </div>
          ) : (
            <div
              onClick={() => setShowMenu(!showMenu)}
              style={{
                backgroundColor: "#0d6efd", width: "28px", height: "28px",
                borderRadius: "50%", display: "flex", justifyContent: "center",
                alignItems: "center", cursor: "pointer",
              }}
            >
              <FaUserPlus size={14} color="#fff" />
            </div>
          )}

          {showMenu && tab !== "ai" && (
            <div
              style={{
                position: "absolute", top: "48px", right: "0", width: "180px",
                background: "#fff", borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000, overflow: "hidden",
              }}
            >
              <div
                className="p-2" style={{ cursor: "pointer" }}
                onClick={() => {
                  setShowAddFriendModal(true); setShowMenu(false);
                  setSearchEmail(""); setSearchResult([]); setError("");
                }}
              >
                👤 Thêm bạn
              </div>
              <div
                className="p-2" style={{ cursor: "pointer" }}
                onClick={() => { setShowCreateGroupModal(true); setShowMenu(false); }}
              >
                👥 Tạo nhóm
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 d-flex flex-column" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* ======================= TAB CHAT ======================= */}
          {tab === "chat" && (
            <div className="d-flex flex-column h-100" style={{ minHeight: 0 }}>
              {/* Combobox lọc nhanh */}
              <div className="d-flex gap-2 px-1 mb-2 flex-shrink-0">
                {[
                  { value: "all", label: "Tất cả" },
                  { value: "private", label: "1-1" },
                  { value: "group", label: "Nhóm" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setChatFilter(opt.value)}
                    style={{
                      flex: 1,
                      height: "30px",
                      fontSize: "13px",
                      fontWeight: chatFilter === opt.value ? 600 : 400,
                      borderRadius: "20px",
                      border: chatFilter === opt.value ? "none" : "1px solid #ddd",
                      backgroundColor: chatFilter === opt.value ? "#0d6efd" : "#f5f5f5",
                      color: chatFilter === opt.value ? "#fff" : "#555",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
              {filteredContacts.length === 0 ? (
                <div className="p-3 text-muted text-center">Không có cuộc trò chuyện</div>
              ) : (
                filteredContacts.map((chat, index) => {
                  const isActive =
                    selected?._id === chat._id ||
                    selected?.conversationId === chat.conversationId;

                  const getLastMessageText = (msg) => {
                    if (!msg) return "Chưa có tin nhắn";
                    if (msg.isUnsent) return "Tin nhắn đã thu hồi";
                    if (msg.type === "image") return "📷 Đã gửi ảnh";
                    if (msg.type === "video") return "🎥 Đã gửi video";
                    if (msg.type === "file") return "📎 Đã gửi file";
                    if (msg.type === "call") return "📞 Cuộc gọi";
                    return msg.content || "Tin nhắn";
                  };

                  const lastMessage = formatLastMessagePreview(chat);
                  const avatar =
                    chat.avatar && String(chat.avatar).trim()
                      ? chat.avatar
                      : "https://i.pravatar.cc/50";

                  return (
                    <div
                      key={chat._id || index}
                      className="d-flex align-items-center p-2 border-bottom"
                      style={{
                        cursor: "pointer",
                        backgroundColor: isActive ? "#f1f1f1" : "white",
                        borderRadius: "10px",
                      }}
                      onClick={() => setSelected(chat)}
                    >
                      <img src={avatar} alt="" className="rounded-circle me-2" width="40" height="40" />
                      <div className="flex-grow-1">
                        <div className="fw-bold">
                          {chat.name || "User"}
                          {chat.type === "group" && (
                            <span
                              style={{
                                marginLeft: 6, background: "#0d6efd", color: "#fff",
                                fontSize: 10, padding: "2px 6px", borderRadius: 8,
                              }}
                            >
                              Nhóm
                            </span>
                          )}
                        </div>
                        <small className="text-muted">{lastMessage}</small>
                        {chat.type === "group" && (
                          <div style={{ fontSize: 11, color: "#888" }}>
                            {chat.memberCount || chat.members?.length || 0} thành viên
                          </div>
                        )}
                      </div>
                      {unreadMap?.[chat._id] > 0 && (
                        <span
                          style={{
                            background: "red", color: "#fff", borderRadius: "50%",
                            padding: "2px 6px", fontSize: 12, minWidth: 18, textAlign: "center",
                          }}
                        >
                          {unreadMap[chat._id]}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
              </div>
            </div>
          )}

          {/* ======================= TAB FRIENDS ======================= */}
          {tab === "friends" && (
            <>
              <div
                className="d-flex justify-content-between align-items-center p-2 border-bottom"
                style={{ cursor: "pointer", background: friendSection === "friends" ? "#f1f1f1" : "white", borderRadius: "10px" }}
                onClick={() => setFriendSection("friends")}
              >
                <span className="fw-semibold">Danh sách bạn bè</span>
              </div>
              <div
                className="d-flex justify-content-between align-items-center p-2 border-bottom mt-2"
                style={{ cursor: "pointer", background: friendSection === "requests" ? "#f1f1f1" : "white", borderRadius: "10px" }}
                onClick={() => setFriendSection("requests")}
              >
                <span className="fw-semibold">Lời mời kết bạn</span>
                {hasNewFriendRequest && (
                  <span style={{ width: 10, height: 10, background: "red", borderRadius: "50%", display: "inline-block" }} />
                )}
              </div>
            </>
          )}

          {/* ======================= TAB AI ======================= */}
          {tab === "ai" && (
            <>
              <div className="text-muted small fw-bold mb-2 ps-2">HÔM NAY</div>
              <div
                className="d-flex align-items-center p-2 border-bottom mb-2"
                style={{ cursor: "pointer", backgroundColor: selected?.isNew ? "#e0f2fe" : "white", borderRadius: "10px" }}
                onClick={handleNewAiChat}
              >
                <div
                  className="rounded-circle me-3 d-flex justify-content-center align-items-center"
                  style={{ width: "40px", height: "40px", backgroundColor: "#0284c7" }}
                >
                  <FaPlus size={18} color="#fff" />
                </div>
                <div className="flex-grow-1 fw-bold text-dark">Đoạn chat mới</div>
              </div>

              {aiSessions.length === 0 ? (
                <div className="p-3 text-muted text-center small">Chưa có lịch sử trò chuyện</div>
              ) : (
                filteredAiSessions.map((session) => (
                  <div
                    key={session._id}
                    className="d-flex align-items-center p-2 border-bottom position-relative"
                    style={{
                      cursor: "pointer",
                      backgroundColor: selected?._id === session._id && !selected?.isNew ? "#e0f2fe" : "white",
                      borderRadius: "10px",
                    }}
                    onClick={() =>
                      setSelected({ isAI: true, name: session.title, _id: session._id, isNew: false })
                    }
                  >
                    <div
                      className="rounded-circle me-3 d-flex justify-content-center align-items-center"
                      style={{ width: "40px", height: "40px", backgroundColor: "#64748b" }}
                    >
                      <FaRobot size={18} color="#fff" />
                    </div>
                    <div className="flex-grow-1 pe-4">
                      <div
                        className="fw-bold text-dark"
                        style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px" }}
                      >
                        {session.title || "Cuộc trò chuyện"}
                      </div>
                      <small className="text-muted">Trợ lý dịch vụ công</small>
                    </div>
                    <FaTrash
                      className="position-absolute text-danger"
                      style={{ right: "15px", cursor: "pointer", opacity: 0.7 }}
                      onClick={(e) => handleDeleteAiSession(e, session._id)}
                      title="Xóa đoạn chat"
                    />
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* ======================= MODAL THÊM BẠN ======================= */}
      {showAddFriendModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000,
          }}
        >
          <div className="bg-white rounded p-4 shadow" style={{ width: "420px", maxWidth: "90%" }}>
            <h5 className="mb-3 text-center">Tìm email để thêm bạn</h5>
            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control" placeholder="Nhập email..."
                value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleSearchByEmail} disabled={loadingSearch}>
                {loadingSearch ? "Đang tìm..." : "Tìm"}
              </button>
            </div>
            {error && <div className="text-danger small mb-2">{error}</div>}
            <div style={{ maxHeight: "320px", overflowY: "auto" }}>
              {searchResult.length === 0 && !loadingSearch && searchEmail.trim() && !error && (
                <div className="text-center text-muted">Không tìm thấy người dùng phù hợp</div>
              )}
              {searchResult.map((user) => {
                const avatar =
                  user.avatar && String(user.avatar).trim() ? user.avatar : "https://i.pravatar.cc/80";
                return (
                  <div key={user._id} className="border rounded p-3 mb-3" style={{ background: "#fff" }}>
                    <div className="d-flex align-items-start">
                      <img src={avatar} alt="" className="rounded-circle me-3" width="60" height="60" style={{ objectFit: "cover" }} />
                      <div className="flex-grow-1">
                        <div className="fw-bold fs-6">{user.fullName || "Chưa có tên"}</div>
                        <div className="text-muted small mb-1">Username: {user.username || "Chưa cập nhật"}</div>
                        <div className="text-muted small mb-1">Email: {user.email || "Chưa cập nhật"}</div>
                        <div className="text-muted small mb-1">SĐT: {user.phone || "Chưa cập nhật"}</div>
                        <div className="text-muted small mb-2">Bio: {user.bio || "Chưa có bio"}</div>
                        {user.friendshipStatus === "none" && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleSendFriendRequest(user._id)} disabled={sendingRequest}>
                            {sendingRequest ? "Đang gửi..." : "Gửi lời mời kết bạn"}
                          </button>
                        )}
                        {user.friendshipStatus === "pending" && (
                          <button className="btn btn-secondary btn-sm" disabled>
                            {user.isSender ? "Đã gửi lời mời" : "Đang chờ phản hồi"}
                          </button>
                        )}
                        {user.friendshipStatus === "accepted" && (
                          <button className="btn btn-success btn-sm" disabled>Đã là bạn bè</button>
                        )}
                        {user.friendshipStatus === "rejected" && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleSendFriendRequest(user._id)} disabled={sendingRequest}>
                            Gửi lại lời mời
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-end mt-3">
              <button className="btn btn-secondary" onClick={() => setShowAddFriendModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {showCreateGroupModal && (
        <CreateGroupModal setShowCreateGroupModal={setShowCreateGroupModal} loadChats={loadChats} />
      )}
    </>
  );
}
