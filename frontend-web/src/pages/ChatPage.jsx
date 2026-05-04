import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/Chatbox";
import ChatGroupBox from "../components/ChatGroupBox";
import Panel from "../components/Panel";
import { getConversations } from "../api/chatApi";
import { getFriendRequestsAPI } from "../api/friendAPI";
import { useNavigate } from "react-router-dom";
import { 
  connectSocket, 
  onConversationUpdated,
  onGroupCreated,
  onGroupInfoUpdated,
  onGroupMembersAdded,
  onGroupMemberRemoved,
  onGroupLeft, } from "../socket/socket";

export default function ChatPage() {
  const [contacts, setContacts] = useState([]);


  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("chat");

  const [friendSection, setFriendSection] = useState("friends"); // "friends" | "requests"
  const [hasNewFriendRequest, setHasNewFriendRequest] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  const navigate = useNavigate();

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

      // ⭐ QUAN TRỌNG: ĐẨY CHAT MỚI NHẤT LÊN ĐẦU
      updated.sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );

      return [...updated];
    });
  };

  //notification
  const [unreadMap, setUnreadMap] = useState(() => {
    const saved = localStorage.getItem("unreadMap");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("unreadMap", JSON.stringify(unreadMap));
  }, [unreadMap]);


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

    const refreshChats = () => {
      loadChats();
    };

    onConversationUpdated(refreshChats);
    onGroupCreated(refreshChats);
    onGroupInfoUpdated(refreshChats);
    onGroupMembersAdded(refreshChats);
    onGroupMemberRemoved(refreshChats);
    onGroupLeft(refreshChats);

    return () => {
      // optional cleanup
    };

  }, []);

  // vào đúng mục lời mời thì tắt chấm đỏ
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
          loadChats={loadChats}
          setSelected={(c) => {
            setSelected(c);
            setUnreadMap((prev) => ({
              ...prev,
              [c._id]: 0,
            }));
          }}
        />

        {selected ? (
          selected.type === "group" ? (
            <ChatGroupBox
              selected={selected}
              setUnreadMap={setUnreadMap}
              loadChats={loadChats}
            />
          ) : (
            <ChatBox
              selected={selected}
              tab={tab}
              friendSection={friendSection}
              setHasNewFriendRequest={setHasNewFriendRequest}
              setUnreadMap={setUnreadMap}
            />
          )
        ) : (
          <div className="col d-flex justify-content-center align-items-center text-muted">
            Chọn cuộc trò chuyện để bắt đầu
          </div>
        )}
      </div>
    </div>
  );
}