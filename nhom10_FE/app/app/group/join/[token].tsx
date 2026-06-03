import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../../context/authContext";
import { joinGroupByInviteAPI } from "../../../service/chat.api";

export default function JoinGroupByInviteScreen() {
  const { token } = useLocalSearchParams();
  const inviteToken = Array.isArray(token) ? token[0] : token;
  const { user } = useAuth();
  const [joining, setJoining] = useState(true);
  const [message, setMessage] = useState("Dang tham gia nhom...");

  useEffect(() => {
    const joinGroup = async () => {
      if (!inviteToken) {
        setJoining(false);
        setMessage("Link moi nhom khong hop le.");
        return;
      }

      if (!user) {
        setJoining(false);
        setMessage("Vui long dang nhap de tham gia nhom.");
        Alert.alert("Thong bao", "Vui long dang nhap de tham gia nhom.", [
          { text: "Dang nhap", onPress: () => router.replace("/(auth)/login") },
        ]);
        return;
      }

      const res = await joinGroupByInviteAPI(inviteToken);
      setJoining(false);

      if (!res?.success || !res?.data?._id) {
        setMessage(res?.message || "Khong the tham gia nhom bang link nay.");
        Alert.alert("Loi", res?.message || "Khong the tham gia nhom bang link nay.");
        return;
      }

      const group = res.data;
      setMessage("Da tham gia nhom.");
      router.replace({
        pathname: "/group/[id]",
        params: {
          id: group._id,
          conversationId: group._id,
          name: group.name || "Nhom chat",
          avatar: group.avatar || "",
          type: "group",
          isActive: String(group.isActive !== false),
        },
      } as any);
    };

    joinGroup();
  }, [inviteToken, user]);

  return (
    <View style={styles.container}>
      {joining ? (
        <ActivityIndicator size="large" color="#0d6efd" />
      ) : (
        <Ionicons name="link-outline" size={42} color="#0d6efd" />
      )}
      <Text style={styles.title}>{message}</Text>
      {!joining && (
        <TouchableOpacity style={styles.button} onPress={() => router.replace("/")}>
          <Text style={styles.buttonText}>Ve trang chat</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
  },
  title: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 14,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#0d6efd",
    borderRadius: 10,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
