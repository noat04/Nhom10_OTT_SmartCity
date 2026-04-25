import React, { useEffect, useRef, useState } from "react";
import { FaUserPlus } from "react-icons/fa";
import { searchUsersAPI, sendFriendRequestAPI } from "../api/friendAPI";

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
}) {
  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!menuRef.current?.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const filteredContacts = Array.isArray(contacts)
    ? contacts.filter((chat) =>
      (chat.name || "").toLowerCase().includes(search.toLowerCase())
    )
    : [];

  const handleSearchByEmail = async () => {
    if (!searchEmail.trim()) {
      setError("Vui lòng nhập email");
      return;
    }

    setLoadingSearch(true);
    setError("");
    setSearchResult([]);

    const res = await searchUsersAPI(searchEmail.trim());

    if (!res?.success) {
      setError(res?.message || "Không tìm thấy người dùng");
      setLoadingSearch(false);
      return;
    }

    setSearchResult(Array.isArray(res.data) ? res.data : []);
    setLoadingSearch(false);
  };

  const handleSendFriendRequest = async (receiverId) => {
    setSendingRequest(true);
    setError("");

    const res = await sendFriendRequestAPI(receiverId);

    if (!res?.success) {
      setError(res?.message || "Gửi lời mời thất bại");
      setSendingRequest(false);
      return;
    }

    setSearchResult((prev) =>
      prev.map((u) =>
        u._id === receiverId
          ? { ...u, friendshipStatus: "pending", isSender: true }
          : u
      )
    );

    setSendingRequest(false);
  };

  return (
    <>
      <div
        className="col-3 bg-white p-2"
        style={{ width: "320px", overflowY: "auto", borderRight: "1px solid #eee" }}
      >
        <div
          className="d-flex align-items-center px-2 position-relative"
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            height: "42px",
          }}
          ref={menuRef}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "chat"
                ? "Tìm cuộc trò chuyện..."
                : "Chọn chức năng bạn bè..."
            }
            style={{ border: "none", outline: "none", flex: 1 }}
          />

          <span style={{ color: "#ccc", padding: "0 8px" }}>|</span>

          <div
            onClick={() => setShowMenu(!showMenu)}
            style={{
              backgroundColor: "#0d6efd",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <FaUserPlus size={14} color="#fff" />
          </div>

          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: "48px",
                right: "0",
                width: "180px",
                background: "#fff",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 1000,
                overflow: "hidden",
              }}
            >
              <div
                className="p-2"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setShowAddFriendModal(true);
                  setShowMenu(false);
                  setSearchEmail("");
                  setSearchResult([]);
                  setError("");
                }}
              >
                👤 Thêm bạn
              </div>

              <div
                className="p-2"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setShowMenu(false);
                  alert("Chức năng tạo nhóm sẽ làm tiếp");
                }}
              >
                👥 Tạo nhóm
              </div>
            </div>
          )}
        </div>

        <div className="mt-3">
          {tab === "chat" &&
            (filteredContacts.length === 0 ? (
              <div className="p-3 text-muted text-center">
                Không có cuộc trò chuyện
              </div>
            ) : (
              filteredContacts.map((chat, index) => {
                const isActive =
                  selected?._id === chat._id ||
                  selected?.conversationId === chat.conversationId;

                const getLastMessageText = (msg) => {
                  if (!msg) return "Chưa có tin nhắn";

                  if (msg.type === "image") return "📷 Đã gửi ảnh";
                  if (msg.type === "video") return "🎥 Đã gửi video";
                  if (msg.type === "file") return "📎 Đã gửi file";
                  if (msg.type === "call") return "📞 Cuộc gọi";

                  return msg.content || "Tin nhắn";
                };

                const lastMessage = getLastMessageText(
                  chat.latestMessage || chat.lastMessage
                );

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
                    <img
                      src={avatar}
                      alt=""
                      className="rounded-circle me-2"
                      width="40"
                      height="40"
                    />

                    <div className="flex-grow-1">
                      <div className="fw-bold">{chat.name || "User"}</div>
                      <small className="text-muted">{lastMessage}</small>
                    </div>

                    {/* 🔴 BADGE TIN NHẮN MỚI */}
                    {unreadMap?.[chat._id] > 0 && (
                      <span
                        style={{
                          background: "red",
                          color: "#fff",
                          borderRadius: "50%",
                          padding: "2px 6px",
                          fontSize: 12,
                          minWidth: 18,
                          textAlign: "center"
                        }}
                      >
                        {unreadMap[chat._id]}
                      </span>
                    )}
                  </div>
                );
              })
            ))}

          {tab === "friends" && (
            <>
              <div
                className="d-flex justify-content-between align-items-center p-2 border-bottom"
                style={{
                  cursor: "pointer",
                  background: friendSection === "friends" ? "#f1f1f1" : "white",
                  borderRadius: "10px",
                }}
                onClick={() => setFriendSection("friends")}
              >
                <span className="fw-semibold">Danh sách bạn bè</span>
              </div>

              <div
                className="d-flex justify-content-between align-items-center p-2 border-bottom mt-2"
                style={{
                  cursor: "pointer",
                  background: friendSection === "requests" ? "#f1f1f1" : "white",
                  borderRadius: "10px",
                }}
                onClick={() => setFriendSection("requests")}
              >
                <span className="fw-semibold">Lời mời kết bạn</span>

                {hasNewFriendRequest && (
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      background: "red",
                      borderRadius: "50%",
                      display: "inline-block",
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showAddFriendModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 3000,
          }}
        >
          <div
            className="bg-white rounded p-4 shadow"
            style={{ width: "420px", maxWidth: "90%" }}
          >
            <h5 className="mb-3 text-center">Tìm email để thêm bạn</h5>

            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control"
                placeholder="Nhập email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={handleSearchByEmail}
                disabled={loadingSearch}
              >
                {loadingSearch ? "Đang tìm..." : "Tìm"}
              </button>
            </div>

            {error && <div className="text-danger small mb-2">{error}</div>}

            <div style={{ maxHeight: "320px", overflowY: "auto" }}>
              {searchResult.length === 0 &&
                !loadingSearch &&
                searchEmail.trim() &&
                !error && (
                  <div className="text-center text-muted">
                    Không tìm thấy người dùng phù hợp
                  </div>
                )}

              {searchResult.length > 0 &&
                searchResult.map((user) => {
                  const avatar =
                    user.avatar && String(user.avatar).trim()
                      ? user.avatar
                      : "https://i.pravatar.cc/80";

                  return (
                    <div
                      key={user._id}
                      className="border rounded p-3 mb-3"
                      style={{ background: "#fff" }}
                    >
                      <div className="d-flex align-items-start">
                        <img
                          src={avatar}
                          alt=""
                          className="rounded-circle me-3"
                          width="60"
                          height="60"
                          style={{ objectFit: "cover" }}
                        />

                        <div className="flex-grow-1">
                          <div className="fw-bold fs-6">
                            {user.fullName || "Chưa có tên"}
                          </div>

                          <div className="text-muted small mb-1">
                            Username: {user.username || "Chưa cập nhật"}
                          </div>

                          <div className="text-muted small mb-1">
                            Email: {user.email || "Chưa cập nhật"}
                          </div>

                          <div className="text-muted small mb-1">
                            SĐT: {user.phone || "Chưa cập nhật"}
                          </div>

                          <div className="text-muted small mb-2">
                            Bio: {user.bio || "Chưa có bio"}
                          </div>

                          {user.friendshipStatus === "none" && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSendFriendRequest(user._id)}
                              disabled={sendingRequest}
                            >
                              {sendingRequest
                                ? "Đang gửi..."
                                : "Gửi lời mời kết bạn"}
                            </button>
                          )}

                          {user.friendshipStatus === "pending" && (
                            <button className="btn btn-secondary btn-sm" disabled>
                              {user.isSender
                                ? "Đã gửi lời mời"
                                : "Đang chờ phản hồi"}
                            </button>
                          )}

                          {user.friendshipStatus === "accepted" && (
                            <button className="btn btn-success btn-sm" disabled>
                              Đã là bạn bè
                            </button>
                          )}

                          {user.friendshipStatus === "rejected" && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSendFriendRequest(user._id)}
                              disabled={sendingRequest}
                            >
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
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddFriendModal(false)}
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