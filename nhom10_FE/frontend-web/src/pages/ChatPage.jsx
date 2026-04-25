import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/Chatbox";
import Panel from "../components/Panel";
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
} from "../socket/socket";

export default function ChatPage() {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("chat");

  const [friendSection, setFriendSection] = useState("friends");
  const [hasNewFriendRequest, setHasNewFriendRequest] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  const navigate = useNavigate();

  const [unreadMap, setUnreadMap] = useState(() => {
    const saved = localStorage.getItem("unreadMap");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("unreadMap", JSON.stringify(unreadMap));
  }, [unreadMap]);

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
        name =
          otherUser.fullName ||
          otherUser.name ||
          otherUser.username ||
          name;

        avatar =
          otherUser.avatar ||
          otherUser.profilePicture ||
          avatar;
      }
    }

    return {
      ...conversation,
      _id: conversation._id,
      conversationId: conversation._id,
      name,
      avatar,
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
      const normalized = conversations
        .map(normalizeConversation)
        .filter(Boolean);

      const finalList = dedupeAndSortContacts(normalized);
      setContacts(finalList);

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
      const received = Array.isArray(res.data?.received)
        ? res.data.received
        : [];
      setHasNewFriendRequest(received.length > 0);
    } else {
      setHasNewFriendRequest(false);
    }
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

  useEffect(() => {
    const handleNewMessageGlobal = (message) => {
      if (!message?.conversationId) return;

      const incomingConversationId = String(
        message?.conversationId?._id || message?.conversationId
      );

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
          // giữ nguyên name/avatar cũ để không bị nhảy sang chính mình
          name: oldItem?.name,
          avatar: oldItem?.avatar,
        };

        const newList = [...prev];
        newList.splice(existingIndex, 1);
        newList.unshift(updatedItem);

        return dedupeAndSortContacts(newList);
      });

      setUnreadMap((prev) => {
        const currentSelectedId = selected?._id || selected?.conversationId;

        const senderId =
          typeof message?.senderId === "object"
            ? message?.senderId?._id || message?.senderId?.id
            : message?.senderId;

        // không cộng badge cho chính tin nhắn mình gửi
        if (String(senderId) === String(currentUserId)) {
          return prev;
        }

        // nếu đang mở đúng conversation đó thì không cộng
        if (String(currentSelectedId) === incomingConversationId) {
          return prev;
        }

        return {
          ...prev,
          [incomingConversationId]: (prev[incomingConversationId] || 0) + 1,
        };
      });
    };

    onNewMessageGlobal(handleNewMessageGlobal);

    return () => {
      offNewMessageGlobal(handleNewMessageGlobal);
    };
  }, [selected]);

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
    if (tab === "friends" && friendSection === "requests") {
      setHasNewFriendRequest(false);
    }
  }, [tab, friendSection]);

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
          contacts={contacts}
          selected={selected}
          friendSection={friendSection}
          setFriendSection={setFriendSection}
          hasNewFriendRequest={hasNewFriendRequest}
          showAddFriendModal={showAddFriendModal}
          setShowAddFriendModal={setShowAddFriendModal}
          unreadMap={unreadMap}
          setSelected={(c) => {
            setSelected(c);
            setUnreadMap((prev) => ({
              ...prev,
              [c._id]: 0,
            }));
          }}
        />

        <ChatBox
          selected={selected}
          tab={tab}
          friendSection={friendSection}
          setHasNewFriendRequest={setHasNewFriendRequest}
          setUnreadMap={setUnreadMap}
        />
      </div>
    </div>
  );
}