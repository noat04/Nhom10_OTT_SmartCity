import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { initOneToOneChatAPI } from "../../service/chat.api";
import {
    acceptFriendRequestAPI,
    getFriendProfileAPI,
    rejectFriendRequestAPI,
    sendFriendRequestAPI,
} from "../../service/friend.api";

export default function FriendProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadProfile = async () => {
    if (!id) return;

    setLoading(true);
    const res = await getFriendProfileAPI(String(id));

    if (res?.success) {
      setUser(res.data);
    } else {
      Alert.alert("Lỗi", res?.message || "Không thể tải thông tin người dùng");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const handleSendRequest = async () => {
    if (!user?._id) return;
    setProcessing(true);
    const res = await sendFriendRequestAPI(user._id);

    if (res?.success) {
      Alert.alert("Thành công", res?.message || "Đã gửi lời mời");
      await loadProfile();
    } else {
      Alert.alert("Lỗi", res?.message || "Không thể gửi lời mời");
    }
    setProcessing(false);
  };

  const handleAccept = async () => {
    if (!user?.requestId) return;
    setProcessing(true);
    const res = await acceptFriendRequestAPI(user.requestId);

    if (res?.success) {
      Alert.alert("Thành công", res?.message || "Đã chấp nhận lời mời");
      await loadProfile();
    } else {
      Alert.alert("Lỗi", res?.message || "Không thể chấp nhận");
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!user?.requestId) return;
    setProcessing(true);
    const res = await rejectFriendRequestAPI(user.requestId);

    if (res?.success) {
      Alert.alert("Thành công", res?.message || "Đã từ chối lời mời");
      await loadProfile();
    } else {
      Alert.alert("Lỗi", res?.message || "Không thể từ chối");
    }
    setProcessing(false);
  };

  const handleOpenChat = async () => {
    if (!user?._id) return;

    setProcessing(true);
    const res = await initOneToOneChatAPI(user._id);

    if (!res?.success) {
      Alert.alert("Lỗi", res?.message || "Không thể mở cuộc trò chuyện");
      setProcessing(false);
      return;
    }

    const conversation = res?.data?.conversation || res?.data || null;
    const conversationId =
      conversation?._id ||
      conversation?.conversationId ||
      res?.data?.conversationId;

    if (!conversationId) {
      Alert.alert("Lỗi", "Không lấy được conversationId");
      setProcessing(false);
      return;
    }

    setProcessing(false);

    router.push({
      pathname: "/chat/[id]",
      params: {
        id: String(conversationId),
        name: user.fullName || user.username || "User",
        avatar: user.avatar || "",
        partnerId: user._id,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b5bdb" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Không có dữ liệu người dùng</Text>
      </View>
    );
  }

  const status = user.friendshipStatus || "none";
  const isSender = !!user.isSender;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.topBar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.avatarWrapper}>
        <Image
          source={{
            uri: user.avatar || "https://i.pravatar.cc/150?img=5",
          }}
          style={styles.avatar}
        />

        <Text style={styles.name}>
          {user.fullName || user.username || "User"}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Họ và tên</Text>
          <View style={[styles.input, styles.disabled]}>
            <Text>{user.fullName || user.username || "Chưa có tên"}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.input, styles.disabled]}>
            <Text>{user.email || "Chưa có email"}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Số điện thoại</Text>
          <View style={[styles.input, styles.disabled]}>
            <Text>{user.phone || "Chưa cập nhật"}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <View style={[styles.input, styles.disabled]}>
            <Text>{user.bio || "Chưa cập nhật"}</Text>
          </View>
        </View>
      </View>

      {status === "accepted" ? (
        <TouchableOpacity style={styles.btn} onPress={handleOpenChat}>
          <Text style={styles.btnText}>Nhắn tin</Text>
        </TouchableOpacity>
      ) : status === "pending" ? (
        isSender ? (
          <View style={[styles.btn, { backgroundColor: "#ffc107" }]}>
            <Text style={styles.btnText}>Đã gửi lời mời</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.btn} onPress={handleAccept}>
              <Text style={styles.btnText}>
                {processing ? "Đang xử lý..." : "Đồng ý"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.logoutBtn]}
              onPress={handleReject}
            >
              <Text style={styles.btnText}>
                {processing ? "Đang xử lý..." : "Từ chối"}
              </Text>
            </TouchableOpacity>
          </>
        )
      ) : (
        <TouchableOpacity style={styles.btn} onPress={handleSendRequest}>
          <Text style={styles.btnText}>
            {processing ? "Đang gửi..." : "Gửi lời mời kết bạn"}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    backgroundColor: "#3b5bdb",
    height: 180,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    paddingTop: 50,
    paddingHorizontal: 15,
  },

  topBar: { flexDirection: "row", alignItems: "center" },

  avatarWrapper: { alignItems: "center", marginTop: -60 },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "white",
  },

  name: { marginTop: 10, fontSize: 18, fontWeight: "bold" },

  card: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 15,
    padding: 15,
  },

  field: { marginBottom: 15 },

  label: { fontSize: 13, color: "gray", marginBottom: 5 },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
  },

  disabled: { backgroundColor: "#f0f0f0" },

  btn: {
    backgroundColor: "#0d6efd",
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  logoutBtn: { backgroundColor: "red" },

  btnText: { color: "white", fontWeight: "bold" },
});
