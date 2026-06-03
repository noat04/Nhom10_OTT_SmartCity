import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/authContext";
import {
  deleteMeAPI,
  updateAvatarAPI,
  updateMeAPI,
  updatePasswordAPI,
} from "../../service/user.api";
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

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
  }, [setUser]);

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

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

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Thong bao", "Vui long nhap day du thong tin mat khau");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Thong bao", "Mat khau moi va xac nhan mat khau khong khop");
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await updatePasswordAPI({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res?.data?.success === false) {
        throw new Error(res?.data?.message || "Doi mat khau that bai");
      }

      setShowPasswordModal(false);
      resetPasswordForm();
      Alert.alert("Thanh cong", res?.data?.message || "Doi mat khau thanh cong");
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Doi mat khau that bai";
      Alert.alert("Loi", message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Xoa tai khoan",
      "Tai khoan se bi khoa va nguoi khac se khong the nhan tin voi ban. Ban co chac chan muon tiep tuc?",
      [
        { text: "Huy", style: "cancel" },
        {
          text: "Xoa",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const res = await deleteMeAPI();

              if (res?.data?.success === false) {
                throw new Error(res?.data?.message || "Xoa tai khoan that bai");
              }

              await logout();
              router.replace("/(auth)/login");
            } catch (err: any) {
              const message =
                err?.response?.data?.message ||
                err?.message ||
                "Xoa tai khoan that bai";
              Alert.alert("Loi", message);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
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
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 5, marginRight: 5 }}>
            <Ionicons name="chevron-back" size={26} color="white" />
          </TouchableOpacity>
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

      <TouchableOpacity
        style={[styles.btn, styles.passwordBtn]}
        onPress={() => setShowPasswordModal(true)}
        disabled={loading}
      >
        <Text style={styles.btnText}>Doi mat khau</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.deleteBtn]}
        onPress={handleDeleteAccount}
        disabled={loading}
      >
        <Text style={styles.btnText}>Xoa tai khoan</Text>
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
      <Modal
        visible={showPasswordModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowPasswordModal(false);
          resetPasswordForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Doi mat khau</Text>

            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Mat khau hien tai"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              style={styles.passwordInput}
            />

            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Mat khau moi"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              style={styles.passwordInput}
            />

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Xac nhan mat khau moi"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              style={styles.passwordInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowPasswordModal(false);
                  resetPasswordForm();
                }}
                disabled={passwordLoading}
              >
                <Text style={styles.cancelBtnText}>Huy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleUpdatePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.btnText}>Luu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  passwordBtn: { backgroundColor: "#2563eb" },

  deleteBtn: { backgroundColor: "#b91c1c" },

  btnText: { color: "white", fontWeight: "bold" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 18,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
    textAlign: "center",
  },

  passwordInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
    color: "#111827",
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },

  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  cancelBtn: { backgroundColor: "#f3f4f6" },

  confirmBtn: { backgroundColor: "#0d6efd" },

  cancelBtnText: { color: "#374151", fontWeight: "700" },
});
