import React, { useState, useRef, useEffect } from "react";
import { FaUserPlus } from "react-icons/fa";

export default function Sidebar({
  tab,
  contacts = [],
  selected,
  setSelected,
}) {
  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  // 🔥 NEW STATE
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState("");
  const [inputValue, setInputValue] = useState("");

  const menuRef = useRef();

  // 🔥 click ngoài để đóng menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!menuRef.current?.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // 🔥 auto clear error
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  if (tab !== "chat") {
    return (
      <div className="col-3 d-flex justify-content-center align-items-center text-muted">
        Chọn chức năng
      </div>
    );
  }

  const filteredContacts = contacts.filter((chat) =>
    (chat.name || "").toLowerCase().includes(search.toLowerCase())
  );

  // ================= ACTION =================
  const handleAddFriend = () => {
    if (!inputValue) {
      setError("Vui lòng nhập email hoặc username");
      return;
    }

    // 👉 gọi API ở đây
    console.log("Add friend:", inputValue);

    setShowModal("");
    setInputValue("");
  };

  const handleCreateGroup = () => {
    if (!inputValue) {
      setError("Nhập tên nhóm");
      return;
    }

    console.log("Create group:", inputValue);

    setShowModal("");
    setInputValue("");
  };

  return (
    <div
      className="col-3 bg-white p-2"
      style={{ width: "300px", overflowY: "auto" }}
    >
      {/* 🔥 ERROR */}
      {error && (
        <div className="alert alert-danger py-1 text-center mb-2">
          ⚠️ {error}
        </div>
      )}

      {/* SEARCH + ADD */}
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
          placeholder="Tìm cuộc trò chuyện..."
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

        {/* MENU */}
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
            }}
          >
            <div
              className="p-2"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setShowModal("friend");
                setShowMenu(false);
              }}
            >
              👤 Thêm bạn
            </div>

            <div
              className="p-2"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setShowModal("group");
                setShowMenu(false);
              }}
            >
              👥 Tạo nhóm
            </div>
          </div>
        )}
      </div>

      {/* LIST */}
      <div className="mt-2">
        {filteredContacts.length === 0 && (
          <div className="p-3 text-muted text-center">
            Không có cuộc trò chuyện
          </div>
        )}

        {filteredContacts.map((chat, index) => {
          const isActive =
            selected?._id === chat._id ||
            selected?.conversationId === chat.conversationId;

          const lastMessage =
            chat.latestMessage?.content ||
            chat.lastMessage?.content ||
            "Chưa có tin nhắn";

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
                src={chat.avatar || "https://i.pravatar.cc/50"}
                alt=""
                className="rounded-circle me-2"
                width="40"
                height="40"
              />

              <div className="flex-grow-1">
                <div className="fw-bold">{chat.name || "User"}</div>
                <small className="text-muted">{lastMessage}</small>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔥 MODAL */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "#00000055",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div className="bg-white p-3 rounded" style={{ width: "300px" }}>
            <h5 className="mb-2">
              {showModal === "friend" ? "Thêm bạn" : "Tạo nhóm"}
            </h5>

            <input
              className="form-control mb-2"
              placeholder={
                showModal === "friend"
                  ? "Nhập email / username"
                  : "Tên nhóm"
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowModal("")}
              >
                Hủy
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={
                  showModal === "friend"
                    ? handleAddFriend
                    : handleCreateGroup
                }
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}