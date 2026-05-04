import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import TopSearchBar from "../../components/TopSearchBar";
import { useAuth } from "../../context/authContext";
import { getConversationsAPI } from "../../service/chat.api";
import { getSocket } from "../../socket/socket";
export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const myId = user?._id || user?.id;

  const getPreviewText = (message) => {
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

  const normalizeConversation = useCallback(
    (item) => {
      const isGroup = item?.type === "group";

      let displayName = "Cuộc trò chuyện";
      let displayAvatar = "https://i.pravatar.cc/150?img=12";

      if (isGroup) {
        displayName = item?.name?.trim() || "Nhóm chat";
        displayAvatar =
          item?.avatar?.trim() || "https://i.pravatar.cc/150?img=12";
      } else {
        const otherMember = item?.members?.find(
          (m) => String(m?.user?._id || m?.user) !== String(myId),
        );

        displayName =
          otherMember?.user?.fullName ||
          otherMember?.user?.name ||
          otherMember?.user?.username ||
          "Người dùng";

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
        msg: getPreviewText(latestMessage),
        updatedAt:
          latestMessage?.createdAt ||
          item?.updatedAt ||
          item?.createdAt ||
          new Date().toISOString(),
        latestMessage,
        raw: item,
      };
    },
    [myId],
  );

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);

      const res = await getConversationsAPI();

      if (!res?.success) {
        setConversations([]);
        return;
      }

      const normalized = (res?.data || [])
        .map(normalizeConversation)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      setConversations(normalized);
    } catch (error) {
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

      const normalized = (res?.data || [])
        .map(normalizeConversation)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      setConversations(normalized);
    } catch (error) {
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
    if (!myId) return;

    let retryTimer;

    const bindRealtime = () => {
      const socket = getSocket();

      if (!socket) {
        retryTimer = setTimeout(bindRealtime, 250);
        return;
      }

      const handleConversationCreated = (payload) => {
        const conversation = payload?.data || payload;
        if (!conversation?._id) return;

        const normalized = normalizeConversation(conversation);

        setConversations((prev) => {
          const exists = prev.some(
            (item) =>
              String(item.conversationId) === String(normalized.conversationId),
          );

          if (exists) return prev;

          return [normalized, ...prev];
        });
      };

      const handleNewMessageGlobal = (message) => {
        if (!message?.conversationId) return;

        const incomingConversationId = String(
          message?.conversationId?._id || message?.conversationId,
        );

        setConversations((prev) => {
          const existingIndex = prev.findIndex(
            (item) => String(item.conversationId) === incomingConversationId,
          );

          if (existingIndex === -1) {
            // chỉ giữ cho case tin nhắn tới từ room chưa từng có trong state
            return prev;
          }

          const updatedItem = {
            ...prev[existingIndex],
            msg: getPreviewText(message),
            latestMessage: message,
            updatedAt: message?.createdAt || new Date().toISOString(),
          };

          const newList = [...prev];
          newList.splice(existingIndex, 1);
          newList.unshift(updatedItem);

          return newList;
        });
      };

      const handleMessageEdited = (message) => {
        if (!message?.conversationId) return;

        const editedConversationId = String(
          message?.conversationId?._id || message?.conversationId,
        );

        setConversations((prev) =>
          prev.map((item) =>
            String(item.conversationId) === editedConversationId
              ? {
                ...item,
                msg: getPreviewText(message),
                latestMessage: message,
              }
              : item,
          ),
        );
      };

      const handleMessageDeleted = (message) => {
        if (!message?.conversationId) return;

        const deletedConversationId = String(
          message?.conversationId?._id || message?.conversationId,
        );

        setConversations((prev) =>
          prev.map((item) =>
            String(item.conversationId) === deletedConversationId
              ? {
                ...item,
                msg: "Tin nhắn đã bị xóa",
                latestMessage: message,
              }
              : item,
          ),
        );
      };

      socket.off("conversation_created");
      socket.off("newMessage_global");
      socket.off("message_edited");
      socket.off("message_deleted");

      socket.on("conversation_created", handleConversationCreated);
      socket.on("newMessage_global", handleNewMessageGlobal);
      socket.on("message_edited", handleMessageEdited);
      socket.on("message_deleted", handleMessageDeleted);
    };

    bindRealtime();

    return () => {
      clearTimeout(retryTimer);
      const socket = getSocket();
      socket?.off("conversation_created");
      socket?.off("newMessage_global");
      socket?.off("message_edited");
      socket?.off("message_deleted");
    };
  }, [myId, normalizeConversation]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) || c.msg.toLowerCase().includes(q)
      );
    });
  }, [keyword, conversations]);

  const handleAddFriend = () => {
    router.push("/(tabs)/contacts");
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/chat/[id]",
          params: {
            id: item.conversationId,
            conversationId: item.conversationId,
            name: item.name,
            avatar: item.img,
            type: item.type,
          },
        })
      }
      style={styles.chatItem}
    >
      <Image source={{ uri: item.img }} style={styles.avatar} />

      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.msg} numberOfLines={1}>
          {item.msg}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
        onPressAddFriend={handleAddFriend}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không có cuộc trò chuyện nào</Text>
        }
      />
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
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 15,
    marginTop: 30,
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
