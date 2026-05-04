import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { registerSendOtpAPI } from "../../service/auth.api";

export default function Register() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // 🔥 VALIDATE
    if (!username || !fullName || !email || !phone || !password) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (password !== confirmPassword) {
      alert("Mật khẩu không khớp");
      return;
    }

    try {
      setLoading(true);

      // 🔥 API chỉ cần email để gửi OTP
      await registerSendOtpAPI({ email });

      alert("📩 OTP đã gửi!");

      // 🔥 chuyển sang OTP + truyền full data
      router.push({
        pathname: "/(auth)/otp",
        params: {
          email,
          password,
          fullName,
          username,
          phone,
          type: "register",
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
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Đăng ký</Text>

      <TextInput
        placeholder="Username"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        placeholder="Họ và tên"
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        placeholder="Số điện thoại"
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Mật khẩu"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        placeholder="Xác nhận mật khẩu"
        secureTextEntry
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity style={styles.btn} onPress={handleRegister}>
        <Text style={{ color: "white" }}>
          {loading ? "Đang gửi..." : "Gửi OTP"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ marginTop: 10 }}>Đã có tài khoản? Đăng nhập</Text>
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
