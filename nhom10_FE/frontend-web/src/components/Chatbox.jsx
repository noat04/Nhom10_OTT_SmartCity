import React, { useEffect, useState, useRef } from "react";
import EmojiPicker from "emoji-picker-react";
import { getMessages, sendMessageAPI, getPresignedUrl } from "../api/chatApi";
import { getSocket } from "../socket/socket";

export default function ChatBox({ selected, tab }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const bottomRef = useRef(null);
  const myId = localStorage.getItem("userId");

  // ======================
  // LOAD + SOCKET
  // ======================
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selected?._id) return;

    loadMessages();

    socket.emit("joinConversation", selected._id);

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.emit("leaveConversation", selected._id);
      socket.off("newMessage", handleNewMessage);
    };
  }, [selected]);

  const loadMessages = async () => {
    const res = await getMessages(selected._id);
    if (res.success) {
      setMessages(res.data.messages);
    }
  };

  // ======================
  // AUTO SCROLL
  // ======================
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ======================
  // EMOJI
  // ======================
  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  // ======================
  // UPLOAD FILE
  // ======================
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

  // ======================
  // SEND MESSAGE
  // ======================
  const sendMessage = async () => {
    if (!selected?._id) return;

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
    });

    setMessage("");
    setFile(null);
  };

  // ======================
  // RENDER MESSAGE
  // ======================
  const renderMessage = (m) => {
    const senderId =
      typeof m.senderId === "object"
        ? m.senderId._id
        : m.senderId;

    const isMe = String(senderId) === String(myId);

    return (
      <div
        className={`d-flex mb-2 ${
          isMe ? "justify-content-end" : "justify-content-start"
        }`}
      >
        <div
          style={{
            maxWidth: "65%",
            padding: "10px 14px",
            borderRadius: "20px",
            backgroundColor: isMe ? "#0084ff" : "#fff",
            color: isMe ? "#fff" : "#000",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          }}
        >
          {m.type === "text" && m.content}

          {m.type === "image" && (
            <img
              src={m.fileUrl}
              alt=""
              style={{ maxWidth: "220px", borderRadius: "10px" }}
            />
          )}

          {m.type === "video" && (
            <video controls width="220">
              <source src={m.fileUrl} />
            </video>
          )}

          {m.type === "file" && (
            <a href={m.fileUrl} target="_blank">
              📎 {m.fileName}
            </a>
          )}
        </div>
      </div>
    );
  };

  if (!selected || tab !== "chat") {
    return (
      <div className="col d-flex justify-content-center align-items-center">
        Chọn chat
      </div>
    );
  }

  return (
    <div className="col d-flex flex-column h-100">
      {/* HEADER */}
      <div className="p-3 border-bottom bg-white">
        <b>{selected.name || "Chat"}</b>
      </div>

      {/* MESSAGES */}
      <div className="flex-grow-1 p-3 bg-light overflow-auto">
        {messages.length === 0 ? (
          <div className="text-center text-muted">Chưa có tin nhắn</div>
        ) : (
          messages.map((m, i) => <div key={i}>{renderMessage(m)}</div>)
        )}
        <div ref={bottomRef}></div>
      </div>

      {/* INPUT */}
      <div className="p-3 border-top bg-white position-relative">
        {showEmoji && (
          <div style={{ position: "absolute", bottom: "60px", zIndex: 10 }}>
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        <div className="d-flex gap-2">
          {/* EMOJI */}
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="btn btn-light"
          >
            😊
          </button>

          {/* INPUT */}
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="form-control"
            placeholder="Nhập tin nhắn..."
          />

          {/* FILE */}
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
          />

          {/* SEND */}
          <button onClick={sendMessage} className="btn btn-primary">
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}