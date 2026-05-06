import React, { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import {
  FaReply,
  FaThumbtack,
  FaPen,
  FaTrash,
  FaEllipsisH,
  FaHeart,
  FaShare, // 👉 IMPORT THÊM ICON CHUYỂN TIẾP
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
  forwardMessageAPI, // 👉 IMPORT API CHUYỂN TIẾP
  getConversationsAPI, // 👉 IMPORT API LẤY DANH SÁCH CHAT
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

  // 👉 THÊM STATE QUẢN LÝ CHUYỂN TIẾP
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [conversationsList, setConversationsList] = useState([]);
  const [selectedForwardTargets, setSelectedForwardTargets] = useState([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const myId = localStorage.getItem("userId");

  const emojiMap = {
    like: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢", angry: "😡",
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  // ================= CHUYỂN TIẾP TIN NHẮN (FORWARD) =================
  const handleOpenForwardModal = async (msg) => {
    setMessageToForward(msg);
    setMenuId(null); // Đóng menu popup
    const res = await getConversationsAPI();
    if (res?.success) {
      setConversationsList(res.data);
      setSelectedForwardTargets([]);
      setShowForwardModal(true);
    } else {
      alert("Không thể tải danh sách cuộc trò chuyện để chuyển tiếp.");
    }
  };

  const toggleForwardTarget = (convId) => {
    setSelectedForwardTargets((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    );
  };

  const submitForwardMessage = async () => {
    if (selectedForwardTargets.length === 0) {
      alert("Vui lòng chọn ít nhất 1 người/nhóm để chuyển tiếp!");
      return;
    }
    if (!messageToForward) return;

    setIsForwarding(true);
    try {
      const res = await forwardMessageAPI({
        originalMessageId: messageToForward._id,
        targetConversationIds: selectedForwardTargets,
      });

      if (res?.success) {
        setShowForwardModal(false);
        setMessageToForward(null);
        alert("Đã chuyển tiếp tin nhắn thành công!");
      } else {
        alert(res?.message || "Chuyển tiếp thất bại");
      }
    } catch (error) {
      console.log(error);
      alert("Lỗi khi chuyển tiếp tin nhắn");
    } finally {
      setIsForwarding(false);
    }
  };

  // ================= LOAD MESSAGE =================
  const loadMessages = async (nextCursor = null) => {
    if (!selected?._id) return;
    const el = containerRef.current;
    const prevHeight = el?.scrollHeight || 0;

    const res = await getMessages(selected._id, nextCursor);
    if (res.success) {
      const sorted = [...res.data.messages].sort((a, b) => new Date(a.createdAt || Date.now()) - new Date(b.createdAt || Date.now()));

      if (nextCursor) {
        setMessages((prev) => {
          const map = new Map();
          sorted.forEach((m) => map.set(m._id, m));
          prev.forEach((m) => map.set(m._id, m));
          return Array.from(map.values()).sort((a, b) => new Date(a.createdAt || Date.now()) - new Date(b.createdAt || Date.now()));
        });
        requestAnimationFrame(() => {
          const newHeight = el?.scrollHeight || 0;
          if (el) el.scrollTop = newHeight - prevHeight;
        });
      } else {
        setMessages(sorted);
        requestAnimationFrame(() => { bottomRef.current?.scrollIntoView({ behavior: "auto" }); });
      }
      setCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    }
  };

  // ================= LOAD PIN =================
  const loadPinned = async () => {
    if (!selected?._id) return;
    const res = await getPinnedMessagesAPI(selected._id);
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
    if (typeof setUnreadMap === "function") {
      setUnreadMap((prev) => ({ ...prev, [selected._id]: 0 }));
    }
  }, [selected?._id]);

  useEffect(() => {
    if (currentPinnedIndex >= pinnedMessages.length) setCurrentPinnedIndex(0);
  }, [pinnedMessages]);

  // ================= SEARCH =================
  useEffect(() => {
    if (!selected?._id) return;
    if (!search.trim()) {
      searchResults.length > 0 && setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      const res = await searchMessagesAPI(selected._id, search);
      if (res?.data?.success) setSearchResults(res.data.data || []);
    }, 300);
    return () => clearTimeout(delay);
  }, [search, selected]);

  // ================= SOCKET REALTIME =================
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selected?._id) return;

    const roomId = selected._id;

    const joinRoom = () => {
      socket.emit("joinConversation", roomId);
    };

    joinRoom();
    socket.on("connect", joinRoom);

    const handleReceive = (msg) => {
      const msgConvId = typeof msg.conversationId === "object" ? msg.conversationId._id : msg.conversationId;

      if (String(msgConvId) !== String(roomId)) return;

      if (isAtBottomRef.current) {
        socket.emit("seen", { conversationId: roomId });
      }

      setMessages((prev) => {
        const msgId = msg._id || msg.id;
        if (!msgId) return prev;

        const exists = prev.some((m) => m._id === msgId);
        if (exists) return prev;

        pendingScrollRef.current = isAtBottomRef.current;

        return [...prev, msg].sort(
          (a, b) => new Date(a.createdAt || Date.now()) - new Date(b.createdAt || Date.now())
        );
      });

      if (typeof window.updateLastMessage === "function") {
        window.updateLastMessage(msg);
      }
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
      if (String(conversationId) !== String(roomId) || !user || String(user._id) === String(myId)) return;
      setMessages((prev) => {
        const clone = [...prev];
        for (let i = clone.length - 1; i >= 0; i--) {
          const m = clone[i];
          const sender = typeof m.senderId === "object" ? m.senderId._id : m.senderId;
          if (String(sender) !== String(myId)) continue;

          const exists = (m.deliveredTo || []).some(d => String(d.userId?._id || d.userId) === String(user._id));
          if (exists) break;

          clone[i] = {
            ...m,
            status: "delivered",
            deliveredTo: [...(m.deliveredTo || []), { userId: user, deliveredAt: deliveredAt || new Date() }],
          };
          break;
        }
        return clone;
      });
    };

    const handleEdited = (msg) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === msg._id) return { ...m, ...msg };
          if (m.replyTo?._id === msg._id) {
            return { ...m, replyTo: { ...m.replyTo, content: msg.content, isEdited: true } };
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
            return { ...m, replyTo: { ...m.replyTo, content: "Tin nhắn đã bị thu hồi", isDeleted: true } };
          }
          return m;
        })
      );
    };

    const handleReactionSocket = (msg) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    const handlePinnedSocket = (data) => {
      const pins = data?.pinnedMessages || [];
      setPinnedMessages(normalizePinnedMessages(pins));
      setCurrentPinnedIndex(0);
    };

    socket.on("receive_message", handleReceive);
    socket.on("newMessage", handleReceive);
    socket.on("message_updated", handleEdited);
    socket.on("message_edited", handleEdited);
    socket.on("message_deleted", handleDeleted);
    socket.on("message_reacted", handleReactionSocket);
    socket.on("message_reaction", handleReactionSocket);
    socket.on("message_pinned", handlePinnedSocket);
    socket.on("message_seen", handleSeen);
    socket.on("message_delivered", handleDelivered);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("receive_message", handleReceive);
      socket.off("newMessage", handleReceive);
      socket.off("message_updated", handleEdited);
      socket.off("message_edited", handleEdited);
      socket.off("message_deleted", handleDeleted);
      socket.off("message_reacted", handleReactionSocket);
      socket.off("message_reaction", handleReactionSocket);
      socket.off("message_pinned", handlePinnedSocket);
      socket.off("message_seen", handleSeen);
      socket.off("message_delivered", handleDelivered);
    };
  }, [selected?._id, myId]);

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
    const timer = setTimeout(() => { socket.emit("seen", { conversationId: selected._id }); }, 500);
    return () => clearTimeout(timer);
  }, [selected?._id, messages.length]);


  // ================= UPLOAD FILE =================
  const uploadFile = async (selectedFile) => {
    const presigned = await getPresignedUrl({ fileName: selectedFile.name, fileType: selectedFile.type });
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

    if (editingMessage) {
      const res = await editMessageAPI({
        messageId: editingMessage._id,
        content: message,
      });

      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === editingMessage._id)
              return { ...m, content: message, isEdited: true };

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

    const payload = {
      conversationId: selected._id,
      content: message,
      type,
      fileUrl,
      fileName: file?.name,
      fileSize: file?.size,
      replyTo: replyMessage?._id || null,
    };

    setMessage("");
    setFile(null);
    setReplyMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const res = await sendMessageAPI(payload);
    const socket = getSocket();
    if (socket && res?.success) {
      socket.emit("notify_new_message", {
        conversationId: selected._id,
        messageId: res.data._id,
      });
    }
    if (res?.success) {
      const sentMsg = res.data;
      if (sentMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === sentMsg._id)) return prev;
          return [...prev, sentMsg].sort((a, b) => new Date(a.createdAt || Date.now()) - new Date(b.createdAt || Date.now()));
        });
      }
    }

    isAtBottomRef.current = true;
    pendingScrollRef.current = true;
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
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    isAtBottomRef.current = isBottom;

    if (el.scrollTop <= 0 && hasMore && !loadingMore) {
      handleLoadMore();
    }
  };

  // ================= REACTION =================
  const handleReaction = async (m, type) => {
    const res = await reactMessageAPI({ messageId: m._id, type, reactionType: type });
    if (res?.success) {
      setMessages((prev) => prev.map((msg) => (msg._id === m._id ? res.data || msg : msg)));
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
        if (msg._id === m._id) return { ...msg, content: "Tin nhắn đã bị thu hồi", isDeleted: true };
        if (msg.replyTo?._id === m._id) return { ...msg, replyTo: { ...msg.replyTo, content: "Tin nhắn đã bị thu hồi", isDeleted: true } };
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
      <div style={{ position: "absolute", bottom: "-28px", right: isMine ? "10px" : "auto", left: isMine ? "auto" : "10px", background: "#fff", borderRadius: 20, padding: "2px 8px", display: "flex", gap: 6, fontSize: 12, boxShadow: "0 2px 6px rgba(0,0,0,0.2)", zIndex: 5 }}>
        {Object.entries(grouped).map(([type, count]) => (
          <span key={type}>{emojiMap[type]} {count}</span>
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
        <div style={{ position: "absolute", bottom: "-16px", right: isMine ? "10px" : "auto", left: isMine ? "auto" : "10px", background: "#fff", borderRadius: "50%", padding: 4, boxShadow: "0 2px 6px rgba(0,0,0,0.2)", cursor: "pointer", zIndex: 5 }} onMouseEnter={() => setReactionHoverId(m._id)} onMouseLeave={() => setReactionHoverId(null)}>
          <FaHeart size={13} color={grouped.like ? "#ff4d4f" : "#999"} />
        </div>
        {reactionHoverId === m._id && (
          <div style={{ position: "absolute", bottom: "4px", right: isMine ? "0" : "auto", left: isMine ? "auto" : "0", background: "#fff", borderRadius: 30, padding: "8px 14px", display: "flex", gap: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 9999 }} onMouseEnter={() => setReactionHoverId(m._id)} onMouseLeave={() => setReactionHoverId(null)}>
            {["like", "love", "haha", "wow", "sad", "angry"].map((type) => (
              <span key={type} style={{ fontSize: 21, cursor: "pointer" }} onClick={() => handleReaction(m, type)}>{emojiMap[type]}</span>
            ))}
          </div>
        )}
      </>
    );
  };

  // ================= RENDER MESSAGE =================
  const renderMessage = (m, index) => {
    const senderId = typeof m.senderId === "object" ? m.senderId._id : m.senderId;

    // ===== SYSTEM GROUP EVENT =====
    if (m.type === "system" || m.messageType === "group_event" || !m.senderId) {
      return (
        <div key={m._id || index} className="text-center my-3" style={{ fontSize: 13, color: "#666", fontStyle: "italic" }}>
          {m.content}
        </div>
      );
    }

    const isMine = String(senderId) === String(myId);
    const bubbleRadius = isMine ? "18px 18px 0px 18px" : "18px 18px 18px 0px";
    const bubbleBg = isMine ? "#e5efff" : "#ffffff";

    const seenUsers = (m.seenBy || []).filter((s) => String(s.userId?._id || s.userId) !== String(myId)).map((s) => s.userId?.fullName || "Thành viên");
    const deliveredUsers = (m.deliveredTo || []).filter((d) => String(d.userId?._id || d.userId) !== String(myId)).map((d) => d.userId?.fullName || "Thành viên");

    return (
      <div id={m._id} key={m._id || index} className={`d-flex mb-4 ${isMine ? "justify-content-end" : "justify-content-start"}`} onMouseEnter={() => setHoverId(m._id)} onMouseLeave={() => setHoverId(null)}>
        {/* BUBBLE */}
        <div className="shadow-sm position-relative" style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: bubbleRadius, backgroundColor: highlightId === m._id ? "#ffe58f" : bubbleBg, color: "#000", border: "1px solid #e1e4ea" }}>

          {/* NAME GROUP */}
          {!isMine && (
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0068ff", marginBottom: 4 }}>
              {m.senderId?.fullName || "Thành viên"}
            </div>
          )}

          {/* REPLY */}
          {m.replyTo && (
            <div style={{ background: "#f1f3f5", borderLeft: "3px solid #0068ff", padding: "6px 8px", borderRadius: "6px", marginBottom: "6px", fontSize: "12px", cursor: "pointer" }}
              onClick={() => {
                setTimeout(() => {
                  const el = document.getElementById(m.replyTo._id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    setHighlightId(m.replyTo._id);
                    setTimeout(() => setHighlightId(null), 2000);
                  }
                }, 100);
              }}
            >
              <b style={{ color: "#0068ff" }}>{m.replyTo?.senderId?.fullName || "Người dùng"}</b>
              <div style={{ marginTop: 2, color: "#555" }}>
                {m.replyTo?.isDeleted ? <i>Tin nhắn đã bị thu hồi</i> : m.replyTo?.type === "image" ? "📷 Hình ảnh" : m.replyTo?.type === "video" ? "🎥 Video" : m.replyTo?.type === "file" ? "📎 File" : m.replyTo?.content}
              </div>
            </div>
          )}

          {/* CONTENT */}
          {m.isDeleted ? (
            <i style={{ color: "#999" }}>Tin nhắn đã bị thu hồi</i>
          ) : (
            <>
              {m.type === "text" && <div style={{ wordBreak: "break-word", fontSize: "15px" }}>{m.content}</div>}
              {m.type === "image" && <img src={m.fileUrl} alt="" style={{ maxWidth: "100%", borderRadius: "8px", marginTop: "5px" }} />}
              {m.type === "video" && <video controls style={{ maxWidth: "100%", borderRadius: 8 }}><source src={m.fileUrl} /></video>}
              {m.type === "file" && <a href={m.fileUrl} target="_blank" rel="noreferrer">📄 {m.fileName}</a>}
            </>
          )}

          {m.isEdited && <span style={{ fontSize: 10, color: "#888" }}> (đã sửa)</span>}

          {renderQuickReaction(m, isMine)}
          {renderReactionBadge(m, isMine)}

          {/* MENU 3 CHẤM */}
          {hoverId === m._id && (
            <div style={{ position: "absolute", top: 0, right: isMine ? "100%" : "-20px", cursor: "pointer", fontSize: 22, color: "#666" }} onClick={() => setMenuId(menuId === m._id ? null : m._id)}>
              <FaEllipsisH />
            </div>
          )}

          {/* POPUP MENU */}
          {menuId === m._id && (
            <div className="shadow-sm border" style={{ position: "absolute", top: "10px", right: isMine ? "100%" : "auto", left: isMine ? "auto" : "100%", marginRight: isMine ? "10px" : "0", marginLeft: !isMine ? "10px" : "0", background: "#ffffff", borderRadius: "8px", minWidth: "170px", zIndex: 100, padding: "6px 0", fontSize: "14px" }}>
              <div className="d-flex align-items-center px-3 py-2" style={{ cursor: "pointer" }} onClick={() => { setReplyMessage(m); setMenuId(null); }}>
                <span className="me-3"><FaReply /></span> Trả lời
              </div>

              {/* 👉 NÚT CHUYỂN TIẾP TIN NHẮN TẠI ĐÂY */}
              <div className="d-flex align-items-center px-3 py-2 hover-bg" style={{ cursor: "pointer", transition: "0.2s" }} onClick={() => handleOpenForwardModal(m)}>
                <span className="me-3 text-secondary"><FaShare /></span> Chuyển tiếp
              </div>

              <div className="d-flex align-items-center px-3 py-2" style={{ cursor: "pointer" }} onClick={() => { pinnedMessages.some((p) => p.message?._id === m._id) ? handleUnpin(m) : handlePin(m); setMenuId(null); }}>
                <span className="me-3"><FaThumbtack /></span> {pinnedMessages.some((p) => p.message?._id === m._id) ? "Bỏ ghim" : "Ghim"}
              </div>
              {isMine && (
                <div className="d-flex align-items-center px-3 py-2" style={{ cursor: "pointer" }} onClick={() => { setEditingMessage(m); setMessage(m.content); setMenuId(null); }}>
                  <span className="me-3"><FaPen /></span> Sửa tin nhắn
                </div>
              )}
              {isMine && (
                <div className="d-flex align-items-center px-3 py-2 text-danger" style={{ cursor: "pointer" }} onClick={() => { handleDelete(m); setMenuId(null); }}>
                  <span className="me-3"><FaTrash /></span> Thu hồi
                </div>
              )}
            </div>
          )}

          {/* TIME */}
          <div className="d-flex justify-content-end align-items-center mt-1" style={{ fontSize: "11px", color: "#999", gap: 6 }}>
            <span>{formatTime(m.createdAt)}</span>
            {isMine && (
              <>
                {seenUsers.length > 0 ? (
                  <div className="d-flex align-items-center">
                    {(m.seenBy || []).filter((s) => String(s.userId?._id || s.userId) !== String(myId)).slice(0, 5).map((s, idx) => (
                      <img key={idx} src={s.userId?.avatar || "https://i.pravatar.cc/30"} alt="" title={s.userId?.fullName} style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", marginLeft: idx === 0 ? 0 : -5, border: "1px solid #fff" }} />
                    ))}
                    {(m.seenBy || []).length - 1 > 5 && <span style={{ marginLeft: 4 }}>+{(m.seenBy || []).length - 1 - 5}</span>}
                  </div>
                ) : deliveredUsers.length > 0 ? <span style={{ color: "#0068ff" }}>✓✓</span> : <span style={{ color: "#999" }}>✓</span>}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="col-9 d-flex flex-column h-100 border-start border-end p-0 position-relative">
      {/* HEADER */}
      <div className="p-3 border-bottom bg-white d-flex justify-content-between align-items-center shadow-sm">
        <div>
          <h5 className="m-0 fw-bold">{selected?.name || "Nhóm chat"}</h5>
          <small style={{ color: "#666" }}>{selected?.members?.length || 0} thành viên</small>
        </div>
        <div className="d-flex gap-2">
          <input className="form-control" style={{ width: 250 }} placeholder="Tìm tin nhắn..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-outline-primary" onClick={() => setShowGroupInfo(true)}>Thông tin nhóm</button>
        </div>
      </div>

      {/* SEARCH RESULT */}
      {searchResults.length > 0 && (
        <div style={{ borderBottom: "1px solid #eee", background: "#fff" }}>
          {searchResults.map((m) => (
            <div key={m._id} style={{ padding: 8, cursor: "pointer", borderBottom: "1px solid #f2f2f2" }} onClick={() => {
              const el = document.getElementById(m._id);
              if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setHighlightId(m._id); setTimeout(() => setHighlightId(null), 2000); }
            }}>
              {m.content || "File/Hình ảnh"}
            </div>
          ))}
        </div>
      )}

      {/* PINNED MESSAGES */}
      {pinnedMessages.length > 0 && (() => {
        const activePin = pinnedMessages[currentPinnedIndex];
        const activeMsg = activePin?.message || activePin;
        return (
          <div style={{ background: "#f8edc0", borderBottom: "1px solid #eadb9b", padding: "8px 14px", fontSize: 14, cursor: "pointer" }} onClick={() => {
            const el = document.getElementById(activeMsg?._id);
            if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setHighlightId(activeMsg?._id); setTimeout(() => setHighlightId(null), 2000); }
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <b>📌 Tin đã ghim ({pinnedMessages.length})</b>
              <div className="d-flex gap-3">
                <span style={{ color: "#0068ff", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setShowPinnedList(!showPinnedList); }}>Xem</span>
                <span style={{ color: "red" }} onClick={async (e) => { e.stopPropagation(); await handleUnpin(activeMsg); }}>Bỏ ghim</span>
              </div>
            </div>
            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#333" }}>
              {activeMsg?.isDeleted ? "Tin nhắn đã thu hồi" : activeMsg?.type === "image" ? "📷 Hình ảnh" : activeMsg?.type === "video" ? "🎥 Video" : activeMsg?.type === "file" ? "📎 File" : activeMsg?.content}
            </div>
          </div>
        );
      })()}

      {showPinnedList && pinnedMessages.length > 0 && (
        <div style={{ background: "#fffdf2", borderBottom: "1px solid #eadb9b" }}>
          {pinnedMessages.map((pin, index) => {
            const msg = pin.message;
            return (
              <div key={msg?._id || index} style={{ padding: "10px 14px", borderBottom: "1px solid #f1e7b8", cursor: "pointer", fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => {
                const el = document.getElementById(msg?._id);
                if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setHighlightId(msg._id); setTimeout(() => setHighlightId(null), 2000); }
                setCurrentPinnedIndex(index); setShowPinnedList(false);
              }}>
                <div style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: 10 }}>
                  {msg?.isDeleted ? "Tin nhắn đã thu hồi" : msg?.type === "image" ? "📷 Hình ảnh" : msg?.type === "video" ? "🎥 Video" : msg?.type === "file" ? "📎 File" : msg?.content}
                </div>
                <span style={{ color: "red", fontSize: 13, cursor: "pointer" }} onClick={async (e) => { e.stopPropagation(); await handleUnpin(msg); }}>Bỏ ghim</span>
              </div>
            );
          })}
        </div>
      )}

      {/* BODY */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-grow-1 p-3" style={{ overflowY: "auto", background: "#f5f7fb" }}>
        {loadingMore && <div className="text-center mb-3 text-muted">Đang tải thêm...</div>}
        {messages.map((m, i) => renderMessage(m, i))}
        <div ref={bottomRef}></div>
      </div>

      {/* REPLY BAR */}
      {replyMessage && (
        <div className="px-3 py-2 border-top bg-light">
          Đang trả lời: <b>{replyMessage.type === "text" ? replyMessage.content : replyMessage.type === "image" ? "📷 Hình ảnh" : replyMessage.type === "video" ? "🎥 Video" : "📎 File"}</b>
          <span style={{ cursor: "pointer", marginLeft: 10 }} onClick={() => setReplyMessage(null)}>✖</span>
        </div>
      )}

      {/* FILE PREVIEW */}
      {file && <div className="px-3 py-2 border-top bg-white">Đã chọn file: <b>{file.name}</b></div>}

      {/* INPUT */}
      <div className="p-2 border-top d-flex align-items-center gap-2 bg-white">
        <button className="btn btn-light" onClick={() => fileInputRef.current.click()}>+</button>
        <input type="file" hidden ref={fileInputRef} onChange={(e) => setFile(e.target.files[0])} />
        <input className="form-control" placeholder={editingMessage ? "Sửa tin nhắn..." : "Nhập tin nhắn..."} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
        <button className="btn btn-light" onClick={() => setShowEmoji(!showEmoji)}>😊</button>
        <button className="btn btn-primary" onClick={sendMessage}>Gửi</button>
      </div>

      {/* EMOJI */}
      {showEmoji && <div style={{ position: "absolute", bottom: 72, right: 40, zIndex: 9999 }}><EmojiPicker onEmojiClick={handleEmojiClick} /></div>}

      {/* GROUP INFO */}
      <GroupInfoModal show={showGroupInfo} conversationId={selected?._id} onClose={() => setShowGroupInfo(false)} loadChats={loadChats} />

      {/* 👉 MODAL CHUYỂN TIẾP TIN NHẮN */}
      {showForwardModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 99999,
          }}
        >
          <div
            className="bg-white rounded shadow p-4 flex-column d-flex"
            style={{ width: "450px", maxWidth: "95%", height: "60vh" }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold m-0">Chuyển tiếp đến</h5>
              <button
                className="btn-close"
                onClick={() => setShowForwardModal(false)}
              ></button>
            </div>

            {/* Danh sách bạn bè / nhóm chat */}
            <div className="flex-grow-1 overflow-auto" style={{ borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}>
              {conversationsList.length === 0 ? (
                <div className="text-center text-muted p-4">Không có cuộc trò chuyện nào</div>
              ) : (
                conversationsList.map((item) => {
                  const isSelected = selectedForwardTargets.includes(item._id);
                  const targetName = item.name;
                  const avatar = item.avatar || "https://i.pravatar.cc/100";

                  return (
                    <div
                      key={item._id}
                      className="d-flex align-items-center p-2 border-bottom"
                      style={{ cursor: "pointer", backgroundColor: isSelected ? "#f0f7ff" : "transparent" }}
                      onClick={() => toggleForwardTarget(item._id)}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input me-3"
                        checked={isSelected}
                        readOnly
                        style={{ transform: "scale(1.2)", cursor: "pointer" }}
                      />
                      <img
                        src={avatar}
                        alt={targetName}
                        style={{ width: "45px", height: "45px", borderRadius: "50%", objectFit: "cover" }}
                        className="me-3"
                      />
                      <div>
                        <div className="fw-bold">{targetName}</div>
                        {item.isGroup && <small className="text-muted">Nhóm chat</small>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Modal */}
            <div className="d-flex justify-content-end mt-3 gap-2">
              <button className="btn btn-secondary" onClick={() => setShowForwardModal(false)}>
                Hủy
              </button>
              <button
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={submitForwardMessage}
                disabled={isForwarding || selectedForwardTargets.length === 0}
              >
                {isForwarding ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <FaShare />
                )}
                Gửi {selectedForwardTargets.length > 0 ? `(${selectedForwardTargets.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}