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

  const normalizeConversation = (conversation) => {
    if (!conversation) return null;

    const isGroup = conversation.type === "group";

    let name = "Cuộc trò chuyện";
    let avatar = "https://i.pravatar.cc/50";

    if (isGroup) {
      name = conversation.name?.trim() || "Nhóm chat";
      avatar = conversation.avatar?.trim() || avatar;
    } else {
      const otherMember = conversation.members?.find(
        (m) => String(m?.user?._id || m?.user) !== String(currentUser?._id)
      );

      name =
        otherMember?.user?.fullName ||
        otherMember?.user?.name ||
        otherMember?.user?.username ||
        "Người dùng";

      avatar =
        otherMember?.user?.avatar ||
        otherMember?.user?.profilePicture ||
        avatar;
    }

    return {
      ...conversation,
      _id: conversation._id,
      conversationId: conversation._id,
      name,
      avatar,
      latestMessage: conversation.latestMessage || null,
      updatedAt: conversation.updatedAt || new Date().toISOString(),
    };
  };

  const loadChats = async () => {
    const res = await getConversations();

    if (res.success) {
      const conversations = Array.isArray(res.data) ? res.data : [];
      setContacts(conversations);

      if (conversations.length > 0 && !selected && tab === "chat") {
        setSelected(conversations[0]);
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

  // realtime conversation mới cho cả sender + receiver
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
          return prev.map((item) =>
            String(item._id) === String(normalized._id)
              ? { ...item, ...normalized }
              : item
          );
        }

        return [normalized, ...prev];
      });
    };

    onConversationCreated(handleConversationCreated);

    return () => {
      offConversationCreated(handleConversationCreated);
    };
  }, []);

  // realtime badge lời mời
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