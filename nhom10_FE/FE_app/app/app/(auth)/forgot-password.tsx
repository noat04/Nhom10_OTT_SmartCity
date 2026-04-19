import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { forgotPasswordAPI } from "../../service/auth.api";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      alert("Nhập email");
      return;
    }

    try {
      setLoading(true);

      await forgotPasswordAPI(email);

      alert("📩 OTP đã gửi!");

      router.push({
        pathname: "/(auth)/otp",
        params: {
          email,
          type: "reset", // 🔥 phân biệt flow
        },
      });
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi gửi OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Quên mật khẩu</Text>

      <TextInput
        placeholder="Nhập email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={styles.btn} onPress={handleSendOtp}>
        <Text style={{ color: "white" }}>
          {loading ? "Đang gửi..." : "Gửi OTP"}
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
