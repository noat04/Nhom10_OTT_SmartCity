import { FaComments, FaRobot, FaShieldAlt, FaUserFriends } from "react-icons/fa";
import ChatAI from "./ChatAI";
import ChatBox from "./Chatbox";
import ChatGroupBox from "./ChatGroupBox";

export default function ChatContent({
  selected,
  tab,
  friendSection,
  setHasNewFriendRequest,
  setUnreadMap,
  loadChats,
  onNewSessionCreated,
  onFriendRemoved,
  onGroupDissolved,
  onOpenFriendChat,
}) {
  if (tab === "friends") {
    return (
      <ChatBox
        selected={selected}
        tab={tab}
        friendSection={friendSection}
        setHasNewFriendRequest={setHasNewFriendRequest}
        setUnreadMap={setUnreadMap}
        onFriendRemoved={onFriendRemoved}
        onOpenFriendChat={onOpenFriendChat}
      />
    );
  }

  if (!selected) {
    return (
      <div
        className="col d-flex justify-content-center align-items-center"
        style={{
          minWidth: 0,
          background:
            "linear-gradient(135deg, #f8fbff 0%, #eef5ff 45%, #f8fafc 100%)",
        }}
      >
        <div className="text-center px-4" style={{ maxWidth: 560 }}>
          <div
            className="mx-auto mb-4 d-flex align-items-center justify-content-center"
            style={{
              width: 84,
              height: 84,
              borderRadius: 24,
              color: "#fff",
              background: "linear-gradient(135deg, #0d6efd, #14b8a6)",
              boxShadow: "0 18px 40px rgba(13, 110, 253, 0.22)",
            }}
          >
            <FaComments size={38} />
          </div>
          <h1 className="fw-bold mb-2" style={{ color: "#172033" }}>
            SmartCity Chat
          </h1>
          <p className="text-muted mb-4" style={{ fontSize: 16 }}>
            Chọn một cuộc trò chuyện hoặc bắt đầu một cuộc trò chuyện mới để kết nối với bạn bè, nhóm hoặc trợ lý AI của bạn.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <div className="d-flex align-items-center gap-2 text-muted">
              <FaUserFriends color="#0d6efd" />
              <span>Chat bạn bè và nhóm</span>
            </div>
            <div className="d-flex align-items-center gap-2 text-muted">
              <FaRobot color="#0d6efd" />
              <span>Trợ lý AI</span>
            </div>
            <div className="d-flex align-items-center gap-2 text-muted">
              <FaShieldAlt color="#0d6efd" />
              <span>Đồng bộ thời gian thực</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selected?.isAI) {
    return <ChatAI selected={selected} onNewSessionCreated={onNewSessionCreated} />;
  }

  if (selected?.type === "group") {
    return (
      <ChatGroupBox
        selected={selected}
        setUnreadMap={setUnreadMap}
        loadChats={loadChats}
        onGroupDissolved={onGroupDissolved}
      />
    );
  }

  return (
    <ChatBox
      selected={selected}
      tab={tab}
      friendSection={friendSection}
      setHasNewFriendRequest={setHasNewFriendRequest}
      setUnreadMap={setUnreadMap}
      onFriendRemoved={onFriendRemoved}
      onOpenFriendChat={onOpenFriendChat}
    />
  );
}
