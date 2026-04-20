import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/Chatbox";
import Panel from "../components/Panel";
import { getConversations } from "../api/chatApi";
import { useNavigate } from "react-router-dom"; // 🔥 thêm

export default function ChatPage() {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("chat");

  const navigate = useNavigate(); // 🔥 thêm

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    loadChats();
  }, []);
    const loadChats = async () => {
      const res = await getConversations();

      if (res.success) {
        setContacts(res.data);

        if (res.data.length > 0 && !selected) {
          setSelected(res.data[0]);
        }
      } else {
        if (res.status === 401) {
          console.log("Token hết hạn → logout");

          localStorage.clear();
          window.location.href = "/login";
        }
      }
    };

  return (
    <div className="container-fluid vh-100 overflow-hidden">
      <div className="row h-100">
        <Panel tab={tab} setTab={setTab} />

        <Sidebar
          tab={tab}
          contacts={contacts}
          selected={selected}
          setSelected={setSelected}
        />

        <ChatBox selected={selected} tab={tab} />
      </div>
    </div>
  );
}
