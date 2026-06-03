import React from "react";
import Sidebar from "../components/chat/Sidebar";
import Panel from "../components/chat/Panel";
import ChatContent from "../components/chat/ChatContent";
import useChatPage from "../hooks/useChatPage";

export default function ChatPage() {
  const {
    contacts,
    selected,
    tab,
    setTab,
    friendSection,
    setFriendSection,
    hasNewFriendRequest,
    setHasNewFriendRequest,
    showAddFriendModal,
    setShowAddFriendModal,
    showCreateGroupModal,
    setShowCreateGroupModal,
    aiReloadTrigger,
    unreadMap,
    setUnreadMap,
    loadChats,
    handleSelectConversation,
    handleOpenChatHome,
    handleOpenFriendChat,
    handleNewSessionCreated,
    handleFriendRemoved,
    markGroupDissolved,
  } = useChatPage();

  return (
    <div className="container-fluid vh-100 overflow-hidden">
      <div className="row h-100">
        <Panel
          tab={tab}
          setTab={setTab}
          onOpenChatHome={handleOpenChatHome}
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
          setSelected={handleSelectConversation}
        />

        <ChatContent
          selected={selected}
          tab={tab}
          friendSection={friendSection}
          setHasNewFriendRequest={setHasNewFriendRequest}
          setUnreadMap={setUnreadMap}
          loadChats={loadChats}
          onNewSessionCreated={handleNewSessionCreated}
          onFriendRemoved={handleFriendRemoved}
          onGroupDissolved={markGroupDissolved}
          onOpenFriendChat={handleOpenFriendChat}
        />
      </div>
    </div>
  );
}
