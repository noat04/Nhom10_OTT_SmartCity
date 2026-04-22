import React, { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import VideoCall from './VideoCall';
import { FaVideo, FaPhoneAlt, FaReply, FaThumbtack, FaPen, FaTrash, FaHeart } from "react-icons/fa";
import {
  getMessages,
  sendMessageAPI,
  getPresignedUrl,
  editMessageAPI,
  deleteMessageAPI,
  reactMessageAPI,
  searchMessagesAPI,
  pinMessageAPI,
  getPinnedMessagesAPI
} from "../api/chatApi";
import {
  getFriendsAPI,
  getFriendRequestsAPI,
  acceptFriendRequestAPI,
  rejectFriendRequestAPI,
} from "../api/friendAPI";
import {
  getSocket,
  onFriendRequestReceived,
  offFriendRequestReceived,
  onFriendRequestAccepted,
  offFriendRequestAccepted,
  onFriendRequestRejected,
  offFriendRequestRejected,
  onFriendRequestSent,
  offFriendRequestSent,
  onNewNotification,
  offNewNotification,
} from "../socket/socket";
import { useAuth } from "../context/AuthContext";

export default function ChatBox({
  selected,
  tab,
  friendSection,
  setHasNewFriendRequest,
  setUnreadMap,
}) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  const [friendActionError, setFriendActionError] = useState("");
  const [friendActionSuccess, setFriendActionSuccess] = useState("");
  const [processingRequestId, setProcessingRequestId] = useState("");

  const bottomRef = useRef(null);
  const myId = localStorage.getItem("userId");
  const conversationId = selected?.conversationId || selected?._id;

  //CALL
  const [incomingCallDataGlobal, setIncomingCallDataGlobal] = useState(null);
  const [activeSocket, setActiveSocket] = useState(null);
  const { user } = useAuth();
  const [isCallUIOpen, setIsCallUIOpen] = useState(false);
  const videoCallRef = useRef(null);

  //ĐẢM 
  const [replyMessage, setReplyMessage] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [highlightId, setHighlightId] = useState(null);
  const [reactionHoverId, setReactionHoverId] = useState(null);
  const containerRef = useRef(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isAtBottomRef = useRef(true);
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const isFirstLoad = useRef(true);
  const [onlineUsers, setOnlineUsers] = useState({});


  const emojiMap = {
    like: "👍",
    love: "❤️",
    haha: "😂",
    wow: "😮",
    sad: "😢",
    angry: "😡"
  };
  const handleReact = async (messageId, type) => {
    try {
      await reactMessageAPI(messageId, type);
    } catch (err) {
      console.error("❌ react lỗi", err);
    }
  };

  //LOGIN CALL (Toàn)
  // ====================================================
  // 1. GLOBAL SOCKET: LUÔN LẮNG NGHE CUỘC GỌI TỚI
  // ====================================================
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      setActiveSocket(socket);
    } else {
      return;
    }

    // Hàm xử lý khi có cuộc gọi đến
    const handleIncomingCall = (data) => {
      console.log("📞 Incoming call:", data);

      const callerId = data?.caller?._id || data?.callerId;

      // 🚫 1. nếu mình là người gọi → bỏ qua
      if (String(callerId) === String(myId)) {
        console.log("🚫 Ignore own call event");
        return;
      }

      // 🚫 2. nếu đang trong call → không override
      if (isCallUIOpen) {
        console.log("⚠️ Already in call → ignore incoming");
        return;
      }

      // 🚫 3. nếu call trùng → bỏ qua
      if (incomingCallDataGlobal?.callId === data.callId) {
        console.log("⚠️ Duplicate call");
        return;
      }

      // ✅ hợp lệ → nhận call
      setIncomingCallDataGlobal(data);
      setIsCallUIOpen(true);
    };
    // Hàm xử lý khi cuộc gọi kết thúc
    const handleCallEnded = (data) => {
      console.log("📴 call ended (ChatBox):", data);
      setIsCallUIOpen(false); // force đóng UI

      setIncomingCallDataGlobal(null); // 🔥 thêm dòng này
    };

    // Đăng ký sự kiện
    socket.on("call_incoming", handleIncomingCall);
    socket.on("call_ended", handleCallEnded);

    return () => {
      socket.off("call_incoming", handleIncomingCall);
      socket.off("call_ended", handleCallEnded);
    };
  }, [isCallUIOpen, incomingCallDataGlobal]); // [] Chạy 1 lần duy nhất, không bị reset khi đổi chat

  // ====================================================
  // 2. LOCAL SOCKET: LẮNG NGHE TIN NHẮN (Khi đổi Chat)
  // ====================================================

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selected?._id || tab !== "chat") return;

    loadMessages();

    const roomId = selected?.conversationId || selected?._id;
    socket.emit("joinConversation", roomId);

    const handleNewMessage = (msg) => {
      const currentConversationId = selected?.conversationId || selected?._id;

      // ❗ nếu KHÔNG phải chat đang mở
      if (String(msg.conversationId) !== String(currentConversationId)) {
        return;
      }

      // 🔥 AUTO SEEN nếu đang ở dưới cùng
      if (isAtBottomRef.current) {
        emitSeen();
      }

      // 👉 nếu đang mở chat thì xử lý như cũ
      let shouldScroll = false;

      setMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        if (exists) return prev;

        shouldScroll = isAtBottomRef.current;

        return [...prev, msg].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });

      if (shouldScroll) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      }
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

      if (String(userId) !== String(myId)) return;

      setUnreadMap(prev => ({
        ...prev,
        [conversationId]: 0
      }));
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

    socket.on("message_pinned", (data) => {
      setPinnedMessages(data.pinnedMessages || []);
    });

    return () => {
      socket.emit(
        "leaveConversation",
        selected?.conversationId || selected?._id
      );
      socket.off("newMessage", handleNewMessage);
      socket.off("message_seen", handleSeen);
      socket.off("message_edited", handleEdited);
      socket.off("message_deleted", handleDeleted);
      socket.off("message_pinned");
    };
  }, [selected, tab]);


  // ================= SEARCH (🔥 MOVE HERE) =================
  useEffect(() => {
    if (!selected?._id) return;

    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      const res = await searchMessagesAPI(selected._id, search);

      if (res.data.success) {
        setSearchResults(res.data.data || []);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [search, selected]);

  // ======================
  // RECONNECT SOCKET
  // ======================
  useEffect(() => {
    if (!activeSocket) return;

    const handleReconnect = () => {
      console.log("🔄 reconnect → join lại conversation");
      if (selected?._id) {
        activeSocket.emit("joinConversation", selected._id);
      }
    };

    activeSocket.on("connect", handleReconnect);
    return () => activeSocket.off("connect", handleReconnect);
  }, [activeSocket, selected]);

  useEffect(() => {
    if (isCallUIOpen && incomingCallDataGlobal && videoCallRef.current) {
      console.log("✅ Inject call vào VideoCall");

      videoCallRef.current.handleIncomingCall(incomingCallDataGlobal);
    }
  }, [isCallUIOpen, incomingCallDataGlobal]);

  // ======================
  // FORMAT TIME
  // ======================
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // LOAD ====================================================

  const loadMessages = async () => {
//    setMessages([]);
    setCursor(null);
    setHasMore(true);

    setTimeout(() => {
      emitSeen();
    }, 200);
    const res = await getMessages(conversationId);

    if (res.success) {
      const sorted = [...res.data.messages].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      setMessages(sorted);

      // 🔥 SCROLL NGAY TẠI ĐÂY (CHUẨN NHẤT)
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });

      setCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) {
      console.log("🚫 Không load nữa", { hasMore, loadingMore });
      return;
    }

    try {
      const el = containerRef.current;
      if (!el) return;

      const prevHeight = el.scrollHeight;

      setLoadingMore(true);

      console.log("🔥 LOAD MORE với cursor:", cursor);

      const res = await getMessages(conversationId, cursor);

      console.log("🔥 RESPONSE:", res.data);

      if (res.success) {
        const sorted = [...res.data.messages].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        setMessages(prev => {
          const map = new Map();

          sorted.forEach(m => map.set(m._id, m));
          prev.forEach(m => map.set(m._id, m));

          return Array.from(map.values()).sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
        });

        if (res.data.nextCursor === cursor) {
          console.log("❌ Cursor không đổi → STOP");
          setHasMore(false);
          return;
        }

        setCursor(res.data.nextCursor);
        setHasMore(res.data.hasMore);

        requestAnimationFrame(() => {
          const newHeight = el.scrollHeight;
          el.scrollTop = newHeight - prevHeight;
        });
      }
    } catch (err) {
      console.error("loadMore lỗi:", err);
    } finally {
      setLoadingMore(false); // 🔥 QUAN TRỌNG
    }
  };

  const handleScroll = () => {
    const el = containerRef.current;

    if (!el) return;

    const isBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 50;

    isAtBottomRef.current = isBottom;

    if (isBottom) {
      emitSeen();
    }

    // 🔥 load thêm khi scroll lên top
    if (el.scrollTop <= 0 && hasMore && !loadingMore) {
      console.log("📥 Trigger loadMore");
      loadMore();
    }
  };

  const loadFriendBoxData = async () => {
    if (tab !== "friends") return;

    if (friendSection === "friends") {
      const res = await getFriendsAPI();
      if (res?.success) {
        setFriends(Array.isArray(res.data) ? res.data : []);
      } else {
        setFriends([]);
      }
    }

    if (friendSection === "requests") {
      const res = await getFriendRequestsAPI();
      if (res?.success) {
        const received = Array.isArray(res.data?.received)
          ? res.data.received
          : [];
        const sent = Array.isArray(res.data?.sent) ? res.data.sent : [];

        setReceivedRequests(received);
        setSentRequests(sent);
      } else {
        setReceivedRequests([]);
        setSentRequests([]);
      }
    }
  };

  useEffect(() => {
    loadFriendBoxData();
  }, [tab, friendSection]);

  useEffect(() => {
    let cleanup = null;
    let retryTimer = null;

    const attachListeners = () => {
      const socket = getSocket();

      if (!socket) {
        retryTimer = setTimeout(attachListeners, 300);
        return;
      }

      const handleFriendRequestReceivedRealtime = async () => {
        console.log("📩 friend_request_received");
        await loadFriendBoxData();

        if (!(tab === "friends" && friendSection === "requests")) {
          setHasNewFriendRequest(true);
        }
      };

      const handleFriendRequestSentRealtime = async () => {
        console.log("📤 friend_request_sent");
        await loadFriendBoxData();
      };

      const handleFriendAcceptedRealtime = async () => {
        console.log("✅ friend_request_accepted");
        await loadFriendBoxData();
      };

      const handleFriendRejectedRealtime = async () => {
        console.log("❌ friend_request_rejected");
        await loadFriendBoxData();
      };

      const handleNotificationRealtime = async () => {
        console.log("🔔 new_notification");
        await loadFriendBoxData();
      };

      onFriendRequestReceived(handleFriendRequestReceivedRealtime);
      onFriendRequestSent(handleFriendRequestSentRealtime);
      onFriendRequestAccepted(handleFriendAcceptedRealtime);
      onFriendRequestRejected(handleFriendRejectedRealtime);
      onNewNotification(handleNotificationRealtime);

      cleanup = () => {
        offFriendRequestReceived(handleFriendRequestReceivedRealtime);
        offFriendRequestSent(handleFriendRequestSentRealtime);
        offFriendRequestAccepted(handleFriendAcceptedRealtime);
        offFriendRequestRejected(handleFriendRejectedRealtime);
        offNewNotification(handleNotificationRealtime);
      };
    };

    attachListeners();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (cleanup) cleanup();
    };
  }, [tab, friendSection, setHasNewFriendRequest]);

  //Load pinned messages khi mở chat
  useEffect(() => {
    if (!selected?._id) return;

    const loadPinned = async () => {
      const res = await getPinnedMessagesAPI(selected._id);

      if (res.data.success) {
        setPinnedMessages(res.data.data || []);
      }
    };

    loadPinned();
  }, [selected?._id]);


  const handleUnpin = async (msg) => {
    try {
      const res = await pinMessageAPI(selected._id, msg._id);

      if (res?.data?.success) {
        setPinnedMessages(res.data.data?.pinnedMessages || []);
      }
    } catch (err) {
      console.error("❌ UNPIN ERROR:", err.response?.data || err.message);
    }
  };

  const emitSeen = () => {
    const socket = getSocket();

    // ❗ CHẶN
    if (!socket || !selected?._id || !myId) return;

    socket.emit("seen", {
      conversationId: selected?.conversationId || selected?._id
    });
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  const uploadFile = async (selectedFile) => {
    const res = await getPresignedUrl({
      fileName: selectedFile.name,
      fileType: selectedFile.type,
    });

    if (!res.success) return null;

    const { presignedUrl, fileUrl } = res.data;

    await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": selectedFile.type },
      body: selectedFile,
    });

    return fileUrl;
  };

  useEffect(() => {
    if (!selected?._id) return;

    setUnreadMap(prev => ({
      ...prev,
      [selected._id]: 0
    }));
  }, [selected]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleGlobalMessage = (msg) => {
      // 🔥 ID của chat đang mở
      const currentConversationId =
        selected?.conversationId || selected?._id;

      const currentId =
        typeof currentConversationId === "object"
          ? currentConversationId._id
          : currentConversationId;

      // 🔥 ID của message nhận được
      const msgConvId =
        typeof msg.conversationId === "object"
          ? msg.conversationId._id
          : msg.conversationId;

      // 🔥 LUÔN update latestMessage (QUAN TRỌNG)
      if (typeof window.updateLastMessage === "function") {
        window.updateLastMessage(msg);
      }

      // 👉 chỉ tăng unread nếu KHÔNG phải chat đang mở
      if (String(msgConvId) !== String(currentId)) {
        setUnreadMap((prev) => ({
          ...prev,
          [msgConvId]: (prev[msgConvId] || 0) + 1
        }));
      }

      // ✅ tăng unread đúng ID
      // setUnreadMap((prev) => ({
      //   ...prev,
      //   [msgConvId]: (prev[msgConvId] || 0) + 1
      // }));
    };

    socket.on("newMessage_global", handleGlobalMessage);

    return () => socket.off("newMessage_global", handleGlobalMessage);
  },  [selected]);

  useEffect(() => {
    if (!selected?._id) return;

    setTimeout(() => {
      emitSeen();
    }, 300);
  }, [selected]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // 🔥 nhận danh sách online ban đầu
    const handleOnlineList = (list) => {
      console.log("🔥 ONLINE LIST RAW:", list);

      const map = {};

      list.forEach((u) => {
        const id =
          typeof u === "string"
            ? u
            : u?.userId || u?._id;

        if (id) {
          map[String(id)] = true;
        }
      });

      console.log("🔥 ONLINE MAP:", JSON.stringify(map, null, 2));

      setOnlineUsers(map);
    };

    // 🔥 khi có user online
    const handleUserOnline = (userId) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: true,
      }));
    };

    // 🔥 khi user offline
    const handleUserOffline = ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: false,
        [`lastSeen_${userId}`]: lastSeen,
      }));
    };

    socket.on("online_list", handleOnlineList);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);

    return () => {
      socket.off("online_list", handleOnlineList);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
    };
  }, []);
  // ================= SEND =================
  // NÂNG CAO: GOM GỌN CHUNG CHO CẢ SEND VÀ EDIT
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

    const res = await sendMessageAPI({
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

  // ================= REACTION =================
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

  // ================= HỖ TRỢ GỬI KHI NHẤN ENTER =================
  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  // ================= DELETE =================
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

  // ================= FRIEND REQUEST ACTIONS =================
  const handleAccept = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      setFriendActionError("");
      setFriendActionSuccess("");

      const res = await acceptFriendRequestAPI(requestId);

      if (!res?.success) {
        setFriendActionError(res?.message || "Không thể chấp nhận lời mời");
        return;
      }

      setFriendActionSuccess(res?.message || "Đã chấp nhận lời mời");
      await loadFriendBoxData();
      setHasNewFriendRequest(false);
    } catch (error) {
      setFriendActionError("Có lỗi xảy ra khi chấp nhận lời mời");
    } finally {
      setProcessingRequestId("");
    }
  };

  const handleReject = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      setFriendActionError("");
      setFriendActionSuccess("");

      const res = await rejectFriendRequestAPI(requestId);

      if (!res?.success) {
        setFriendActionError(res?.message || "Không thể từ chối lời mời");
        return;
      }

      setFriendActionSuccess(res?.message || "Đã từ chối lời mời");
      await loadFriendBoxData();
      setHasNewFriendRequest(false);
    } catch (error) {
      setFriendActionError("Có lỗi xảy ra khi từ chối lời mời");
    } finally {
      setProcessingRequestId("");
    }
  };

  // ================= SEARCH =================
  const handleSearch = async () => {
    const res = await searchMessagesAPI(selected._id, search);

    if (res.data.success) {
      setSearchResults(res.data.data || []);
    }
  };

  // ================= PIN =================
  const handlePin = async (msg) => {
    try {
      const res = await pinMessageAPI(selected._id, msg._id);

      if (res?.data?.success) {
        setPinnedMessages(res.data.data?.pinnedMessages || []);
      }
    } catch (err) {
      console.error("❌ PIN ERROR:", err.response?.data || err.message);
    }
  };

  const renderMessage = (m, index) => {
    const senderId =
      typeof m.senderId === "object" ? m.senderId._id : m.senderId;

    const isMe = String(senderId) === String(myId);
    const isLast = index === messages.length - 1;

    const bubbleRadius = isMe
      ? "18px 18px 0px 18px"
      : "18px 18px 18px 0px";
    const bubbleBg = isMe ? "#e5efff" : "#ffffff";
    const textColor = "#000000";
    const borderColor = isMe ? "transparent" : "#e1e4ea";

    const groupedReactions = (m.reactions || []).reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    return (
      <div
        id={m._id} // 🔥 THÊM DÒNG NÀY
        key={m._id || index}
        className={`d-flex mb-3 ${isMe ? "justify-content-end" : "justify-content-start"
          }`}
        onMouseEnter={() => setHoverId(m._id)}
        onMouseLeave={() => setHoverId(null)}
      >
        {/* AVATAR */}
        {!isMe && (
          <img
            src={
              selected.avatar ||
              `https://ui-avatars.com/api/?name=${selected.name || "U"}`
            }
            alt="avatar"
            className="rounded-circle me-2 align-self-end"
            width="28"
            height="28"
            style={{
              objectFit: "cover",
              marginBottom: "2px",
              border: "1px solid #eee",
            }}
          />
          
        )}

        {/* BUBBLE */}
        <div
          className="shadow-sm position-relative"
          style={{
            maxWidth: "70%",
            padding: "10px 14px",
            borderRadius: bubbleRadius,
            backgroundColor:
              highlightId === m._id
                ? "#ffe58f"   // màu highlight
                : bubbleBg,
            color: textColor,
            border: `1px solid ${borderColor}`,
          }}
        >

          {/* ================= REPLY ================= */}
          {m.replyTo && (
            <div
              style={{
                background: "#f1f3f5",
                borderLeft: "3px solid #0068ff",
                padding: "6px 8px",
                borderRadius: "6px",
                marginBottom: "6px",
                fontSize: "12px",
                cursor: "pointer"
              }}
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
              {/* NAME */}
              <b style={{ color: "#0068ff" }}>
                {m.replyTo?.senderId?.fullName || "Người dùng"}
              </b>

              {/* CONTENT PREVIEW */}
              <div style={{ marginTop: 2, color: "#555" }}>
                {m.replyTo?.isDeleted ? (
                  <i>Tin nhắn đã bị xóa</i>
                ) : m.replyTo?.type === "image" ? (
                  "📷 Hình ảnh"
                ) : m.replyTo?.type === "video" ? (
                  "🎥 Video"
                ) : m.replyTo?.type === "file" ? (
                  "📎 File"
                ) : m.replyTo?.type === "call" ? (
                  "📞 Cuộc gọi"
                ) : (
                  m.replyTo?.content
                )}
              </div>
            </div>
          )}
          {/* ================= CALL ================= */}
          {m.type === "call" && m.callInfo && (
            <div
              className="d-flex align-items-center pe-3"
              style={{ minWidth: "160px", cursor: "pointer", opacity: 0.95 }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = 1)}
              onMouseOut={(e) => (e.currentTarget.style.opacity = 0.95)}
              onClick={() => {
                setIsCallUIOpen(true);
                setTimeout(() => {
                  videoCallRef.current?.startCall(
                    m.callInfo.callType,
                    selected
                  );
                }, 100);
              }}
            >
              <div
                className="rounded-circle d-flex justify-content-center align-items-center me-3 shadow-sm"
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor:
                    m.callInfo.status === "missed" ||
                      m.callInfo.status === "rejected"
                      ? "#ffe5e5"
                      : isMe
                        ? "#cce0ff"
                        : "#e5efff",
                  color:
                    m.callInfo.status === "missed" ||
                      m.callInfo.status === "rejected"
                      ? "#ff4d4f"
                      : "#0068ff",
                }}
              >
                {m.callInfo.callType === "video" ? (
                  <FaVideo size={16} />
                ) : (
                  <FaPhoneAlt size={16} />
                )}
              </div>

              <div>
                <div
                  className="fw-bold mb-1"
                  style={{
                    fontSize: "15px",
                    color:
                      m.callInfo.status === "missed" ||
                        m.callInfo.status === "rejected"
                        ? "#ff4d4f"
                        : "inherit",
                  }}
                >
                  {m.callInfo.status === "missed" ||
                    m.callInfo.status === "rejected"
                    ? isMe
                      ? "Cuộc gọi đi nhỡ"
                      : "Cuộc gọi nhỡ"
                    : isMe
                      ? "Cuộc gọi đi"
                      : "Cuộc gọi đến"}
                </div>

                <div style={{ fontSize: "13px", color: "#666" }}>
                  {m.callInfo.status === "missed" ||
                    m.callInfo.status === "rejected"
                    ? "Bấm để gọi lại"
                    : formatDuration(m.callInfo.duration)}
                </div>
              </div>
            </div>
          )}

          {/* ================= CONTENT ================= */}
          {m.isDeleted ? (
            <i style={{ color: "#999" }}>Tin nhắn đã bị xóa</i>
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
                <video controls style={{ maxWidth: "100%" }}>
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

          {/* EDIT */}
          {m.isEdited && (
            <span style={{ fontSize: 10 }}> (đã sửa)</span>
          )}

          {/* ================= LIKE BUTTON ================= */}
          <div
            style={{
              position: "absolute",
              bottom: "-18px",
              right: isMe ? "10px" : "auto",
              left: isMe ? "auto" : "10px",
              background: "#fff",
              borderRadius: "50%",
              padding: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              cursor: "pointer",
              zIndex: 5
            }}
            onMouseEnter={() => setReactionHoverId(m._id)}
            onMouseLeave={() => setReactionHoverId(null)}
          >
            <FaHeart
              size={14}
              color={groupedReactions.like ? "#ff4d4f" : "#999"} />
          </div>

          {/* ================= REACTIONS HIỂN THỊ ================= */}
          {Object.keys(groupedReactions).length > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: "-30px", // 🔥 sửa ở đây
                right: isMe ? "10px" : "auto",
                left: isMe ? "auto" : "10px",
                background: "#fff",
                borderRadius: 20,
                padding: "2px 8px",
                display: "flex",
                gap: 6,
                fontSize: 12,
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                zIndex: 5
              }}
            >
              {Object.entries(groupedReactions).map(([type, count]) => (
                <span key={type}>
                  {emojiMap[type]} {count}
                </span>
              ))}
            </div>
          )}
          {reactionHoverId === m._id && (
            <div
              style={{
                position: "absolute",
                bottom: "0px",
                right: isMe ? "0" : "auto",
                left: isMe ? "auto" : "0",
                background: "#fff",
                borderRadius: 20,
                padding: "6px 20px",
                display: "flex",
                gap: 10,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                zIndex: 9999
              }}
              onMouseEnter={() => setReactionHoverId(m._id)}
              onMouseLeave={() => setReactionHoverId(null)}
            >
              {["like", "love", "haha", "wow", "sad", "angry"].map((r) => (
                <span
                  key={r}
                  style={{
                    fontSize: 20,
                    cursor: "pointer",
                    transition: "0.2s"
                  }}
                  onClick={() => {
                    handleReaction(m, r);
                    setReactionHoverId(null);
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.3)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {emojiMap[r]}
                </span>
              ))}
            </div>
          )}
          {/* ================= MENU (...) ================= */}
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

          {menuId === m._id && (
            <div
              className="shadow-sm border"
              style={{
                position: "absolute",
                top: "10px", // Đẩy lên một chút cho ôm sát bong bóng chat
                right: isMe ? "100%" : "auto",
                left: isMe ? "auto" : "100%",
                marginRight: isMe ? "10px" : "0",
                marginLeft: !isMe ? "10px" : "0",
                background: "#ffffff",
                borderRadius: "8px",
                minWidth: "160px",
                zIndex: 100,
                padding: "6px 0",
                fontSize: "14px",
                color: "#111"
              }}
            >
              <div
                className="d-flex align-items-center px-3 py-2 hover-bg"
                style={{ cursor: "pointer", transition: "0.2s" }}
                onClick={() => {
                  setReplyMessage(m);
                  setMenuId(null);
                }}
              >
                <span className="me-3 text-secondary"><FaReply size={15} /></span>
                Trả lời
              </div>

              <div
                className="d-flex align-items-center px-3 py-2 hover-bg"
                style={{ cursor: "pointer", transition: "0.2s" }}
                onClick={() => {
                  handlePin(m);
                  setMenuId(null);
                }}
              >
                <span className="me-3 text-secondary"><FaThumbtack size={14} /></span>
                Ghim
              </div>

              {isMe && (
                <>
                  <div
                    className="d-flex align-items-center px-3 py-2 hover-bg"
                    style={{ cursor: "pointer", transition: "0.2s" }}
                    onClick={() => {
                      setEditingMessage(m);
                      setMessage(m.content);
                      setMenuId(null);
                    }}
                  >
                    <span className="me-3 text-secondary"><FaPen size={14} /></span>
                    Sửa tin nhắn
                  </div>

                  {/* ĐƯỜNG KẺ PHÂN CÁCH (Zalo Style) */}
                  <div style={{ height: "1px", backgroundColor: "#f0f0f0", margin: "4px 0" }}></div>

                  <div
                    className="d-flex align-items-center px-3 py-2 text-danger hover-bg-danger"
                    style={{ cursor: "pointer", transition: "0.2s" }}
                    // Nếu bạn dùng hover-bg cũ, có thể thêm onMouseOver đổi màu nền đỏ nhạt cho đẹp
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#ffe5e5"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    onClick={() => {
                      handleDelete(m);
                      setMenuId(null);
                    }}
                  >
                    <span className="me-3"><FaTrash size={14} /></span>
                    Xóa
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================= TIME ================= */}
          <div
            className="text-end mt-1"
            style={{ fontSize: "11px", color: "#999" }}
          >
            {formatTime(m.createdAt)}
          </div>

          {/* ================= SEEN ================= */}
          {isMe && (
            <div style={{ fontSize: 11, color: "#888" }}>
              {m.status === "seen" ? "Đã xem" : "Đã gửi"}
            </div>
          )}
        </div>
      </div>
    );
  };
  if (tab === "friends" && friendSection === "friends") {
    return (
      <div className="col d-flex flex-column h-100 bg-white">
        <div className="p-3 border-bottom bg-white">
          <b>Danh sách bạn bè</b>
        </div>

        <div className="flex-grow-1 p-3 overflow-auto">
          {friends.length === 0 ? (
            <div className="text-center text-muted">Bạn hiện chưa có bạn bè</div>
          ) : (
            friends.map((friend) => {
              const avatar =
                friend.avatar && String(friend.avatar).trim()
                  ? friend.avatar
                  : "https://i.pravatar.cc/50";

              return (
                <div
                  key={friend._id}
                  className="d-flex align-items-center p-2 border rounded mb-2"
                >
                  <img
                    src={avatar}
                    alt=""
                    className="rounded-circle me-2"
                    width="45"
                    height="45"
                  />
                  <div>
                    <div className="fw-bold">
                      {friend.fullName || friend.username || "User"}
                    </div>
                    <small className="text-muted">{friend.email}</small>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (tab === "friends" && friendSection === "requests") {
    return (
      <div className="col d-flex flex-column h-100 bg-white">
        <div className="p-3 border-bottom bg-white">
          <b>Lời mời kết bạn</b>
        </div>

        <div className="flex-grow-1 p-3 overflow-auto">
          {friendActionError && (
            <div className="alert alert-danger py-2">{friendActionError}</div>
          )}

          {friendActionSuccess && (
            <div className="alert alert-success py-2">{friendActionSuccess}</div>
          )}

          <div className="mb-4">
            <h6 className="fw-bold text-primary">Lời mời đã nhận</h6>

            {receivedRequests.length === 0 ? (
              <div className="text-muted">Hiện không có lời mời nào cho bạn</div>
            ) : (
              receivedRequests.map((item) => {
                const avatar =
                  item.userId?.avatar && String(item.userId.avatar).trim()
                    ? item.userId.avatar
                    : "https://i.pravatar.cc/50";

                return (
                  <div
                    key={item._id}
                    className="d-flex justify-content-between align-items-center p-2 border rounded mb-2"
                  >
                    <div className="d-flex align-items-center">
                      <img
                        src={avatar}
                        alt=""
                        className="rounded-circle me-2"
                        width="45"
                        height="45"
                      />
                      <div>
                        <div className="fw-bold">
                          {item.userId?.fullName || item.userId?.username || "User"}
                        </div>
                        <small className="text-muted">
                          {item.userId?.email || ""}
                        </small>
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleAccept(item._id)}
                        disabled={processingRequestId === item._id}
                      >
                        {processingRequestId === item._id
                          ? "Đang xử lý..."
                          : "Đồng ý"}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleReject(item._id)}
                        disabled={processingRequestId === item._id}
                      >
                        {processingRequestId === item._id
                          ? "Đang xử lý..."
                          : "Từ chối"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div>
            <h6 className="fw-bold text-secondary">Lời mời đã gửi</h6>

            {sentRequests.length === 0 ? (
              <div className="text-muted">Bạn chưa gửi lời mời nào</div>
            ) : (
              sentRequests.map((item) => {
                const avatar =
                  item.friendId?.avatar && String(item.friendId.avatar).trim()
                    ? item.friendId.avatar
                    : "https://i.pravatar.cc/50";

                return (
                  <div
                    key={item._id}
                    className="d-flex justify-content-between align-items-center p-2 border rounded mb-2"
                  >
                    <div className="d-flex align-items-center">
                      <img
                        src={avatar}
                        alt=""
                        className="rounded-circle me-2"
                        width="45"
                        height="45"
                      />
                      <div>
                        <div className="fw-bold">
                          {item.friendId?.fullName ||
                            item.friendId?.username ||
                            "User"}
                        </div>
                        <small className="text-muted">
                          {item.friendId?.email || ""}
                        </small>
                      </div>
                    </div>

                    <span className="badge bg-warning text-dark">
                      Đang chờ phản hồi
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }


  // ====================================================
  // 3. FIX LỖI "KHÔNG CHỌN CHAT THÌ KHÔNG ĐỔ CHUÔNG"
  // ====================================================
  if (!selected || tab !== "chat") {
    return (
      <>
        <div className="col d-flex justify-content-center align-items-center h-100">
          Chọn một cuộc trò chuyện để bắt đầu nhắn tin.
        </div>

        {/* VẪN NHÚNG COMPONENT VIDEOCALL VÀO ĐỂ LẮNG NGHE LỆNH (GIAO DIỆN SẼ ẨN/HIỆN QUA BIẾN isCallUIOpen) */}
        {activeSocket && user && isCallUIOpen && (
          <VideoCall
            ref={videoCallRef}
            socket={activeSocket}
            currentUser={user}
            partnerId={null} // VideoCall.jsx sẽ tự động trích xuất thông tin đối tác từ luồng incomingCallData
            conversationId={null}
            onClose={() => setIsCallUIOpen(false)}
          />
        )}
      </>
    );
  }


  const partnerId =
    selected?.members?.find(
      (m) =>
        String(m?.user?._id || m?._id) !== String(myId)
    )?.user?._id
    ||
    selected?.members?.find(
      (m) => String(m?._id) !== String(myId)
    )?._id
    ||
    selected?.userId
    ||
    null;

  console.log("👉 partnerId:", partnerId);

  return (
    <div className="col d-flex flex-column h-100">

      {/* HEADER */}
      <div className="p-3 border-bottom bg-white d-flex justify-content-between align-items-center shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <div style={{ position: "relative" }}>
            <img
              src={
                selected.avatar ||
                `https://ui-avatars.com/api/?name=${selected.name || "U"}`
              }
              className="rounded-circle"
              width="45"
              height="45"
            />

            {/* 🟢 DOT ONLINE */}
            <span
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: onlineUsers[partnerId]
                  ? "#00c853"
                  : "#ccc",
                border: "2px solid white",
              }}
            />
          </div>

          <div>
            <h6 className="mb-0 fw-bold">{selected.name}</h6>

            <small style={{ color: "#666" }}>
              {onlineUsers[partnerId]
                ? "Đang hoạt động"
                : onlineUsers[`lastSeen_${partnerId}`]
                ? `Hoạt động ${new Date(
                    onlineUsers[`lastSeen_${partnerId}`]
                  ).toLocaleTimeString()}`
                : "Không hoạt động"}
            </small>
          </div>
        </div>

        <div className="d-flex gap-2">
          {/* CALL AUDIO */}
          <button
            className="btn rounded-circle border-0"
            style={{ width: 40, height: 40, background: "#e5efff", color: "#0068ff" }}
            onClick={() => {
              setIsCallUIOpen(true);
              setTimeout(() => {
                videoCallRef.current?.startCall("audio", selected);
              }, 100);
            }}
          >
            <FaPhoneAlt size={16} />
          </button>

          {/* CALL VIDEO */}
          <button
            className="btn rounded-circle border-0"
            style={{ width: 40, height: 40, background: "#e5efff", color: "#0068ff" }}
            onClick={() => {
              setIsCallUIOpen(true);
              setTimeout(() => {
                videoCallRef.current?.startCall("video", selected);
              }, 100);
            }}
          >
            <FaVideo size={18} />
          </button>
        </div>
      </div>

      {/* 🔍 SEARCH */}
      <div className="px-3 pt-2 bg-white border-bottom">
        <div className="d-flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control"
            placeholder="Tìm tin nhắn..."
          />
          <button className="btn btn-light" onClick={handleSearch}>
            Tìm
          </button>
        </div>

        {/* RESULT */}
        {searchResults.length > 0 && (
          <div style={{ maxHeight: 150, overflow: "auto", marginTop: 5 }}>
            {searchResults.map((m) => (
              <div
                key={m._id}
                style={{
                  padding: 6,
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
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
                {m.content}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📌 PINNED */}
      {pinnedMessages?.length > 0 && (
        <div style={{ background: "#fff3cd", padding: 8 }}>
          <b>📌 Tin đã ghim</b>

          {pinnedMessages.map((p) => {
            const msg = p.message;

            return (
              <div
                key={msg?._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {/* CLICK → SCROLL */}
                <div
                  style={{ flex: 1 }}
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
                  }}
                >
                  {msg?.isDeleted ? (
                    <i style={{ color: "#999" }}>Tin nhắn đã bị xóa</i>
                  ) : (
                    msg?.content
                  )}
                </div>

                {/* ❌ NÚT BỎ GHIM */}
                <div
                  style={{
                    marginLeft: 10,
                    color: "#ff4d4f",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); // 🔥 QUAN TRỌNG: không trigger scroll
                    handleUnpin(msg);
                  }}
                >
                  Bỏ ghim
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 💬 MESSAGE LIST */}
      <div
        className="flex-grow-1 p-3 bg-light overflow-auto"
        ref={containerRef}
        onClick={emitSeen}
        onScroll={(e) => {
        emitSeen();
        handleScroll(e);
      }}
      >
        {loadingMore && (
          <div style={{ textAlign: "center", padding: "10px", color: "#888" }}>
            Đang tải tin nhắn...
          </div>
        )}
        {messages.length === 0 ? (
          <div className="text-center text-muted">Chưa có tin nhắn</div>
        ) : (
          messages.map((m, i) => renderMessage(m, i))
        )}
        <div ref={bottomRef}></div>
      </div>

      {/* ↩️ REPLY PREVIEW */}
      {replyMessage && (
        <div className="px-3 py-2 bg-light border-top">
          ↩ {
            typeof replyMessage.senderId === "object"
              ? replyMessage.senderId.fullName
              : "Người dùng"
          }: {replyMessage.content}
        </div>
      )}

      {/* INPUT */}
      <div className="p-3 border-top bg-white position-relative">

        {/* Emoji Picker */}
        {showEmoji && (
          <div className="shadow rounded" style={{ position: "absolute", bottom: "70px", right: "20px", zIndex: 10 }}>
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        {/* KHUNG XEM TRƯỚC FILE / ẢNH ĐÃ CHỌN */}
        {file && (
          <div className="mb-2 d-flex">
            <div className="position-relative border rounded p-1 bg-light shadow-sm" style={{ display: "inline-block" }}>

              {/* Nút X để xóa file đã chọn */}
              <button
                onClick={() => setFile(null)}
                className="btn btn-danger rounded-circle position-absolute d-flex align-items-center justify-content-center"
                style={{ top: "-8px", right: "-8px", width: "20px", height: "20px", padding: 0, fontSize: "12px", zIndex: 2 }}
                title="Xóa file"
              >
                ✕
              </button>

              {/* Hiển thị ảnh nếu là file ảnh, ngược lại hiển thị tên file */}
              {file.type && file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  style={{ height: "60px", width: "auto", borderRadius: "4px", objectFit: "cover" }}
                />
              ) : (
                <div className="d-flex align-items-center gap-2 px-2 py-1" style={{ height: "60px" }}>
                  <span style={{ fontSize: "24px" }}>📄</span>
                  <div className="text-truncate" style={{ maxWidth: "150px", fontSize: "0.85rem" }} title={file.name}>
                    {file.name}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KHUNG NHẬP LIỆU */}
        <div className="d-flex gap-2 align-items-center">

          {/* Nút đính kèm */}
          <input
            type="file"
            id="file-upload"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files[0]) setFile(e.target.files[0]);
              e.target.value = null; // Reset input để có thể chọn lại cùng 1 file nếu vừa xóa
            }}
          />
          <label
            htmlFor="file-upload"
            className="btn btn-light rounded-circle d-flex align-items-center justify-content-center text-secondary m-0"
            style={{ width: "40px", height: "40px", cursor: "pointer", fontSize: "1.2rem", flexShrink: 0 }}
          >
            📎
          </label>

          {/* Ô nhập tin nhắn */}
          <div className="d-flex align-items-center bg-light rounded-pill px-3 py-1 flex-grow-1 border">
            <input
              value={message}
              onFocus={emitSeen}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              className="form-control border-0 bg-transparent shadow-none px-0"
              style={{ outline: "none" }}
              placeholder="Nhập tin nhắn..."
            />

            {/* Nút Emoji */}
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="btn btn-link text-decoration-none border-0 p-0 ms-2 flex-shrink-0"
              style={{ fontSize: "1.2rem", color: "#888" }}
            >
              😊
            </button>
          </div>

          {/* Nút Gửi */}
          <button
            onClick={sendMessage}
            className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: "40px", height: "40px" }}
            disabled={!message.trim() && !file}
          >
            ➤
          </button>
        </div>
      </div>

      {/* VIDEO CALL */}
      {activeSocket && user && isCallUIOpen && (
        <VideoCall
          ref={videoCallRef}
          socket={activeSocket}
          currentUser={user}
          partnerId={selected?._id || null}
          conversationId={selected.conversationId || selected._id}
          onClose={() => setIsCallUIOpen(false)}
        />
      )}
    </div>
  );
}