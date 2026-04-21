import React, { useEffect, useState, useRef } from "react";
import EmojiPicker from "emoji-picker-react";
import {
  getMessages,
  sendMessageAPI,
  getPresignedUrl,
  editMessageAPI,
  deleteMessageAPI,
  reactMessageAPI,
} from "../api/chatApi";
import { getSocket } from "../socket/socket";

export default function ChatBox({ selected, tab }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyMessage, setReplyMessage] = useState(null);
  const [hoverId, setHoverId] = useState(null);

  // 🔥 NEW
  const [editingMessage, setEditingMessage] = useState(null);
  const [menuId, setMenuId] = useState(null);

  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  const myId = localStorage.getItem("userId");

  // ================= SOCKET =================
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selected?._id) return;

    loadMessages();
    socket.emit("joinConversation", selected._id);

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleSeen = ({ conversationId, userId }) => {
      // chỉ xử lý đúng room
      if (String(conversationId) !== String(selected?._id)) return;

      // chỉ khi người khác seen tin của mình
      if (String(userId) === String(myId)) return;

      setMessages((prev) =>
        prev.map((msg) => {
          const senderId =
            typeof msg.senderId === "object"
              ? msg.senderId._id
              : msg.senderId;

          // chỉ tin nhắn mình gửi mới được seen
          if (String(senderId) === String(myId)) {
            return { ...msg, status: "seen" };
          }

          return msg;
        })
      );
    };

    const handleEdited = (msg) => {
      setMessages((prev) =>
        prev.map((m) => {
          // update message chính
          if (m._id === msg._id) {
            return {
              ...m,
              ...msg,
            };
          }

          // 🔥 FIX CHUẨN: giữ lại cấu trúc replyTo
          if (m.replyTo?._id === msg._id) {
            return {
              ...m,
              replyTo: {
                ...m.replyTo,   // giữ senderId, fullName
                content: msg.content,
                isEdited: msg.isEdited,
              },
            };
          }

          return m;
        })
      );
    };

    const handleDeleted = (msg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? msg : m))
      );
    };


    socket.on("newMessage", handleNewMessage);
    socket.on("message_seen", handleSeen);
    socket.on("message_edited", handleEdited);
    socket.on("message_deleted", handleDeleted);
    
    socket.on("message_reaction", (msg) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msg._id ? msg : m
        )
      );
    });

    return () => {
      socket.emit("leaveConversation", selected._id);
      socket.off("newMessage", handleNewMessage);
      socket.off("message_seen", handleSeen);
      socket.off("message_edited", handleEdited);
      socket.off("message_deleted", handleDeleted);
    };
  }, [selected]);

  // ================= LOAD =================
  const loadMessages = async () => {
    const res = await getMessages(selected._id);
    if (res.success) setMessages(res.data.messages);
  };

  const emitSeen = () => {
    const socket = getSocket();

    // ❗ CHẶN
    if (!socket || !selected?._id || !myId) return;

    socket.emit("seen", {
      conversationId: selected._id
    });
  };

  // ================= FILE =================
  const uploadFile = async (file) => {
    const res = await getPresignedUrl({
      fileName: file.name,
      fileType: file.type,
    });

    if (!res.success) return null;

    const { presignedUrl, fileUrl } = res.data;

    await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    return fileUrl;
  };

  // ================= SEND =================
  const sendMessage = async () => {
    if (!selected?._id) return;

    // 🔥 EDIT MODE
    if (editingMessage) {
      const res = await editMessageAPI({
        messageId: editingMessage._id,
        content: message,
      });

      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => {
            // 🔥 update chính message bị sửa
            if (m._id === editingMessage._id) {
              return {
                ...m,
                content: message,
                isEdited: true,
              };
            }

            // 🔥 update message đang reply tới nó
            if (m.replyTo?._id === editingMessage._id) {
              return {
                ...m,
                replyTo: {
                  ...m.replyTo,
                  content: message,
                  isEdited: true,
                },
              };
            }

            return m;
          })
        );
      }

      setEditingMessage(null);
      setMessage("");
      return;
    }

    let fileUrl = null;
    let type = "text";

    if (file) {
      fileUrl = await uploadFile(file);
      if (file.type.startsWith("image")) type = "image";
      else if (file.type.startsWith("video")) type = "video";
      else type = "file";
    }

    await sendMessageAPI({
      conversationId: selected._id,
      content: message,
      type,
      fileUrl,
      fileName: file?.name,
      fileSize: file?.size,
      replyTo: replyMessage?._id,
    });

    setMessage("");
    setFile(null);
    setReplyMessage(null);

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDelete = async (msg) => {
    const res = await deleteMessageAPI({ messageId: msg._id });

    if (res.success) {
      setMessages((prev) =>
        prev.map((m) => {
          // 🔥 message bị xóa
          if (m._id === msg._id) {
            return {
              ...m,
              content: "Tin nhắn đã bị xóa",
              isDeleted: true,
            };
          }

          // 🔥 message đang reply tới nó
          if (m.replyTo?._id === msg._id) {
            return {
              ...m,
              replyTo: {
                ...m.replyTo,
                content: "Tin nhắn đã bị xóa",
                isDeleted: true,
              },
            };
          }

          return m;
        })
      );
    }
  };

  const handleReaction = async (msg, type) => {
    const res = await reactMessageAPI({
      messageId: msg._id,
      type,
    });

    if (res.success) {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msg._id ? res.data : m
        )
      );
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  // ================= RENDER =================
  const renderMessage = (m, i) => {
    const senderId =
      typeof m.senderId === "object" ? m.senderId._id : m.senderId;

    const isMe = String(senderId) === String(myId);
    const isLast = i === messages.length - 1;

    return (
      <div
        key={m._id || i}
        className={`d-flex mb-3 ${
          isMe ? "justify-content-end" : "justify-content-start"
        }`}
        onMouseEnter={() => setHoverId(m._id)}
        onMouseLeave={() => setHoverId(null)}
      >
        <div style={{ maxWidth: "65%", position: "relative" }}>
          {/* MESSAGE */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: isMe
                ? "16px 16px 4px 16px"
                : "16px 16px 16px 4px",
              background: isMe ? "#e5efff" : "#f1f1f1",
              color: "#000",
            }}
          >
            {/* REPLY BOX */}
            {m.replyTo && (
              <div
                style={{
                  background: "rgba(0,0,0,0.05)",
                  borderLeft: "3px solid #3b82f6",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  marginBottom: "6px",
                  fontSize: "12px",
                }}
              >
                <b>{m.replyTo?.senderId?.fullName}</b>
                <div>
                  {m.replyTo?.isDeleted ? (
                    <i style={{ color: "#999" }}>Tin nhắn đã bị xóa</i>
                  ) : (
                    m.replyTo?.content
                  )}
                </div>
              </div>
            )}

   
            {m.isDeleted ? (
              <i style={{ color: "#999" }}>Tin nhắn đã bị xóa</i>
            ) : (
              m.content
            )}

            {m.isEdited && (
              <span style={{ fontSize: 10 }}> (đã sửa)</span>
            )}
          </div>

          {/* ICON ... */}
          {hoverId === m._id && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: isMe ? "100%" : "-20px",
                cursor: "pointer",
              }}
              onClick={() =>
                setMenuId(menuId === m._id ? null : m._id)
              }
            >
              ⋯
            </div>
          )}

          {/* MENU */}
          {menuId === m._id && (
            <div
              style={{
                position: "absolute",
                top: "25px",
                right: isMe ? "100%" : "-120px",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "6px",
                zIndex: 10,
              }}
            >
              <div
                style={{ padding: "6px", cursor: "pointer" }}
                onClick={() => {
                  setReplyMessage(m);
                  setMenuId(null);
                }}
              >
                Trả lời
              </div>

              {isMe && (
                <>
                  <div
                    style={{ padding: "6px", cursor: "pointer" }}
                    onClick={() => {
                      setEditingMessage(m);
                      setMessage(m.content);
                      setMenuId(null);
                    }}
                  >
                    Sửa
                  </div>

                  <div
                    style={{ padding: "6px", color: "red", cursor: "pointer" }}
                    onClick={() => {
                      handleDelete(m);
                      setMenuId(null);
                    }}
                  >
                    Xóa
                  </div>
                </>
              )}
            </div>
          )}

          {isMe && isLast && (
            <div style={{ fontSize: 11, color: "#888" }}>
              {m.status === "seen" ? "Đã xem" : "Đã gửi"}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!selected || tab !== "chat") return <div>Chọn chat</div>;

  return (
    <div className="col d-flex flex-column h-100">
      <div style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>
        {selected.name}
      </div>

      <div
        ref={containerRef}
        className="flex-grow-1 overflow-auto"
        style={{ background: "#f0f2f5", padding: "16px" }}
        onClick={emitSeen}
        onScroll={emitSeen}
      >
        {messages.map(renderMessage)}
        <div ref={bottomRef}></div>
      </div>

      {/* REPLY PREVIEW */}
      {replyMessage && (
        <div style={{ padding: "6px", background: "#eee" }}>
          ↩ {replyMessage.senderId?.fullName}: {replyMessage.content}
        </div>
      )}

      <div style={{ padding: "10px", background: "#fff" }}>
        <div
          style={{
            display: "flex",
            gap: "8px",
            background: "#f1f1f1",
            padding: "6px 10px",
            borderRadius: "25px",
          }}
        >
          <button onClick={() => setShowEmoji(!showEmoji)}>😊</button>

          <input
            value={message}
            onFocus={emitSeen}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            style={{ flex: 1, border: "none", outline: "none" }}
          />

          <input type="file" onChange={(e) => setFile(e.target.files[0])} />

          <button onClick={sendMessage}>➤</button>
        </div>

        {showEmoji && (
          <EmojiPicker
            onEmojiClick={(e) => setMessage(message + e.emoji)}
          />
        )}
      </div>
    </div>
  );
}