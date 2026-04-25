import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  registerVerifyOtpAPI,
  verifyResetOtpAPI,
} from "../../service/auth.api";

export default function Otp() {
  const router = useRouter();

  const { email, password, fullName, username, phone, type } =
    useLocalSearchParams();

  const [otp, setOtp] = useState("");

  const handleVerify = async () => {
    if (!otp) {
      alert("Nhập OTP");
      return;
    }

    try {
      const typeStr = String(type);

      // ================= REGISTER =================
      if (typeStr === "register") {
        await registerVerifyOtpAPI({
          email,
          otp,
          password,
          fullName,
          username,
          phone,
        });

        alert("🎉 Đăng ký thành công");
        router.replace("/(auth)/login");
      }

      // ================= RESET PASSWORD =================
      else if (typeStr === "reset") {
        await verifyResetOtpAPI({ email, otp });

        router.push({
          pathname: "/(auth)/reset-password",
          params: { email, otp },
        });
      }

      // ❌ LOGIN OTP ĐÃ BỊ XOÁ
      else {
        console.log("❌ TYPE INVALID:", type);
        alert("Chức năng OTP này không tồn tại");
      }

    } catch (err) {
      console.log("❌ VERIFY ERROR:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Sai OTP");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        {type === "register"
          ? "OTP đăng ký"
          : type === "reset"
            ? "OTP reset mật khẩu"
            : "OTP"}
      </Text>

      <TextInput
        placeholder="OTP"
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.btn} onPress={handleVerify}>
        <Text style={{ color: "white" }}>Xác nhận</Text>
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