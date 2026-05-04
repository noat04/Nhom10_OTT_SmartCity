import React, { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import {
  FaReply,
  FaThumbtack,
  FaPen,
  FaTrash,
  FaEllipsisH,
  FaHeart,
} from "react-icons/fa";

import GroupInfoModal from "./GroupInfoModal";

import {
  getMessages,
  sendMessageAPI,
  getPresignedUrl,
  editMessageAPI,
  reactMessageAPI,
  searchMessagesAPI,
  pinMessageAPI,
  getPinnedMessagesAPI,
  unsendMessageAPI,
} from "../api/chatApi";

import { getSocket } from "../socket/socket";

export default function ChatGroupBox({ selected, setUnreadMap, loadChats }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const [hoverId, setHoverId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [reactionHoverId, setReactionHoverId] = useState(null);

  const [replyMessage, setReplyMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [highlightId, setHighlightId] = useState(null);

  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const pendingScrollRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const myId = localStorage.getItem("userId");

  const emojiMap = {
    like: "👍",
    love: "❤️",
    haha: "😂",
    wow: "😮",
    sad: "😢",
    angry: "😡",
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const normalizePinnedMessages = (raw = []) => {
    if (!Array.isArray(raw)) return [];

    const unique = new Map();

    raw.forEach((item) => {
      const realMsg = item?.message;
      const id = realMsg?._id;

      if (id && !unique.has(id)) {
        unique.set(id, item);
      }
    });

    return Array.from(unique.values());
  };
  // ================= LOAD MESSAGE =================
  const loadMessages = async (nextCursor = null) => {
    if (!selected?._id) return;

    const el = containerRef.current;
    const prevHeight = el?.scrollHeight || 0;

    const res = await getMessages(selected._id, nextCursor);

    if (res.success) {
      const sorted = [...res.data.messages].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      if (nextCursor) {
        setMessages((prev) => {
          const map = new Map();
          sorted.forEach((m) => map.set(m._id, m));
          prev.forEach((m) => map.set(m._id, m));

          return Array.from(map.values()).sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
        });

        requestAnimationFrame(() => {
          const newHeight = el?.scrollHeight || 0;
          if (el) el.scrollTop = newHeight - prevHeight;
        });
      } else {
        setMessages(sorted);

        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "auto" });
        });
      }

      setCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    }
  };

  // ================= LOAD PIN =================
  const loadPinned = async () => {
    if (!selected?._id) return;

    const res = await getPinnedMessagesAPI(selected._id);

    console.log("PIN LOAD RESPONSE:", res);

    if (res?.success) {
      const pins = res.data || [];
      setPinnedMessages(normalizePinnedMessages(pins));
    } else {
      setPinnedMessages([]);
    }
  };

  // ================= FIRST LOAD =================
  useEffect(() => {
    if (!selected?._id) return;

    loadMessages();
    loadPinned();
    setCurrentPinnedIndex(0);

    setUnreadMap((prev) => ({
      ...prev,
      [selected._id]: 0,
    }));
  }, [selected?._id]);


  useEffect(() => {
    if (currentPinnedIndex >= pinnedMessages.length) {
      setCurrentPinnedIndex(0);
    }
  }, [pinnedMessages]);

  // ================= SEARCH =================
  useEffect(() => {
    if (!selected?._id) return;

    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      const res = await searchMessagesAPI(selected._id, search);

      if (res?.data?.success) {
        setSearchResults(res.data.data || []);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [search, selected]);

  // ================= SOCKET =================
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selected?._id) return;

    socket.emit("joinConversation", selected._id);

    const handleReceive = (msg) => {
      const msgConvId =
        typeof msg.conversationId === "object"
          ? msg.conversationId._id
          : msg.conversationId;

      if (String(msgConvId) !== String(selected._id)) {
        setUnreadMap((prev) => ({
          ...prev,
          [msgConvId]: (prev[msgConvId] || 0) + 1,
        }));
        return;
      }

      if (isAtBottomRef.current) {
        socket.emit("seen", {
          conversationId: selected._id,
        });
      }


      setMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        if (exists) return prev;

        pendingScrollRef.current = isAtBottomRef.current;

        return [...prev, msg].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });
      // let shouldScroll = false;

      // setMessages((prev) => {
      //   const exists = prev.some((m) => m._id === msg._id);
      //   if (exists) return prev;

      //   shouldScroll = isAtBottomRef.current;

      //   return [...prev, msg].sort(
      //     (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      //   );
      // });

      if (typeof window.updateLastMessage === "function") {
        window.updateLastMessage(msg);
      }

      // if (shouldScroll) {
      //   requestAnimationFrame(() => {
      //     bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      //   });
      // }
    };

    const handleSeen = ({ conversationId, seenMessages }) => {
      if (String(conversationId) !== String(selected._id)) return;

      setMessages((prev) =>
        prev.map((msg) => {
          const updated = seenMessages.find((m) => m._id === msg._id);

          if (!updated) return msg;

          return {
            ...msg,
            ...updated,
            senderId: updated.senderId || msg.senderId,
            replyTo: updated.replyTo || msg.replyTo,
          };
        })
      );
    };

    const handleDelivered = ({ conversationId, user, deliveredAt }) => {
      if (String(conversationId) !== String(selected._id)) return;
      if (!user) return;
      if (String(user._id) === String(myId)) return;

      setMessages((prev) => {
        const clone = [...prev];

        for (let i = clone.length - 1; i >= 0; i--) {
          const m = clone[i];
          const sender =
            typeof m.senderId === "object" ? m.senderId._id : m.senderId;

          if (String(sender) !== String(myId)) continue;

          const exists = (m.deliveredTo || []).some(
            (d) => String(d.userId?._id || d.userId) === String(user._id)
          );

          if (exists) break;

          clone[i] = {
            ...m,
            status: "delivered",
            deliveredTo: [
              ...(m.deliveredTo || []),
              {
                userId: user,
                deliveredAt: deliveredAt || new Date(),
              },
            ],
          };
          break;
        }

        return clone;
      });
    };

    const handleGlobal = (msg) => {
      const msgConvId =
        typeof msg.conversationId === "object"
          ? msg.conversationId._id
          : msg.conversationId;

      if (typeof window.updateLastMessage === "function") {
        window.updateLastMessage(msg);
      }

      if (String(msgConvId) !== String(selected._id)) {
        setUnreadMap((prev) => ({
          ...prev,
          [msgConvId]: (prev[msgConvId] || 0) + 1,
        }));
      }
    };

    const handleEdited = (msg) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === msg._id) return { ...m, ...msg };

          if (m.replyTo?._id === msg._id) {
            return {
              ...m,
              replyTo: {
                ...m.replyTo,
                content: msg.content,
                isEdited: true,
              },
            };
          }

          return m;
        })
      );
    };

    const handleDeleted = (msg) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === msg._id) return msg;

          if (m.replyTo?._id === msg._id) {
            return {
              ...m,
              replyTo: {
                ...m.replyTo,
                content: "Tin nhắn đã bị thu hồi",
                isDeleted: true,
              },
            };
          }

          return m;
        })
      );
    };

    const handleReaction = (msg) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    const handlePinnedSocket = (data) => {
      const pins = data?.pinnedMessages || [];
      setPinnedMessages(normalizePinnedMessages(pins));
      setCurrentPinnedIndex(0);
    };

    socket.on("receive_message", handleReceive);
    socket.on("newMessage", handleReceive);
    socket.on("newMessage_global", handleGlobal);
    socket.on("message_updated", handleEdited);
    socket.on("message_edited", handleEdited);
    socket.on("message_deleted", handleDeleted);
    socket.on("message_reacted", handleReaction);
    socket.on("message_reaction", handleReaction);
    socket.on("message_pinned", handlePinnedSocket);
    socket.on("message_seen", handleSeen);
    socket.on("message_delivered", handleDelivered);

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("newMessage", handleReceive);
      socket.off("newMessage_global", handleGlobal);
      socket.off("message_updated", handleEdited);
      socket.off("message_edited", handleEdited);
      socket.off("message_deleted", handleDeleted);
      socket.off("message_reacted", handleReaction);
      socket.off("message_reaction", handleReaction);
      socket.off("message_pinned", handlePinnedSocket);
      socket.off("message_seen", handleSeen);
      socket.off("message_delivered", handleDelivered);
    };
  }, [selected?._id]);

  useEffect(() => {
    if (pendingScrollRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        pendingScrollRef.current = false;
      });
    }
  }, [messages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selected?._id) return;

    const timer = setTimeout(() => {
      socket.emit("seen", {
        conversationId: selected._id,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [selected?._id, messages.length]);


  // ================= UPLOAD FILE =================
  const uploadFile = async (selectedFile) => {
    const presigned = await getPresignedUrl({
      fileName: selectedFile.name,
      fileType: selectedFile.type,
    });

    if (!presigned.success) return null;

    const uploadUrl = presigned.uploadUrl || presigned.data?.presignedUrl;
    const fileUrl = presigned.fileUrl || presigned.data?.fileUrl;

    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": selectedFile.type },
      body: selectedFile,
    });

    return fileUrl;
  };

  // ================= SEND MESSAGE =================
  const sendMessage = async () => {
    if (!selected?._id) return;
    if (!message.trim() && !file && !editingMessage) return;

    // ===== EDIT MODE =====
    if (editingMessage) {
      const res = await editMessageAPI({
        messageId: editingMessage._id,
        content: message,
      });

      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === editingMessage._id) {
              return {
                ...m,
                content: message,
                isEdited: true,
              };
            }

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

    const res = await sendMessageAPI({
      conversationId: selected._id,
      content: message,
      type,
      fileUrl,
      fileName: file?.name,
      fileSize: file?.size,
      replyTo: replyMessage?._id || null,
    });

    isAtBottomRef.current = true;

    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    setMessage("");
    setFile(null);
    setReplyMessage(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ================= LOAD MORE =================
  const handleLoadMore = async () => {
    if (!hasMore || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    await loadMessages(cursor);

    setLoadingMore(false);
    loadingMoreRef.current = false;
  };

  // ================= SCROLL =================
  const handleScroll = () => {

    const el = containerRef.current;
    if (!el) return;

    const isBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 60;

    isAtBottomRef.current = isBottom;

    if (el.scrollTop <= 0 && hasMore && !loadingMore) {
      handleLoadMore();
    }
  };

  // ================= REACTION =================
  const handleReaction = async (m, type) => {
    const res = await reactMessageAPI({
      messageId: m._id,
      type,
      reactionType: type,
    });

    if (res?.success) {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === m._id ? res.data || msg : msg))
      );
    }

    setReactionHoverId(null);
    setMenuId(null);
  };

  // ================= PIN =================
  const handlePin = async (m) => {
    const res = await pinMessageAPI(selected._id, m._id);

    if (res?.data?.success) {
      const pins = res.data.data?.pinnedMessages || [];
      setPinnedMessages(normalizePinnedMessages(pins));
    } else {
      await loadPinned();
    }

    setCurrentPinnedIndex(0);
    setMenuId(null);
  };

  const handleUnpin = async (m) => {
    const res = await pinMessageAPI(selected._id, m._id);

    if (res?.data?.success) {
      const pins = res.data.data?.pinnedMessages || [];
      setPinnedMessages(normalizePinnedMessages(pins));
    } else {
      await loadPinned();
    }

    setCurrentPinnedIndex(0);
    setMenuId(null);
  };

  // ================= DELETE =================
  const handleDelete = async (m) => {
    await unsendMessageAPI({ messageId: m._id });

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id === m._id) {
          return {
            ...msg,
            content: "Tin nhắn đã bị thu hồi",
            isDeleted: true,
          };
        }

        if (msg.replyTo?._id === m._id) {
          return {
            ...msg,
            replyTo: {
              ...msg.replyTo,
              content: "Tin nhắn đã bị thu hồi",
              isDeleted: true,
            },
          };
        }

        return msg;
      })
    );

    setMenuId(null);
  };

  // ================= EMOJI PICK =================
  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  // ================= REACTION COUNT BADGE =================
  const renderReactionBadge = (m, isMine) => {
    const grouped = (m.reactions || []).reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    if (Object.keys(grouped).length === 0) return null;

    return (
      <div
        style={{
          position: "absolute",
          bottom: "-28px",
          right: isMine ? "10px" : "auto",
          left: isMine ? "auto" : "10px",
          background: "#fff",
          borderRadius: 20,
          padding: "2px 8px",
          display: "flex",
          gap: 6,
          fontSize: 12,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          zIndex: 5,
        }}
      >
        {Object.entries(grouped).map(([type, count]) => (
          <span key={type}>
            {emojiMap[type]} {count}
          </span>
        ))}
      </div>
    );
  };

  // ================= REACTION QUICK BUTTON =================
  const renderQuickReaction = (m, isMine) => {
    const grouped = (m.reactions || []).reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    return (
      <>
        <div
          style={{
            position: "absolute",
            bottom: "-16px",
            right: isMine ? "10px" : "auto",
            left: isMine ? "auto" : "10px",
            background: "#fff",
            borderRadius: "50%",
            padding: 4,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            cursor: "pointer",
            zIndex: 5,
          }}
          onMouseEnter={() => setReactionHoverId(m._id)}
          onMouseLeave={() => setReactionHoverId(null)}
        >
          <FaHeart size={13} color={grouped.like ? "#ff4d4f" : "#999"} />
        </div>

        {reactionHoverId === m._id && (
          <div
            style={{
              position: "absolute",
              bottom: "4px",
              right: isMine ? "0" : "auto",
              left: isMine ? "auto" : "0",
              background: "#fff",
              borderRadius: 30,
              padding: "8px 14px",
              display: "flex",
              gap: 10,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              zIndex: 9999,
            }}
            onMouseEnter={() => setReactionHoverId(m._id)}
            onMouseLeave={() => setReactionHoverId(null)}
          >
            {["like", "love", "haha", "wow", "sad", "angry"].map((type) => (
              <span
                key={type}
                style={{ fontSize: 21, cursor: "pointer" }}
                onClick={() => handleReaction(m, type)}
              >
                {emojiMap[type]}
              </span>
            ))}
          </div>
        )}
      </>
    );
  };

    // ================= RENDER MESSAGE =================
  const renderMessage = (m, index) => {
    const senderId =
      typeof m.senderId === "object" ? m.senderId._id : m.senderId;

    
      // ===== SYSTEM GROUP EVENT =====
    if (m.type === "system" || m.messageType === "group_event" || !m.senderId) {
      return (
        <div
          key={m._id || index}
          className="text-center my-3"
          style={{
            fontSize: 13,
            color: "#666",
            fontStyle: "italic",
          }}
        >
          {m.content}
        </div>
      );
    }

    const isMine = String(senderId) === String(myId);

    const groupedReactions = (m.reactions || []).reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    const bubbleRadius = isMine
      ? "18px 18px 0px 18px"
      : "18px 18px 18px 0px";

    const bubbleBg = isMine ? "#e5efff" : "#ffffff";

    const seenUsers = (m.seenBy || [])
      .filter((s) => String(s.userId?._id || s.userId) !== String(myId))
      .map((s) => s.userId?.fullName || "Thành viên");

    const deliveredUsers = (m.deliveredTo || [])
      .filter((d) => String(d.userId?._id || d.userId) !== String(myId))
      .map((d) => d.userId?.fullName || "Thành viên");
    
    return (
      <div
        id={m._id}
        key={m._id || index}
        className={`d-flex mb-4 ${
          isMine ? "justify-content-end" : "justify-content-start"
        }`}
        onMouseEnter={() => setHoverId(m._id)}
        onMouseLeave={() => setHoverId(null)}
      >

        {/* BUBBLE */}
        <div
          className="shadow-sm position-relative"
          style={{
            maxWidth: "70%",
            padding: "10px 14px",
            borderRadius: bubbleRadius,
            backgroundColor: highlightId === m._id ? "#ffe58f" : bubbleBg,
            color: "#000",
            border: "1px solid #e1e4ea",
          }}
        >
          {/* NAME GROUP */}
          {!isMine && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#0068ff",
                marginBottom: 4,
              }}
            >
              {m.senderId?.fullName || "Thành viên"}
            </div>
          )}

          {/* REPLY */}
          {m.replyTo && (
            <div
              style={{
                background: "#f1f3f5",
                borderLeft: "3px solid #0068ff",
                padding: "6px 8px",
                borderRadius: "6px",
                marginBottom: "6px",
                fontSize: "12px",
                cursor: "pointer",
              }}
              onClick={() => {
                setTimeout(() => {
                  const el = document.getElementById(m.replyTo._id);

                  if (el) {
                    el.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });

                    setHighlightId(m.replyTo._id);
                    setTimeout(() => setHighlightId(null), 2000);
                  }
                }, 100);
              }}
            >
              <b style={{ color: "#0068ff" }}>
                {m.replyTo?.senderId?.fullName || "Người dùng"}
              </b>

              <div style={{ marginTop: 2, color: "#555" }}>
                {m.replyTo?.isDeleted ? (
                  <i>Tin nhắn đã bị thu hồi</i>
                ) : m.replyTo?.type === "image" ? (
                  "📷 Hình ảnh"
                ) : m.replyTo?.type === "video" ? (
                  "🎥 Video"
                ) : m.replyTo?.type === "file" ? (
                  "📎 File"
                ) : (
                  m.replyTo?.content
                )}
              </div>
            </div>
          )}

          {/* CONTENT */}
          {m.isDeleted ? (
            <i style={{ color: "#999" }}>Tin nhắn đã bị thu hồi</i>
          ) : (
            <>
              {m.type === "text" && (
                <div style={{ wordBreak: "break-word", fontSize: "15px" }}>
                  {m.content}
                </div>
              )}

              {m.type === "image" && (
                <img
                  src={m.fileUrl}
                  alt=""
                  style={{
                    maxWidth: "100%",
                    borderRadius: "8px",
                    marginTop: "5px",
                  }}
                />
              )}

              {m.type === "video" && (
                <video controls style={{ maxWidth: "100%", borderRadius: 8 }}>
                  <source src={m.fileUrl} />
                </video>
              )}

              {m.type === "file" && (
                <a href={m.fileUrl} target="_blank" rel="noreferrer">
                  📄 {m.fileName}
                </a>
              )}
            </>
          )}

          {m.isEdited && (
            <span style={{ fontSize: 10, color: "#888" }}> (đã sửa)</span>
          )}

          {/* QUICK REACTION */}
          {renderQuickReaction(m, isMine)}

          {/* REACTION BADGE */}
          {renderReactionBadge(m, isMine)}

          {/* MENU 3 CHẤM */}
          {hoverId === m._id && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: isMine ? "100%" : "-20px",
                cursor: "pointer",
                fontSize: 22,
                color: "#666",
              }}
              onClick={() => setMenuId(menuId === m._id ? null : m._id)}
            >
              <FaEllipsisH />
            </div>
          )}

          {/* POPUP MENU */}
          {menuId === m._id && (
            <div
              className="shadow-sm border"
              style={{
                position: "absolute",
                top: "10px",
                right: isMine ? "100%" : "auto",
                left: isMine ? "auto" : "100%",
                marginRight: isMine ? "10px" : "0",
                marginLeft: !isMine ? "10px" : "0",
                background: "#ffffff",
                borderRadius: "8px",
                minWidth: "170px",
                zIndex: 100,
                padding: "6px 0",
                fontSize: "14px",
              }}
            >
              <div
                className="d-flex align-items-center px-3 py-2"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setReplyMessage(m);
                  setMenuId(null);
                }}
              >
                <span className="me-3"><FaReply /></span>
                Trả lời
              </div>

              <div
                className="d-flex align-items-center px-3 py-2"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  const isPinned = pinnedMessages.some(
                    (p) => p.message?._id === m._id
                  );

                  if (isPinned) handleUnpin(m);
                  else handlePin(m);

                  setMenuId(null);
                }}
              >
                <span className="me-3"><FaThumbtack /></span>
                {pinnedMessages.some((p) => p.message?._id === m._id)
                  ? "Bỏ ghim"
                  : "Ghim"}
              </div>

              {isMine && (
                <div
                  className="d-flex align-items-center px-3 py-2"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setEditingMessage(m);
                    setMessage(m.content);
                    setMenuId(null);
                  }}
                >
                  <span className="me-3"><FaPen /></span>
                  Sửa tin nhắn
                </div>
              )}

              {isMine && (
                <div
                  className="d-flex align-items-center px-3 py-2 text-danger"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    handleDelete(m);
                    setMenuId(null);
                  }}
                >
                  <span className="me-3"><FaTrash /></span>
                  Thu hồi
                </div>
              )}
            </div>
          )}

          {/* TIME */}
          <div
            className="d-flex justify-content-end align-items-center mt-1"
            style={{ fontSize: "11px", color: "#999", gap: 6 }}
          >
            <span>{formatTime(m.createdAt)}</span>

            {isMine && (
              <>
                {seenUsers.length > 0 ? (
                  <div className="d-flex align-items-center">
                    {(m.seenBy || [])
                      .filter(
                        (s) => String(s.userId?._id || s.userId) !== String(myId)
                      )
                      .slice(0, 5)
                      .map((s, idx) => (
                        <img
                          key={idx}
                          src={s.userId?.avatar || "https://i.pravatar.cc/30"}
                          alt=""
                          title={s.userId?.fullName}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            objectFit: "cover",
                            marginLeft: idx === 0 ? 0 : -5,
                            border: "1px solid #fff",
                          }}
                        />
                      ))}

                    {(m.seenBy || []).length - 1 > 5 && (
                      <span style={{ marginLeft: 4 }}>
                        +{(m.seenBy || []).length - 1 - 5}
                      </span>
                    )}
                  </div>
                ) : deliveredUsers.length > 0 ? (
                  <span style={{ color: "#0068ff" }}>✓✓</span>
                ) : (
                  <span style={{ color: "#999" }}>✓</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

    return (
    <div className="col-8 d-flex flex-column h-100 border-start border-end p-0 position-relative">
      {/* HEADER */}
      <div className="p-3 border-bottom bg-white d-flex justify-content-between align-items-center shadow-sm">
        <div>
          <h5 className="m-0 fw-bold">{selected?.name || "Nhóm chat"}</h5>
          <small style={{ color: "#666" }}>
            {selected?.members?.length || 0} thành viên
          </small>
        </div>

        <div className="d-flex gap-2">
          <input
            className="form-control"
            style={{ width: 250 }}
            placeholder="Tìm tin nhắn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            className="btn btn-outline-primary"
            onClick={() => setShowGroupInfo(true)}
          >
            Thông tin nhóm
          </button>
        </div>
      </div>

      {/* SEARCH RESULT */}
      {searchResults.length > 0 && (
        <div
          style={{
            // maxHeight: 140,
            // overflowY: "auto",
            borderBottom: "1px solid #eee",
            background: "#fff",
          }}
        >
          {searchResults.map((m) => (
            <div
              key={m._id}
              style={{
                padding: 8,
                cursor: "pointer",
                borderBottom: "1px solid #f2f2f2",
              }}
              onClick={() => {
                const el = document.getElementById(m._id);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  setHighlightId(m._id);
                  setTimeout(() => setHighlightId(null), 2000);
                }
              }}
            >
              {m.content || "File/Hình ảnh"}
            </div>
          ))}
        </div>
      )}

      {pinnedMessages.length > 0 && (() => {
        const activePin = pinnedMessages[currentPinnedIndex];
        const activeMsg = activePin?.message || activePin;

        return (
          <div
            style={{
              background: "#f8edc0",
              borderBottom: "1px solid #eadb9b",
              padding: "8px 14px",
              fontSize: 14,
              cursor: "pointer",
            }}
            onClick={() => {
              const targetId = activeMsg?._id;
              const el = document.getElementById(targetId);

              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                setHighlightId(targetId);
                setTimeout(() => setHighlightId(null), 2000);
              }
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <b>📌 Tin đã ghim ({pinnedMessages.length})</b>

              <div className="d-flex gap-3">
                <span
                  style={{ color: "#0068ff", cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPinnedList(!showPinnedList);
                  }}
                >
                  Xem
                </span>

                <span
                  style={{ color: "red" }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleUnpin(activeMsg);
                  }}
                >
                  Bỏ ghim
                </span>
              </div>
            </div>

            <div
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "#333",
              }}
            >
              {activeMsg?.isDeleted
                ? "Tin nhắn đã thu hồi"
                : activeMsg?.type === "image"
                ? "📷 Hình ảnh"
                : activeMsg?.type === "video"
                ? "🎥 Video"
                : activeMsg?.type === "file"
                ? "📎 File"
                : activeMsg?.content}
            </div>
          </div>
        );
      })()}

      {showPinnedList && pinnedMessages.length > 0 && (
        <div
          style={{
            background: "#fffdf2",
            borderBottom: "1px solid #eadb9b",
          }}
        >
          {pinnedMessages.map((pin, index) => {
            const msg = pin.message;

            return (
              <div
                key={msg?._id || index}
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid #f1e7b8",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onClick={() => {
                  const el = document.getElementById(msg?._id);

                  if (el) {
                    el.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });

                    setHighlightId(msg._id);
                    setTimeout(() => setHighlightId(null), 2000);
                  }

                  setCurrentPinnedIndex(index);
                  setShowPinnedList(false);
                }}
              >
                <div
                  style={{
                    flex: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginRight: 10,
                  }}
                >
                  {msg?.isDeleted
                    ? "Tin nhắn đã thu hồi"
                    : msg?.type === "image"
                    ? "📷 Hình ảnh"
                    : msg?.type === "video"
                    ? "🎥 Video"
                    : msg?.type === "file"
                    ? "📎 File"
                    : msg?.content}
                </div>

                <span
                  style={{
                    color: "red",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleUnpin(msg);
                  }}
                >
                  Bỏ ghim
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* BODY */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-grow-1 p-3"
        style={{
          overflowY: "auto",
          background: "#f5f7fb",
        }}
      >
        {loadingMore && (
          <div className="text-center mb-3 text-muted">Đang tải thêm...</div>
        )}

        {messages.map((m, i) => renderMessage(m, i))}

        <div ref={bottomRef}></div>
      </div>

      {/* REPLY BAR */}
      {replyMessage && (
        <div className="px-3 py-2 border-top bg-light">
          Đang trả lời:{" "}
          <b>
            {replyMessage.type === "text"
              ? replyMessage.content
              : replyMessage.type === "image"
              ? "📷 Hình ảnh"
              : replyMessage.type === "video"
              ? "🎥 Video"
              : "📎 File"}
          </b>

          <span
            style={{ cursor: "pointer", marginLeft: 10 }}
            onClick={() => setReplyMessage(null)}
          >
            ✖
          </span>
        </div>
      )}

      {/* FILE PREVIEW */}
      {file && (
        <div className="px-3 py-2 border-top bg-white">
          Đã chọn file: <b>{file.name}</b>
        </div>
      )}

      {/* INPUT */}
      <div className="p-2 border-top d-flex align-items-center gap-2 bg-white">
        <button
          className="btn btn-light"
          onClick={() => fileInputRef.current.click()}
        >
          +
        </button>

        <input
          type="file"
          hidden
          ref={fileInputRef}
          onChange={(e) => setFile(e.target.files[0])}
        />

        <input
          className="form-control"
          placeholder={editingMessage ? "Sửa tin nhắn..." : "Nhập tin nhắn..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          className="btn btn-light"
          onClick={() => setShowEmoji(!showEmoji)}
        >
          😊
        </button>

        <button className="btn btn-primary" onClick={sendMessage}>
          Gửi
        </button>
      </div>

      {/* EMOJI */}
      {showEmoji && (
        <div
          style={{
            position: "absolute",
            bottom: 72,
            right: 40,
            zIndex: 9999,
          }}
        >
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* GROUP INFO */}
      <GroupInfoModal
        show={showGroupInfo}
        conversationId={selected?._id}
        onClose={() => setShowGroupInfo(false)}
        loadChats={loadChats}
      />
    </div>
  );
}