import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/authContext";
import {
  loginVerifyOtpAPI,
  registerVerifyOtpAPI,
  verifyResetOtpAPI,
} from "../../service/auth.api";

export default function Otp() {
  const router = useRouter();

  // ✅ CHỈ GIỮ 1 LẦN
  const { email, password, fullName, username, phone, type } =
    useLocalSearchParams();

  const [otp, setOtp] = useState("");
  const { login } = useAuth();

  // const handleVerify = async () => {
  //   if (!otp) {
  //     alert("Nhập OTP");
  //     return;
  //   }

  //   try {
  //     // ================= LOGIN =================
  //     if (String(type) === "login") {
  //       const res = await loginVerifyOtpAPI({ email, otp });

  //       await login(res.data.token);
  //       router.replace("/(tabs)/chat");
  //     }

  //     // ================= REGISTER =================
  //     else if (String(type) === "register") {
  //       await registerVerifyOtpAPI({
  //         email,
  //         otp,
  //         password,
  //         fullName,
  //         username,
  //         phone,
  //       });

  //       alert("🎉 Đăng ký thành công");
  //       router.replace("/(auth)/login");
  //     }

  //     // ================= RESET PASSWORD =================
  //     else if (String(type) === "reset") {
  //       await verifyResetOtpAPI({ email, otp });

  //       router.push({
  //         pathname: "/(auth)/reset-password",
  //         params: { email, otp },
  //       });
  //     }
  //   } catch (err) {
  //     alert(err.response?.data?.message || "Sai OTP");
  //   }
  // };
  const handleVerify = async () => {
    if (!otp) {
      alert("Nhập OTP");
      return;
    }

    try {
      const typeStr = String(type);

      // ================= LOGIN =================
      if (typeStr === "login") {
        console.log("🔥 VERIFY LOGIN OTP");

        const res = await loginVerifyOtpAPI({ email, otp });

       await login(res.data.token, res.data.user);

        router.replace("/(tabs)/chat");
      }

      // ================= REGISTER =================
      else if (typeStr === "register") {
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
      } else {
        console.log("❌ TYPE INVALID:", type);
        alert("Lỗi type OTP");
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
            : "OTP đăng nhập"}
      </Text>

      <TextInput
        placeholder="OTP"
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
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
