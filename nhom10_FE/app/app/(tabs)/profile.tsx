import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/authContext";
import { updateAvatarAPI, updateMeAPI } from "../../service/user.api";
import { getSocket } from "../../socket/socket";

export interface IUser {
  _id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
}

interface UserUpdatedEvent {
  user: IUser;
}
export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("user_updated", async (data: UserUpdatedEvent) => {
      console.log("🔥 USER UPDATED:", data);

      setUser((prev: IUser | null) => {
        if (!prev || data.user._id !== prev._id) return prev;
        return data.user;
      });

      await AsyncStorage.setItem("user", JSON.stringify(data.user));
    });

    return () => socket.off("user_updated");
  }, []);

  // 🔥 chưa có user
  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  // 🔥 upload avatar
  const pickImage = async () => {
    if (!editing) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      try {
        setLoading(true);

        const asset = result.assets[0];

        const formData = new FormData();
        formData.append("avatar", {
          uri: asset.uri,
          name: "avatar.jpg",
          type: "image/jpeg",
        } as any);

        const res = await updateAvatarAPI(formData);

        const updatedUser = res.data.user || res.data.data;

        // 🔥 update context (KHÔNG mất data)
        setUser({
          ...user,
          ...updatedUser,
        });

        alert("Cập nhật avatar thành công");
      } catch (err) {
        console.log(err);
        alert("Upload avatar thất bại");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChange = (key: string, value: string) => {
    setUser({
      ...user,
      [key]: value,
    });
  };

  // 🔥 update profile
  const handleUpdate = async () => {
    if (editing) {
      try {
        setLoading(true);

        const payload = {
          fullName: user.fullName,
          phone: user.phone,
          bio: user.bio,
        };

        const res = await updateMeAPI(payload);

        const updatedUser = res.data.user || res.data.data;

        // 🔥 merge user (FIX mất data)
        setUser({
          ...user,
          ...updatedUser,
        });

        alert("Cập nhật thành công");
      } catch (err) {
        console.log(err);
        alert("Cập nhật thất bại");
      } finally {
        setLoading(false);
      }
    }

    setEditing(!editing);
  };

  // 🔥 logout
  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </View>
      </View>

      {/* AVATAR */}
      <View style={styles.avatarWrapper}>
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={{
              uri: user.avatar || "https://i.pravatar.cc/150?img=5",
            }}
            style={styles.avatar}
          />
          {editing && (
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={18} color="white" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.name}>{user.fullName || "Chưa có tên"}</Text>
      </View>

      {/* FORM */}
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Họ và tên</Text>
          <TextInput
            value={user.fullName || ""}
            editable={editing}
            onChangeText={(text) => handleChange("fullName", text)}
            style={[styles.input, !editing && styles.disabled]}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={user.email || ""}
            editable={false}
            style={[styles.input, styles.disabled]}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            value={user.phone || ""}
            editable={editing}
            onChangeText={(text) => handleChange("phone", text)}
            style={[styles.input, !editing && styles.disabled]}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={user.bio || ""}
            editable={editing}
            onChangeText={(text) => handleChange("bio", text)}
            style={[styles.input, !editing && styles.disabled]}
          />
        </View>
      </View>

      {/* UPDATE */}
      <TouchableOpacity style={styles.btn} onPress={handleUpdate}>
        <Text style={styles.btnText}>
          {editing ? "Lưu cập nhật" : "Cập nhật"}
        </Text>
      </TouchableOpacity>

      {/* LOGOUT */}
      <TouchableOpacity
        style={[styles.btn, styles.logoutBtn]}
        onPress={handleLogout}
      >
        <Text style={styles.btnText}>Đăng xuất</Text>
      </TouchableOpacity>

      {loading && (
        <Text style={{ textAlign: "center", marginTop: 10 }}>
          Đang xử lý...
        </Text>
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

  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#00000088",
    padding: 5,
    borderRadius: 15,
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
