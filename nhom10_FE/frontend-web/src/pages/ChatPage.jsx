import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/Chatbox";
import ChatGroupBox from "../components/ChatGroupBox";
import Panel from "../components/Panel";
import ChatAI from "../components/ChatAI";
import { getConversations } from "../api/chatApi";
import { getFriendRequestsAPI } from "../api/friendAPI";
import { useNavigate } from "react-router-dom";
import {
  connectSocket,
  onConversationCreated,
  offConversationCreated,
  onNewMessageGlobal,
  offNewMessageGlobal,
  onFriendRequestReceived,
  offFriendRequestReceived,
  onFriendRemoved,
  offFriendRemoved,
  onConversationUpdated,
  offConversationUpdated,
  onGroupCreated,
  offGroupCreated,
  onGroupInfoUpdated,
  offGroupInfoUpdated,
  onGroupMembersAdded,
  offGroupMembersAdded,
  onGroupMemberRemoved,
  offGroupMemberRemoved,
  onGroupLeft,
  offGroupLeft,
  onGroupDissolved,
  offGroupDissolved,
} from "../socket/socket";
import { FaRobot } from "react-icons/fa";

export default function ChatPage() {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("chat");

  const [friendSection, setFriendSection] = useState("friends"); // "friends" | "requests"
  const [hasNewFriendRequest, setHasNewFriendRequest] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [aiReloadTrigger, setAiReloadTrigger] = useState(0);

  const navigate = useNavigate();

  // Dùng useRef để luôn lấy được phòng đang chọn mới nhất
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Bộ lọc chống trùng lặp (Deduplicate) tin nhắn
  const processedMessagesRef = useRef(new Set());

  useEffect(() => {
    if (tab === "ai") {
      setSelected({
        isAI: true,
        name: "Cuộc trò chuyện mới",
        _id: "new_ai_chat",
        isNew: true,
      });
    } else if (tab === "friends") {
      setSelected(null);
    } else if (tab === "chat") {
      if (selected?.isAI) {
        setSelected(contacts.length > 0 ? contacts[0] : null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const updateLastMessage = (msg) => {
    setContacts((prev) => {
      const msgConvId =
        typeof msg.conversationId === "object"
          ? msg.conversationId._id
          : msg.conversationId;

      let updated = prev.map((chat) => {
        const chatId = chat.conversationId || chat._id;

        if (String(chatId) === String(msgConvId)) {
          return {
            ...chat,
            latestMessage: msg,
            updatedAt: msg.createdAt || new Date().toISOString(),
          };
        }

        return chat;
      });

      updated.sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );

      return [...updated];
    });
  };

  const [unreadMap, setUnreadMap] = useState(() => {
    const saved = localStorage.getItem("unreadMap");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("unreadMap", JSON.stringify(unreadMap));
  }, [unreadMap]);

  const handleNewSessionCreated = async (newSessionId) => {
    setSelected((prev) => ({
      ...prev,
      _id: newSessionId,
      isNew: false,
    }));
    setAiReloadTrigger((prev) => prev + 1);
  };

  const currentUser = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const currentUserId = currentUser?._id || currentUser?.id || null;

  const normalizeConversation = (conversation) => {
    if (!conversation) return null;

    const isGroup = conversation.type === "group";

    let name = conversation.name?.trim() || "Cuộc trò chuyện";
    let avatar = conversation.avatar?.trim() || "https://i.pravatar.cc/50";

    if (isGroup) {
      return {
        ...conversation,
        _id: conversation._id,
        conversationId: conversation._id,
        name: conversation.name?.trim() || "Nhóm chat",
        avatar: conversation.avatar?.trim() || "https://i.pravatar.cc/50",
        latestMessage: conversation.latestMessage || null,
        updatedAt:
          conversation.latestMessage?.createdAt ||
          conversation.updatedAt ||
          conversation.createdAt ||
          new Date().toISOString(),
      };
    }

    const shouldResolveFromMembers =
      !conversation.name?.trim() || !conversation.avatar?.trim();

    let partnerUnavailable = Boolean(conversation.partnerDeleted);

    if (shouldResolveFromMembers && Array.isArray(conversation.members)) {
      const otherMember = conversation.members.find((m) => {
        const memberUser = m?.user;
        const memberUserId =
          typeof memberUser === "object"
            ? memberUser?._id || memberUser?.id
            : memberUser;

        return String(memberUserId) !== String(currentUserId);
      });

      const otherUser =
        typeof otherMember?.user === "object" ? otherMember.user : null;

      if (otherUser) {
        name = otherUser.fullName || otherUser.name || otherUser.username || name;
        avatar = otherUser.avatar || otherUser.profilePicture || avatar;
        partnerUnavailable = partnerUnavailable || Boolean(otherUser.isDeleted || otherUser.isLocked);
      }
    }

    return {
      ...conversation,
      _id: conversation._id,
      conversationId: conversation._id,
      name,
      avatar,
      partnerDeleted: partnerUnavailable,
      friendshipStatus: conversation.friendshipStatus || "accepted",
      canSendMessage:
        conversation.canSendMessage !== undefined
          ? conversation.canSendMessage
          : !partnerUnavailable,
      latestMessage: conversation.latestMessage || null,
      updatedAt:
        conversation.latestMessage?.createdAt ||
        conversation.updatedAt ||
        conversation.createdAt ||
        new Date().toISOString(),
    };
  };

  const dedupeAndSortContacts = (list) => {
    const map = new Map();

    for (const item of list) {
      const key = String(item?._id || item?.conversationId || "");
      if (!key) continue;

      const existed = map.get(key);

      if (!existed) {
        map.set(key, item);
        continue;
      }

      const existedTime = new Date(
        existed?.latestMessage?.createdAt ||
        existed?.updatedAt ||
        existed?.createdAt ||
        0
      ).getTime();

      const currentTime = new Date(
        item?.latestMessage?.createdAt ||
        item?.updatedAt ||
        item?.createdAt ||
        0
      ).getTime();

      if (currentTime >= existedTime) {
        map.set(key, item);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(
        a?.latestMessage?.createdAt || a?.updatedAt || a?.createdAt || 0
      ).getTime();

      const timeB = new Date(
        b?.latestMessage?.createdAt || b?.updatedAt || b?.createdAt || 0
      ).getTime();

      return timeB - timeA;
    });
  };

  const loadChats = async () => {
    const res = await getConversations();

    if (res.success) {
      const conversations = Array.isArray(res.data) ? res.data : [];
      const normalized = conversations.map(normalizeConversation).filter(Boolean);
      const finalList = dedupeAndSortContacts(normalized);

      setContacts(finalList);

      setSelected((prev) => {
        if (!prev || prev?.isAI) return prev;

        const selectedId = prev?._id || prev?.conversationId;
        const freshSelected = finalList.find(
          (item) => String(item?._id || item?.conversationId) === String(selectedId)
        );

        return freshSelected ? { ...prev, ...freshSelected } : prev;
      });

      if (finalList.length > 0 && !selected && tab === "chat") {
        setSelected(finalList[0]);
      }
    } else if (res.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  const loadFriendRequestBadge = async () => {
    const res = await getFriendRequestsAPI();
    if (res?.success) {
      const received = Array.isArray(res.data?.received) ? res.data.received : [];
      setHasNewFriendRequest(received.length > 0);
    } else {
      setHasNewFriendRequest(false);
    }
  };

  const handleFriendRemoved = ({ friendId, friendshipStatus = "rejected" }) => {
    if (!friendId) return;

    const markConversationLocked = (item) => {
      if (item?.type !== "private" || !Array.isArray(item.members)) return item;

      const hasFriend = item.members.some((member) => {
        const memberUser = member?.user || member;
        const memberUserId =
          typeof memberUser === "object" ? memberUser?._id || memberUser?.id : memberUser;

        return String(memberUserId) === String(friendId);
      });

      return hasFriend
        ? { ...item, friendshipStatus, canSendMessage: false }
        : item;
    };

    setContacts((prev) => prev.map(markConversationLocked));
    setSelected((prev) => (prev ? markConversationLocked(prev) : prev));
  };

  const markGroupDissolved = (payload) => {
    const data = payload?.data || payload;
    const group = data?.group || data;
    const conversationId = data?.conversationId || data?.group?._id || data?._id || group?._id;
    if (!conversationId) return;

    const normalized = normalizeConversation({
      ...group,
      _id: group?._id || conversationId,
      conversationId: group?._id || conversationId,
      isActive: false,
    });

    setContacts((prev) => {
      const updated = prev.map((item) => {
        const itemId = item?._id || item?.conversationId;
        if (String(itemId) !== String(conversationId)) return item;
        return normalized ? { ...item, ...normalized, isActive: false } : { ...item, isActive: false };
      });
      return dedupeAndSortContacts(updated);
    });

    setSelected((prev) => {
      const selectedId = prev?._id || prev?.conversationId;
      if (String(selectedId) !== String(conversationId)) return prev;
      return normalized ? { ...prev, ...normalized, isActive: false } : { ...prev, isActive: false };
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    connectSocket(token);
    loadChats();
    loadFriendRequestBadge();
  }, [navigate]);

  useEffect(() => {
    const handleConversationCreated = (payload) => {
      const conversation = payload?.data || payload;
      if (!conversation?._id) return;

      const normalized = normalizeConversation(conversation);
      if (!normalized) return;

      setContacts((prev) => {
        const exists = prev.some(
          (item) => String(item._id) === String(normalized._id)
        );

        if (exists) {
          const updated = prev.map((item) =>
            String(item._id) === String(normalized._id)
              ? { ...item, ...normalized }
              : item
          );
          return dedupeAndSortContacts(updated);
        }
        return dedupeAndSortContacts([normalized, ...prev]);
      });
    };

    onConversationCreated(handleConversationCreated);
    return () => {
      offConversationCreated(handleConversationCreated);
    };
  }, []);

  // 👉 HÀM LẮNG NGHE TIN NHẮN (ĐÃ FIX TRIỆT ĐỂ LỖI X2 CHẤM ĐỎ)
  useEffect(() => {
    const handleNewMessageGlobal = (message) => {
      if (!message?.conversationId) return;

      // 🔥 CHỐNG TRÙNG LẶP TIN NHẮN TẬN GỐC
      const msgId = message?._id || message?.id; // Phòng hờ API trả về 'id' thay vì '_id'
      if (msgId) {
        if (processedMessagesRef.current.has(msgId)) {
          console.log("⚠️ Bỏ qua tin nhắn bị đúp:", msgId);
          return;
        }

        processedMessagesRef.current.add(msgId);

        // Giữ bộ nhớ gọn nhẹ (50 tin)
        if (processedMessagesRef.current.size > 50) {
          const firstItem = processedMessagesRef.current.values().next().value;
          processedMessagesRef.current.delete(firstItem);
        }
      }

      const incomingConversationId = String(
        message?.conversationId?._id || message?.conversationId
      );

      // Cập nhật Chat lên đầu
      setContacts((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            String(item?._id || item?.conversationId) === incomingConversationId
        );

        if (existingIndex === -1) return prev;

        const oldItem = prev[existingIndex];

        const updatedItem = {
          ...oldItem,
          latestMessage: message,
          updatedAt: message?.createdAt || new Date().toISOString(),
          name: oldItem?.name,
          avatar: oldItem?.avatar,
        };

        const newList = [...prev];
        newList.splice(existingIndex, 1);
        newList.unshift(updatedItem);

        return dedupeAndSortContacts(newList);
      });

      // Cập nhật chấm đỏ
      setUnreadMap((prev) => {
        const currentSelectedId = selectedRef.current?._id || selectedRef.current?.conversationId;

        const senderId =
          typeof message?.senderId === "object"
            ? message?.senderId?._id || message?.senderId?.id
            : message?.senderId;

        // Nếu mình là người gửi -> Bỏ qua
        if (String(senderId) === String(currentUserId)) {
          return prev;
        }

        // Nếu mình ĐANG MỞ đúng phòng đó -> Bỏ qua
        if (String(currentSelectedId) === incomingConversationId) {
          return prev;
        }

        // Lấy số lượng cũ và tăng CHÍNH XÁC thêm 1
        const prevCount = prev[incomingConversationId] || 0;
        return {
          ...prev,
          [incomingConversationId]: prevCount + 1,
        };
      });
    };

    onNewMessageGlobal(handleNewMessageGlobal);

    return () => {
      offNewMessageGlobal(handleNewMessageGlobal);
    };
  }, []); // Cực kỳ quan trọng: Array rỗng [] giúp hàm không bị gắn lại 2 lần

  useEffect(() => {
    const handleFriendRequestReceived = () => {
      if (!(tab === "friends" && friendSection === "requests")) {
        setHasNewFriendRequest(true);
      }
    };

    onFriendRequestReceived(handleFriendRequestReceived);

    return () => {
      offFriendRequestReceived(handleFriendRequestReceived);
    };
  }, [tab, friendSection]);

  useEffect(() => {
    const handleFriendRemovedRealtime = (payload) => {
      const data = payload?.data || payload;
      const otherUserId =
        String(data?.userId) === String(currentUserId) ? data?.friendId : data?.userId;

      if (!otherUserId) return;

      handleFriendRemoved({
        friendId: otherUserId,
        friendshipStatus: data?.friendshipStatus || "rejected",
      });
    };

    onFriendRemoved(handleFriendRemovedRealtime);
    return () => {
      offFriendRemoved(handleFriendRemovedRealtime);
    };
  }, [currentUserId]);

  useEffect(() => {
    const getConversationId = (payload) => {
      const data = payload?.data || payload;
      return data?.conversationId || data?.group?._id || data?._id || null;
    };

    const removeGroupLocally = (conversationId) => {
      if (!conversationId) return;

      setContacts((prev) =>
        prev.filter((item) => String(item?._id || item?.conversationId) !== String(conversationId))
      );

      setSelected((prev) => {
        const selectedId = prev?._id || prev?.conversationId;
        return String(selectedId) === String(conversationId) ? null : prev;
      });

      setUnreadMap((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    };

    const refreshChats = () => {
      loadChats();
    };

    const handleGroupMemberRemoved = (payload) => {
      const data = payload?.data || payload;
      const removedMemberId = data?.removedMemberId;
      const conversationId = getConversationId(data);

      if (removedMemberId && String(removedMemberId) === String(currentUserId)) {
        removeGroupLocally(conversationId);
        return;
      }

      loadChats();
    };

    const handleGroupDissolved = (payload) => {
      markGroupDissolved(payload);
    };

    onConversationUpdated(refreshChats);
    onGroupCreated(refreshChats);
    onGroupInfoUpdated(refreshChats);
    onGroupMembersAdded(refreshChats);
    onGroupMemberRemoved(handleGroupMemberRemoved);
    onGroupLeft(refreshChats);
    onGroupDissolved(handleGroupDissolved);

    return () => {
      offConversationUpdated(refreshChats);
      offGroupCreated(refreshChats);
      offGroupInfoUpdated(refreshChats);
      offGroupMembersAdded(refreshChats);
      offGroupMemberRemoved(handleGroupMemberRemoved);
      offGroupLeft(refreshChats);
      offGroupDissolved(handleGroupDissolved);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (tab === "friends" && friendSection === "requests") {
      setHasNewFriendRequest(false);
    }
  }, [tab, friendSection]);

  useEffect(() => {
    window.updateLastMessage = updateLastMessage;
    return () => {
      delete window.updateLastMessage;
    };
  }, [contacts]);

  return (
    <div className="container-fluid vh-100 overflow-hidden">
      <div className="row h-100">
        <Panel
          tab={tab}
          setTab={setTab}
          setFriendSection={setFriendSection}
          hasNewFriendRequest={hasNewFriendRequest}
        />

        <Sidebar
          tab={tab}
          setTab={setTab}
          contacts={contacts}
          selected={selected}
          friendSection={friendSection}
          setFriendSection={setFriendSection}
          hasNewFriendRequest={hasNewFriendRequest}
          showAddFriendModal={showAddFriendModal}
          setShowAddFriendModal={setShowAddFriendModal}
          showCreateGroupModal={showCreateGroupModal}
          setShowCreateGroupModal={setShowCreateGroupModal}
          unreadMap={unreadMap}
          reloadTrigger={aiReloadTrigger}
          loadChats={loadChats}
          setSelected={(c) => {
            setSelected(c);
            const id = c?._id || c?.conversationId;
            if (id) {
              setUnreadMap((prev) => ({
                ...prev,
                [id]: 0,
              }));
            }
          }}
        />

        {tab === "friends" ? (
          <ChatBox
            selected={selected}
            tab={tab}
            friendSection={friendSection}
            setHasNewFriendRequest={setHasNewFriendRequest}
            setUnreadMap={setUnreadMap}
            onFriendRemoved={handleFriendRemoved}
          />
        ) : !selected ? (
          <div className="col-9 d-flex justify-content-center align-items-center bg-light">
            <div className="text-center">
              <FaRobot size={50} className="text-muted mb-3" />
              <p className="text-muted">Chọn một cuộc trò chuyện để bắt đầu.</p>
            </div>
          </div>
        ) : selected?.isAI ? (
          <ChatAI
            selected={selected}
            onNewSessionCreated={handleNewSessionCreated}
          />
        ) : selected?.type === "group" ? (
          <ChatGroupBox
            selected={selected}
            setUnreadMap={setUnreadMap}
            loadChats={loadChats}
            onGroupDissolved={markGroupDissolved}
          />
        ) : (
          <ChatBox
            selected={selected}
            tab={tab}
            friendSection={friendSection}
            setHasNewFriendRequest={setHasNewFriendRequest}
            setUnreadMap={setUnreadMap}
            onFriendRemoved={handleFriendRemoved}
          />
        )}
      </div>
    </div>
  );
}
