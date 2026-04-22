import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { resetPasswordAPI } from "../../service/auth.api";

export default function ResetPassword() {
  const router = useRouter();
  const { email, otp } = useLocalSearchParams();

  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword) {
      alert("Nhập mật khẩu mới");
      return;
    }

    try {
      setLoading(true);

      await resetPasswordAPI({
        email,
        otp,
        newPassword,
      });

      alert("✅ Đổi mật khẩu thành công");

      router.replace("/(auth)/login");
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Đặt lại mật khẩu</Text>

      <TextInput
        placeholder="Mật khẩu mới"
        secureTextEntry
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <TouchableOpacity style={styles.btn} onPress={handleReset}>
        <Text style={{ color: "white" }}>
          {loading ? "Đang xử lý..." : "Xác nhận"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
  },
  btn: {
    backgroundColor: "#0d6efd",
    padding: 12,
    alignItems: "center",
    borderRadius: 5,
  },
};
