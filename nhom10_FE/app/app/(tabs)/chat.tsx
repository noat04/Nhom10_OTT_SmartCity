import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import TopSearchBar from "../../components/TopSearchBar";
import { useAuth } from "../../context/authContext";
import { useNotification } from "../../context/notificationContext";
import { createGroupAPI, getConversationsAPI } from "../../service/chat.api";
import { getFriendsAPI } from "../../service/friend.api";
import { getSocket } from "../../socket/socket";
export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setChatBadgeCount } = useNotification();

  const [keyword, setKeyword] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const myId = user?._id || user?.id;

  const getSenderId = useCallback((message: any) => {
    return typeof message?.senderId === "object"
      ? message.senderId?._id || message.senderId?.id
      : message?.senderId;
  }, []);

  const hasSeenMessage = useCallback((message: any) => {
    if (!message || !myId) return false;

    const senderId = getSenderId(message);
    if (senderId && String(senderId) === String(myId)) return true;

    const seenBy = Array.isArray(message?.seenBy) ? message.seenBy : [];
    return seenBy.some((seen: any) => {
      const seenUserId =
        typeof seen?.userId === "object" ? seen.userId?._id || seen.userId?.id : seen?.userId;
      return seenUserId && String(seenUserId) === String(myId);
    });
  }, [getSenderId, myId]);

  const getUnreadCount = useCallback((message: any) => {
    if (!message) return 0;
    const senderId = getSenderId(message);
    if (!senderId || String(senderId) === String(myId)) return 0;
    return hasSeenMessage(message) ? 0 : 1;
  }, [getSenderId, hasSeenMessage, myId]);

  const getPreviewText = (message: any) => {
    if (!message) return "Chưa có tin nhắn";

    if (message?.isDeleted || message?.deletedAt) {
      return "Tin nhắn đã bị xóa";
    }

    if (message?.content?.trim()) {
      return message.content;
    }

    switch (message?.type) {
      case "image":
        return "📷 Hình ảnh";
      case "video":
        return "🎥 Video";
      case "file":
        return "📎 Tệp đính kèm";
      default:
        return "Tin nhắn mới";
    }
  };

  const dedupeConversations = (list: any[]) => {
    const map = new Map();

    for (const item of list) {
      const key = String(item?.conversationId || item?.id || "");
      if (!key) continue;

      const existed = map.get(key);

      if (!existed) {
        map.set(key, item);
        continue;
      }

      const existedTime = new Date(existed?.updatedAt || 0).getTime();
      const currentTime = new Date(item?.updatedAt || 0).getTime();

      if (currentTime >= existedTime) {
        map.set(key, item);
      }
    }

    return Array.from(map.values()).sort(
      (a: any, b: any) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    );
  };

  const normalizeConversation = useCallback(
    (item: any) => {
      const isGroup = item?.type === "group";

      let displayName = "Cuộc trò chuyện";
      let displayAvatar = "https://i.pravatar.cc/150?img=12";
      let partnerUnavailable = false;
      let partnerId = null; // 👉 BỔ SUNG BIẾN NÀY

      if (isGroup) {
        displayName = item?.name?.trim() || "Nhóm chat";
        displayAvatar =
          item?.avatar?.trim() || "https://i.pravatar.cc/150?img=12";
      } else {
        const otherMember = item?.members?.find(
          (m: any) => String(m?.user?._id || m?.user) !== String(myId),
        );
        partnerUnavailable = Boolean(
          item?.partnerDeleted ||
          otherMember?.user?.isDeleted ||
          otherMember?.user?.isLocked,
        );

        // 👉 LẤY ID CỦA NGƯỜI KIA LƯU VÀO ĐÂY
        partnerId = otherMember?.user?._id || otherMember?.user || null;

        displayName =
          otherMember?.user?.fullName ||
          otherMember?.user?.name ||
          otherMember?.user?.username ||
          "Người dùng";

        if (partnerUnavailable) {
          displayName = "Tai khoan bi khoa";
        }

        displayAvatar =
          otherMember?.user?.avatar ||
          otherMember?.user?.profilePicture ||
          "https://i.pravatar.cc/150?img=12";
      }

      const latestMessage = item?.latestMessage || null;

      return {
        id: item?._id,
        conversationId: item?._id,
        type: item?.type,
        name: displayName,
        img: displayAvatar,
        partnerId: partnerId, // 👉 TRẢ VỀ BIẾN NÀY
        friendshipStatus: item?.friendshipStatus || "accepted",
        canSendMessage:
          item?.type === "group"
            ? true
            : item?.canSendMessage !== false && !partnerUnavailable,
        partnerDeleted: partnerUnavailable,
        isActive: item?.type === "group" ? item?.isActive !== false : true,
        msg: getPreviewText(latestMessage),
        unreadCount: getUnreadCount(latestMessage),
        isTyping: false,
        typingText: "",
        updatedAt:
          latestMessage?.createdAt ||
          item?.updatedAt ||
          item?.createdAt ||
          new Date().toISOString(),
        latestMessage,
        raw: item,
      };
    },
    [getUnreadCount, myId],
  );

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);

      const res = await getConversationsAPI();

      if (!res?.success) {
        setConversations([]);
        return;
      }

      const normalized = (res?.data || []).map(normalizeConversation);
      setConversations(dedupeConversations(normalized));
    } catch (error: any) {
      console.log("❌ loadConversations:", error?.message);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [normalizeConversation]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      const res = await getConversationsAPI();

      if (!res?.success) {
        setConversations([]);
        return;
      }

      const normalized = (res?.data || []).map(normalizeConversation);
      setConversations(dedupeConversations(normalized));
    } catch (error: any) {
      console.log("❌ refresh conversations:", error?.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!myId) return;
    loadConversations();
  }, [myId, loadConversations]);

  useEffect(() => {
    const totalUnread = conversations.reduce(
      (sum: number, item: any) => sum + (Number(item?.unreadCount) || 0),
      0,
    );
    setChatBadgeCount(totalUnread);
  }, [conversations, setChatBadgeCount]);

  useFocusEffect(
    useCallback(() => {
      if (myId) {
        loadConversations();
      }
    }, [loadConversations, myId]),
  );

  useEffect(() => {
    if (!myId) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const bindRealtime = () => {
      const socket = getSocket();

      if (!socket) {
        retryTimer = setTimeout(bindRealtime, 250);
        return;
      }

      const handleConversationCreated = (payload: any) => {
        const conversation = payload?.data || payload;
        if (!conversation?._id) return;

        const normalized = normalizeConversation(conversation);

        setConversations((prev) => {
          return dedupeConversations([normalized, ...prev]);
        });
      };

      const handleNewMessageGlobal = (message: any) => {
        if (!message?.conversationId) return;

        const conversationFromMessage =
          typeof message?.conversationId === "object"
            ? message.conversationId
            : null;
        const incomingConversationId = String(
          message?.conversationId?._id || message?.conversationId,
        );

        const sender =
          typeof message?.senderId === "object" ? message.senderId : null;
        const senderId = getSenderId(message);
        const isMine = senderId && String(senderId) === String(myId);
        const nextUnreadCount = isMine ? 0 : 1;

        setConversations((prev) => {
          const existingIndex = prev.findIndex(
            (item: any) =>
              String(item.conversationId) === incomingConversationId,
          );

          if (existingIndex !== -1) {
            const conversationPatch =
              conversationFromMessage?._id &&
              (conversationFromMessage?.type === "group" ||
                conversationFromMessage?.name)
                ? normalizeConversation(conversationFromMessage)
                : null;
            const updatedItem = {
              ...prev[existingIndex],
              ...(conversationPatch
                ? {
                    type: conversationPatch.type,
                    name: conversationPatch.name,
                    img: conversationPatch.img,
                    raw: conversationPatch.raw,
                    isActive: conversationPatch.isActive,
                  }
                : {}),
              msg: getPreviewText(message),
              latestMessage: message,
              unreadCount: nextUnreadCount,
              isTyping: false,
              typingText: "",
              updatedAt: message?.createdAt || new Date().toISOString(),
            };

            const newList = [...prev];
            newList.splice(existingIndex, 1);
            newList.unshift(updatedItem);

            return dedupeConversations(newList);
          }

          if (conversationFromMessage?._id) {
            const normalized = normalizeConversation({
              ...conversationFromMessage,
              latestMessage: message,
              updatedAt: message?.createdAt || conversationFromMessage?.updatedAt,
            });
            return dedupeConversations([normalized, ...prev]);
          }

          const fallbackName =
            message?.conversationName ||
            (message?.conversationType === "group"
              ? "Nhom chat"
              : sender?.fullName ||
                sender?.name ||
                sender?.username ||
                "Cuoc tro chuyen");

          const fallbackConversation = {
            id: incomingConversationId,
            conversationId: incomingConversationId,
            type: message?.conversationType || "direct",
            name:
              message?.conversationName ||
              sender?.fullName ||
              sender?.name ||
              sender?.username ||
              "Cuộc trò chuyện",
            img:
              message?.conversationAvatar ||
              sender?.avatar ||
              sender?.profilePicture ||
              "https://i.pravatar.cc/150?img=12",
            msg: getPreviewText(message),
            unreadCount: nextUnreadCount,
            isTyping: false,
            typingText: "",
            updatedAt: message?.createdAt || new Date().toISOString(),
            latestMessage: message,
            raw: null,
            ...(fallbackName ? { name: fallbackName } : {}),
          };

          return dedupeConversations([fallbackConversation, ...prev]);
        });
      };

      const handleMessageEdited = (message: any) => {
        if (!message?.conversationId) return;

        const editedConversationId = String(
          message?.conversationId?._id || message?.conversationId,
        );

        setConversations((prev) =>
          dedupeConversations(
            prev.map((item: any) =>
              String(item.conversationId) === editedConversationId
                ? {
                  ...item,
                  msg: getPreviewText(message),
                  latestMessage: message,
                  updatedAt: item?.updatedAt || message?.createdAt,
                }
                : item,
            ),
          ),
        );
      };

      const handleMessageDeleted = (message: any) => {
        if (!message?.conversationId) return;

        const deletedConversationId = String(
          message?.conversationId?._id || message?.conversationId,
        );

        setConversations((prev) =>
          dedupeConversations(
            prev.map((item: any) =>
              String(item.conversationId) === deletedConversationId
                ? {
                  ...item,
                  msg: "Tin nhắn đã bị xóa",
                  latestMessage: message,
                  updatedAt: item?.updatedAt || message?.createdAt,
                }
                : item,
            ),
          ),
        );
      };

      const handleFriendRemoved = (payload: any) => {
        const removedFriendId = String(payload?.data?.friendId || "");
        const removedByUserId = String(payload?.data?.userId || "");

        setConversations((prev) =>
          prev.map((item: any) => {
            if (item.type === "group") return item;

            const partnerId = String(item.partnerId || "");
            const isAffected =
              partnerId &&
              (partnerId === removedFriendId || partnerId === removedByUserId);

            if (!isAffected) return item;

            return {
              ...item,
              friendshipStatus: "rejected",
              canSendMessage: false,
              msg: item.msg || "Chỉ có thể xem lại cuộc trò chuyện trước đó",
            };
          }),
        );
      };

      const handleConversationUpdated = (payload: any) => {
        const conversation = payload?.data || payload?.group || payload;
        if (!conversation?._id) {
          loadConversations();
          return;
        }

        const normalized = normalizeConversation(conversation);
        setConversations((prev) =>
          dedupeConversations([normalized, ...prev]),
        );
      };

      const handleGroupDissolved = (payload: any) => {
        const group = payload?.group || payload?.data || null;
        const dissolvedConversationId = String(
          payload?.conversationId || group?._id || "",
        );

        if (!dissolvedConversationId) {
          loadConversations();
          return;
        }

        setConversations((prev) =>
          dedupeConversations(
            prev.map((item: any) =>
              String(item.conversationId) === dissolvedConversationId
                ? {
                  ...item,
                  raw: group || item.raw,
                  isActive: false,
                  msg: "Nhóm đã giải tán",
                  updatedAt: new Date().toISOString(),
                }
                : item,
            ),
          ),
        );
      };

      const handleTyping = (payload: any) => {
        const typingConversationId = String(payload?.conversationId || "");
        const typingUserId = String(payload?.userId || "");
        if (!typingConversationId || typingUserId === String(myId)) return;

        if (typingTimersRef.current[typingConversationId]) {
          clearTimeout(typingTimersRef.current[typingConversationId]);
        }

        setConversations((prev) =>
          prev.map((item: any) =>
            String(item.conversationId) === typingConversationId
              ? {
                  ...item,
                  isTyping: Boolean(payload?.isTyping),
                  typingText: payload?.isTyping ? "Dang nhap..." : "",
                }
              : item,
          ),
        );

        if (payload?.isTyping) {
          typingTimersRef.current[typingConversationId] = setTimeout(() => {
            setConversations((prev) =>
              prev.map((item: any) =>
                String(item.conversationId) === typingConversationId
                  ? { ...item, isTyping: false, typingText: "" }
                  : item,
              ),
            );
            delete typingTimersRef.current[typingConversationId];
          }, 2500);
        }
      };

      socket.off("conversation_created");
      socket.off("conversation_updated");
      socket.off("group_created");
      socket.off("group_dissolved");
      socket.off("newMessage_global");
      socket.off("message_edited");
      socket.off("message_deleted");
      socket.off("friend_removed");
      socket.off("typing");

      socket.on("conversation_created", handleConversationCreated);
      socket.on("conversation_updated", handleConversationUpdated);
      socket.on("group_created", handleConversationUpdated);
      socket.on("group_dissolved", handleGroupDissolved);
      socket.on("newMessage_global", handleNewMessageGlobal);
      socket.on("message_edited", handleMessageEdited);
      socket.on("message_deleted", handleMessageDeleted);
      socket.on("friend_removed", handleFriendRemoved);
      socket.on("typing", handleTyping);
    };

    bindRealtime();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      const socket = getSocket();
      socket?.off("conversation_created");
      socket?.off("conversation_updated");
      socket?.off("group_created");
      socket?.off("group_dissolved");
      socket?.off("newMessage_global");
      socket?.off("message_edited");
      socket?.off("message_deleted");
      socket?.off("friend_removed");
      socket?.off("typing");
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
    };
  }, [getSenderId, loadConversations, myId, normalizeConversation]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((c: any) => {
      return (
        c.name.toLowerCase().includes(q) || c.msg.toLowerCase().includes(q)
      );
    });
  }, [keyword, conversations]);

  const openCreateGroupModal = async () => {
    setShowCreateGroupModal(true);
    setGroupName("");
    setSelectedFriendIds([]);
    setLoadingFriends(true);

    const res = await getFriendsAPI();
    setFriends(res?.success && Array.isArray(res.data) ? res.data : []);
    setLoadingFriends(false);
  };

  const toggleSelectedFriend = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Thông báo", "Nhập tên nhóm");
      return;
    }

    if (selectedFriendIds.length === 0) {
      Alert.alert("Thông báo", "Chọn ít nhất 1 thành viên");
      return;
    }

    setCreatingGroup(true);
    const res = await createGroupAPI({
      name: groupName.trim(),
      memberIds: selectedFriendIds,
    });
    setCreatingGroup(false);

    if (!res?.success) {
      Alert.alert("Lỗi", res?.message || "Không thể tạo nhóm");
      return;
    }

    const group = res.data;
    setShowCreateGroupModal(false);
    await loadConversations();

    if (group?._id) {
      router.push({
        pathname: "/group/[id]",
        params: {
          id: group._id,
          conversationId: group._id,
          name: group.name || groupName.trim(),
          avatar: group.avatar || "",
          type: "group",
        },
      } as any);
    }
  };

  const renderFriendOption = ({ item }: any) => {
    const friendId =
      item?.friendInfo?._id || item?.user?._id || item?._id || item?.id;
    if (!friendId) return null;

    const selected = selectedFriendIds.includes(String(friendId));
    const displayName =
      item?.friendInfo?.fullName ||
      item?.user?.fullName ||
      item?.fullName ||
      item?.username ||
      "Người dùng";
    const avatar =
      item?.friendInfo?.avatar ||
      item?.user?.avatar ||
      item?.avatar ||
      "https://i.pravatar.cc/150?img=12";

    return (
      <TouchableOpacity
        style={styles.friendOption}
        onPress={() => toggleSelectedFriend(String(friendId))}
      >
        <Image source={{ uri: avatar }} style={styles.friendOptionAvatar} />
        <Text style={styles.friendOptionName} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkboxText}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  // const renderItem = ({ item }: any) => (
  //   <TouchableOpacity
  //     onPress={() =>
  //       router.push({
  //         pathname: "/chat/[id]",
  //         params: {
  //           id: item.conversationId,
  //           conversationId: item.conversationId,
  //           name: item.name,
  //           avatar: item.img,
  //           type: item.type,
  //           partnerId: item.partnerId, // Truyền userId của người kia để tiện cho việc gọi video, nếu là nhóm thì truyền conversationId cũng được vì bên CallScreen sẽ không cần lấy thông tin người kia nữa
  //         },
  //       })
  //     }
  //     style={styles.chatItem}
  //   >
  //     <Image source={{ uri: item.img }} style={styles.avatar} />

  //     <View style={{ flex: 1 }}>
  //       <Text style={styles.name} numberOfLines={1}>
  //         {item.name}
  //       </Text>
  //       <Text style={styles.msg} numberOfLines={1}>
  //         {item.msg}
  //       </Text>
  //     </View>
  //   </TouchableOpacity>
  // );
  const renderItem = ({ item }: any) => {
    // 👉 Kiểm tra loại cuộc trò chuyện để quyết định màn hình đích
    const targetPath = item.type === "group" ? "/group/[id]" : "/chat/[id]";
    return (
      <TouchableOpacity
        onPressIn={() =>
          setConversations((prev) =>
            prev.map((conversation: any) =>
              String(conversation.conversationId) === String(item.conversationId)
                ? { ...conversation, unreadCount: 0, isTyping: false, typingText: "" }
                : conversation,
            ),
          )
        }
        onPress={() =>
          router.push({
            pathname: targetPath,
            params: {
              id: item.conversationId,
              conversationId: item.conversationId,
              name: item.name,
              avatar: item.img,
              type: item.type,
              friendshipStatus: item.friendshipStatus,
              canSendMessage: String(item.canSendMessage),
              partnerDeleted: String(item.partnerDeleted),
              isActive: String(item.isActive),
              // partnerId chỉ thực sự cần cho chat 1-1 để gọi điện
              partnerId: item.partnerId,
            },
          } as any) // Thêm 'as any' để tránh lỗi TypeScript cảnh báo dynamic route của Expo
        }
        style={styles.chatItem}
      >
        <Image source={{ uri: item.img }} style={styles.avatar} />

        <View style={{ flex: 1 }}>
          <Text style={[styles.name, item.unreadCount > 0 && styles.unreadName]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text
            style={[
              styles.msg,
              item.isTyping && styles.typingMsg,
              item.unreadCount > 0 && styles.unreadMsg,
            ]}
            numberOfLines={1}
          >
            {item.isTyping ? item.typingText || "Dang nhap..." : item.msg}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopSearchBar
        value={keyword}
        onChangeText={setKeyword}
        placeholder="Tìm kiếm cuộc trò chuyện"
        onPressAddFriend={openCreateGroupModal}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.id)}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không có cuộc trò chuyện nào</Text>
        }
      />

      <Modal
        visible={showCreateGroupModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.groupSheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Tạo nhóm</Text>
              <TouchableOpacity onPress={handleCreateGroup} disabled={creatingGroup}>
                {creatingGroup ? (
                  <ActivityIndicator size="small" color="#0d6efd" />
                ) : (
                  <Text
                    style={[
                      styles.createText,
                      selectedFriendIds.length > 0 && groupName.trim()
                        ? styles.createTextActive
                        : null,
                    ]}
                  >
                    Tạo
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Tên nhóm"
              placeholderTextColor="#9ca3af"
              style={styles.groupNameInput}
            />

            {loadingFriends ? (
              <ActivityIndicator
                size="large"
                color="#0d6efd"
                style={{ marginTop: 24 }}
              />
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item: any, index) =>
                  String(
                    item?.friendInfo?._id ||
                    item?.user?._id ||
                    item?._id ||
                    item?.id ||
                    index,
                  )
                }
                renderItem={renderFriendOption}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Bạn chưa có bạn bè để tạo nhóm</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginLeft: 78,
  },
  chatItem: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  name: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 16,
  },
  msg: {
    color: "#6b7280",
    marginTop: 4,
  },
  unreadName: {
    color: "#0f172a",
  },
  unreadMsg: {
    color: "#111827",
    fontWeight: "700",
  },
  typingMsg: {
    color: "#0d6efd",
    fontStyle: "italic",
    fontWeight: "700",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 10,
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 15,
    marginTop: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  groupSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: "75%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sheetTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "700",
  },
  cancelText: {
    color: "#6b7280",
    fontSize: 16,
  },
  createText: {
    color: "#9ca3af",
    fontSize: 16,
    fontWeight: "700",
  },
  createTextActive: {
    color: "#0d6efd",
  },
  groupNameInput: {
    marginHorizontal: 16,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#111827",
    fontSize: 16,
  },
  friendOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
  friendOptionAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  friendOptionName: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#0d6efd",
    borderColor: "#0d6efd",
  },
  checkboxText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingWrapper: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 15,
  },
});
