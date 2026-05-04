import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotification } from "../../context/notificationContext";
import { initOneToOneChatAPI } from "../../service/chat.api";
import {
  acceptFriendRequestAPI,
  getFriendProfileAPI,
  getFriendRequestsAPI,
  getFriendsAPI,
  rejectFriendRequestAPI,
  removeFriendAPI,
  searchUsersAPI,
  sendFriendRequestAPI,
} from "../../service/friend.api";
import {
  connectSocket,
  offFriendRequestAccepted,
  offFriendRequestReceived,
  offFriendRequestRejected,
  offFriendRequestSent,
  offNewNotification,
  onFriendRequestAccepted,
  onFriendRequestReceived,
  onFriendRequestRejected,
  onFriendRequestSent,
  onNewNotification,
} from "../../socket/socket";

const DEFAULT_AVATAR = "https://i.pravatar.cc/150?img=12";

type TabType = "friends" | "add";

export default function ContactsScreen() {
  const router = useRouter();
  const { setContactBadgeCount } = useNotification();

  const [activeTab, setActiveTab] = useState<TabType>("friends");

  const [friendKeyword, setFriendKeyword] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);

  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [processingId, setProcessingId] = useState("");
  const [sendingId, setSendingId] = useState("");

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [emailSearch, setEmailSearch] = useState("");
  const [loadingSearchUser, setLoadingSearchUser] = useState(false);
  const [searchedUser, setSearchedUser] = useState<any | null>(null);

  const getAvatar = (item: any) => {
    return item?.avatar && String(item.avatar).trim()
      ? item.avatar
      : DEFAULT_AVATAR;
  };

  const loadFriends = async () => {
    setLoadingFriends(true);
    const res = await getFriendsAPI();

    if (res?.success) {
      setFriends(Array.isArray(res.data) ? res.data : []);
    } else {
      setFriends([]);
    }

    setLoadingFriends(false);
  };

  const loadRequests = async (clearBadge = false) => {
    setLoadingRequests(true);
    const res = await getFriendRequestsAPI();

    const received =
      res?.success && Array.isArray(res?.data?.received)
        ? res.data.received
        : [];
    const sent =
      res?.success && Array.isArray(res?.data?.sent) ? res.data.sent : [];

    setReceivedRequests(received);
    setSentRequests(sent);

    if (clearBadge) {
      setContactBadgeCount(0);
    } else {
      setContactBadgeCount(received.length);
    }

    setLoadingRequests(false);
  };

  const refreshAllData = async (clearBadge = false) => {
    await Promise.all([loadFriends(), loadRequests(clearBadge)]);
  };

  useFocusEffect(
    useCallback(() => {
      refreshAllData(true);
    }, []),
  );

  useEffect(() => {
    let cleanup: null | (() => void) = null;
    let retryTimer: any = null;

    const attachListeners = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const socket = connectSocket(token);
      if (!socket) {
        retryTimer = setTimeout(attachListeners, 300);
        return;
      }

      const handleRequestReceived = async () => {
        await refreshAllData(false);
      };

      const handleOtherUpdate = async () => {
        await refreshAllData(false);
      };

      onFriendRequestReceived(handleRequestReceived);
      onFriendRequestSent(handleOtherUpdate);
      onFriendRequestAccepted(handleOtherUpdate);
      onFriendRequestRejected(handleOtherUpdate);
      onNewNotification(handleOtherUpdate);

      cleanup = () => {
        offFriendRequestReceived(handleRequestReceived);
        offFriendRequestSent(handleOtherUpdate);
        offFriendRequestAccepted(handleOtherUpdate);
        offFriendRequestRejected(handleOtherUpdate);
        offNewNotification(handleOtherUpdate);
      };
    };

    attachListeners();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (cleanup) cleanup();
    };
  }, []);

  const filteredFriends = useMemo(() => {
    const q = friendKeyword.trim().toLowerCase();
    if (!q) return friends;

    return friends.filter((item) => {
      const name = (item.fullName || item.username || "").toLowerCase();
      const email = (item.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [friends, friendKeyword]);

  const friendSections = useMemo(() => {
    const sortedFriends = [...filteredFriends].sort((a, b) => {
      const nameA = (a.fullName || a.username || "").trim().toLowerCase();
      const nameB = (b.fullName || b.username || "").trim().toLowerCase();
      return nameA.localeCompare(nameB, "vi");
    });

    const groups: Record<string, any[]> = {};

    sortedFriends.forEach((item) => {
      const name = (item.fullName || item.username || "#").trim();
      const firstChar = name.charAt(0).toUpperCase();
      const title = /[A-ZÀ-Ỹ]/i.test(firstChar) ? firstChar : "#";

      if (!groups[title]) groups[title] = [];
      groups[title].push(item);
    });

    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, "vi"))
      .map((key) => ({
        title: key,
        data: groups[key],
      }));
  }, [filteredFriends]);

  const handleFindUserByEmail = async () => {
    if (!emailSearch.trim()) {
      Alert.alert("Thông báo", "Nhập email cần tìm");
      return;
    }

    setLoadingSearchUser(true);
    const res = await searchUsersAPI(emailSearch.trim());

    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      const exactUser =
        res.data.find(
          (u: any) =>
            String(u.email || "").toLowerCase() ===
            emailSearch.trim().toLowerCase(),
        ) || res.data[0];

      setSearchedUser(exactUser);
    } else {
      setSearchedUser(null);
      Alert.alert("Thông báo", "Không tìm thấy người dùng");
    }

    setLoadingSearchUser(false);
  };

  const handleSendFriendRequest = async (receiverId: string) => {
    setSendingId(receiverId);
    const res = await sendFriendRequestAPI(receiverId);

    if (res?.success) {
      Alert.alert("Thành công", res?.message || "Đã gửi lời mời kết bạn");
      await refreshAllData(true);

      if (searchedUser?._id === receiverId) {
        const detail = await getFriendProfileAPI(receiverId);
        if (detail?.success) {
          setSearchedUser(detail.data);
        }
      }
    } else {
      Alert.alert("Lỗi", res?.message || "Gửi lời mời kết bạn thất bại");
    }

    setSendingId("");
  };

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingId(requestId);
    const res = await acceptFriendRequestAPI(requestId);

    if (res?.success) {
      Alert.alert("Thành công", res?.message || "Đã chấp nhận lời mời");
      await refreshAllData(true);

      if (searchedUser?._id) {
        const detail = await getFriendProfileAPI(searchedUser._id);
        if (detail?.success) setSearchedUser(detail.data);
      }
    } else {
      Alert.alert("Lỗi", res?.message || "Không thể chấp nhận lời mời");
    }

    setProcessingId("");
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    const res = await rejectFriendRequestAPI(requestId);

    if (res?.success) {
      Alert.alert("Thành công", res?.message || "Đã từ chối lời mời");
      await refreshAllData(true);

      if (searchedUser?._id) {
        const detail = await getFriendProfileAPI(searchedUser._id);
        if (detail?.success) setSearchedUser(detail.data);
      }
    } else {
      Alert.alert("Lỗi", res?.message || "Không thể từ chối lời mời");
    }

    setProcessingId("");
  };

  const handleRemoveFriend = async (friendId: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa bạn này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setProcessingId(friendId);
          const res = await removeFriendAPI(friendId);

          if (res?.success) {
            Alert.alert("Thành công", res?.message || "Đã xóa bạn");
            await refreshAllData(true);
          } else {
            Alert.alert("Lỗi", res?.message || "Không thể xóa bạn");
          }

          setProcessingId("");
        },
      },
    ]);
  };

  const handleOpenChat = async (user: any) => {
    try {
      const res = await initOneToOneChatAPI(user._id);

      if (!res?.success) {
        Alert.alert("Lỗi", res?.message || "Không thể mở cuộc trò chuyện");
        return;
      }

      const conversation = res?.data?.conversation || res?.data || null;
      const conversationId =
        conversation?._id ||
        conversation?.conversationId ||
        res?.data?.conversationId;

      if (!conversationId) {
        Alert.alert("Lỗi", "Không lấy được conversationId");
        return;
      }

      router.push({
        pathname: "/chat/[id]",
        params: {
          id: String(conversationId),
          name: user.fullName || user.username || "User",
          avatar: user.avatar || "",
          partnerId: user._id,
        },
      });
    } catch (error) {
      console.log("❌ handleOpenChat:", error);
      Alert.alert("Lỗi", "Không thể mở cuộc trò chuyện");
    }
  };

  const handleOpenProfile = async (userId: string) => {
    router.push({
      pathname: "/friend-profile/[id]",
      params: { id: userId },
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAllData(true);
    setRefreshing(false);
  };

  const renderFriendRow = ({ item }: any) => (
    <TouchableOpacity
      style={styles.friendRow}
      onPress={() => handleOpenProfile(item._id)}
    >
      <View style={styles.friendLeft}>
        <Image source={{ uri: getAvatar(item) }} style={styles.avatar} />
        <Text style={styles.friendName}>
          {item.fullName || item.username || "User"}
        </Text>
      </View>

      <View style={styles.inlineRow}>
        <TouchableOpacity
          style={styles.messageMiniBtn}
          onPress={() => handleOpenChat(item)}
        >
          <Text style={styles.messageMiniBtnText}>Nhắn tin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.removeFriendButton}
          onPress={() => handleRemoveFriend(item._id)}
          disabled={processingId === item._id}
        >
          <Text style={styles.removeFriendButtonText}>
            {processingId === item._id ? "..." : "Xóa"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderReceivedRequestItem = ({ item }: any) => {
    const user = item.userId || {};

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpenProfile(user._id)}
      >
        <View style={styles.userInfo}>
          <Image source={{ uri: getAvatar(user) }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {user.fullName || user.username || "User"}
            </Text>
            <Text style={styles.email}>{user.email || "Không có email"}</Text>
          </View>
        </View>

        <View style={styles.rowButtons}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptRequest(item._id)}
            disabled={processingId === item._id}
          >
            <Text style={styles.acceptButtonText}>
              {processingId === item._id ? "..." : "Đồng ý"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleRejectRequest(item._id)}
            disabled={processingId === item._id}
          >
            <Text style={styles.rejectButtonText}>
              {processingId === item._id ? "..." : "Từ chối"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSentRequestItem = ({ item }: any) => {
    const user = item.friendId || {};

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpenProfile(user._id)}
      >
        <View style={styles.userInfo}>
          <Image source={{ uri: getAvatar(user) }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {user.fullName || user.username || "User"}
            </Text>
            <Text style={styles.email}>{user.email || "Không có email"}</Text>
          </View>
        </View>

        <View style={styles.waitingBadge}>
          <Text style={styles.waitingBadgeText}>Đang chờ</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchedUser = () => {
    if (loadingSearchUser) {
      return (
        <ActivityIndicator
          size="large"
          color="#0068ff"
          style={{ marginTop: 20 }}
        />
      );
    }

    if (!searchedUser) return null;

    const status = searchedUser?.friendshipStatus || "none";
    const isSender = !!searchedUser?.isSender;
    const isLoading = sendingId === searchedUser._id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpenProfile(searchedUser._id)}
      >
        <View style={styles.userInfo}>
          <Image
            source={{ uri: getAvatar(searchedUser) }}
            style={styles.bigAvatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.nameLarge}>
              {searchedUser.fullName || searchedUser.username || "User"}
            </Text>
            <Text style={styles.email}>
              {searchedUser.email || "Không có email"}
            </Text>
            <Text style={styles.infoText}>
              SĐT: {searchedUser.phone || "Chưa cập nhật"}
            </Text>
            <Text style={styles.infoText}>
              Bio: {searchedUser.bio || "Chưa cập nhật"}
            </Text>
          </View>
        </View>

        {status === "accepted" ? (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => handleOpenChat(searchedUser)}
          >
            <Text style={styles.messageButtonText}>Nhắn tin</Text>
          </TouchableOpacity>
        ) : status === "pending" ? (
          isSender ? (
            <View style={styles.waitingBadge}>
              <Text style={styles.waitingBadgeText}>Đã gửi lời mời</Text>
            </View>
          ) : (
            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptRequest(searchedUser.requestId)}
              >
                <Text style={styles.acceptButtonText}>Đồng ý</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRejectRequest(searchedUser.requestId)}
              >
                <Text style={styles.rejectButtonText}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleSendFriendRequest(searchedUser._id)}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? "Đang gửi..." : "Gửi lời mời kết bạn"}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            value={friendKeyword}
            onChangeText={setFriendKeyword}
            placeholder="Tìm bạn bè theo tên hoặc email"
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
          />
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddFriendModal(true)}
        >
          <Ionicons name="person-add-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "friends" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("friends")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "friends" && styles.activeTabText,
            ]}
          >
            Bạn bè
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "add" && styles.activeTab]}
          onPress={() => setActiveTab("add")}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={[
                styles.tabText,
                activeTab === "add" && styles.activeTabText,
              ]}
            >
              Kết bạn
            </Text>

            {activeTab !== "add" && receivedRequests.length > 0 && (
              <View style={styles.innerBadge}>
                <Text style={styles.innerBadgeText}>
                  {receivedRequests.length > 9 ? "9+" : receivedRequests.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === "friends" && (
        <View style={{ flex: 1 }}>
          {loadingFriends ? (
            <ActivityIndicator
              size="large"
              color="#0068ff"
              style={{ marginTop: 20 }}
            />
          ) : (
            <SectionList
              sections={friendSections}
              keyExtractor={(item, index) => item?._id || String(index)}
              renderItem={renderFriendRow}
              renderSectionHeader={({ section: { title } }) => (
                <Text style={styles.sectionHeader}>{title}</Text>
              )}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={
                filteredFriends.length === 0
                  ? styles.emptyListContainer
                  : { paddingBottom: 20 }
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {friendKeyword.trim()
                    ? "Không tìm thấy bạn bè phù hợp"
                    : "Bạn chưa có bạn bè"}
                </Text>
              }
              stickySectionHeadersEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {activeTab === "add" && (
        <FlatList
          data={sentRequests}
          keyExtractor={(item, index) => item?._id || String(index)}
          renderItem={renderSentRequestItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={{ paddingTop: 8 }}>
              {receivedRequests.length > 0 && (
                <Text style={styles.sectionTitle}>Lời mời đã nhận</Text>
              )}

              {loadingRequests ? (
                <ActivityIndicator
                  size="small"
                  color="#0068ff"
                  style={{ marginVertical: 12 }}
                />
              ) : receivedRequests.length > 0 ? (
                receivedRequests.map((item) => (
                  <View key={item._id}>
                    {renderReceivedRequestItem({ item })}
                  </View>
                ))
              ) : null}

              {sentRequests.length > 0 && (
                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
                  Lời mời đã gửi
                </Text>
              )}
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loadingRequests ? (
              <Text style={styles.emptyText}>Chưa có lời mời nào</Text>
            ) : null
          }
        />
      )}

      <Modal
        transparent
        visible={showAddFriendModal}
        animationType="fade"
        onRequestClose={() => setShowAddFriendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tìm bạn bằng email</Text>
              <TouchableOpacity onPress={() => setShowAddFriendModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={emailSearch}
              onChangeText={setEmailSearch}
              placeholder="Nhập email người cần kết bạn"
              placeholderTextColor="#888"
              style={styles.modalInput}
            />

            <TouchableOpacity
              style={styles.modalSearchButton}
              onPress={handleFindUserByEmail}
            >
              <Text style={styles.modalSearchButtonText}>Tìm</Text>
            </TouchableOpacity>

            {renderSearchedUser()}
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: "#111827",
    fontSize: 16,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    backgroundColor: "#f3f4f6",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#0d6efd",
  },
  tabText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 16,
  },
  activeTabText: {
    color: "#111827",
  },
  innerBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "red",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  innerBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  sectionHeader: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  friendLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  bigAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 14,
  },
  friendName: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  messageMiniBtn: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  messageMiniBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  removeFriendButton: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  removeFriendButtonText: {
    color: "#dc2626",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  nameLarge: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 3,
  },
  infoText: {
    color: "#374151",
    fontSize: 13,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: "#0d6efd",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  messageButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  messageButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  rowButtons: {
    flexDirection: "row",
    gap: 10,
  },
  inlineRow: {
    flexDirection: "row",
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  waitingBadge: {
    backgroundColor: "#fef3c7",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  waitingBadgeText: {
    color: "#92400e",
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    marginHorizontal: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 15,
    marginTop: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000055",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  modalSearchButton: {
    backgroundColor: "#0d6efd",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  modalSearchButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
