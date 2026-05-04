import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../context/authContext";
import { NotificationProvider } from "../context/notificationContext";
import { getSocket } from "../socket/socket"; // Import socket của bạn
export default function RootLayout() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(false);
  // 👉 BỔ SUNG USEEFFECT NÀY VÀO LAYOUT TỔNG
  // 👉 BỔ SUNG CƠ CHẾ ĐỢI SOCKET KẾT NỐI VÀO LAYOUT TỔNG
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let boundSocket: any = null;

    const bindIncomingCall = () => {
      const socket = getSocket();

      // Nếu socket chưa sẵn sàng, đợi 500ms rồi thử lại
      if (!socket) {
        retryTimer = setTimeout(bindIncomingCall, 500);
        return;
      }

      boundSocket = socket;

      const handleIncomingCall = (data: any) => {
        console.log("🔥 APP ĐÃ NHẬN ĐƯỢC CUỘC GỌI TỚI:", data);
        router.push({
          pathname: "/call/IncomingCall",
          params: {
            callId: data.callId,
            conversationId: data.conversationId,
            callerId: data.caller._id,
            callerName: data.caller.fullName || data.caller.username,
            callerAvatar: data.caller.avatar,
            callType: data.type
          }
        } as any);
      };

      // Đảm bảo không bị gắn trùng lặp 2 lần
      socket.off("call_incoming", handleIncomingCall);
      socket.on("call_incoming", handleIncomingCall);
    };

    // Bắt đầu quá trình gắn socket
    bindIncomingCall();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (boundSocket) {
        boundSocket.off("call_incoming");
      }
    };
  }, []);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {!isLogin ? (
              <>
                <Stack.Screen name="(auth)/login" />
                <Stack.Screen name="(auth)/register" />
              </>
            ) : (
              <>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="chat/[id]" />
                {/* 🔥 CALL */}
                <Stack.Screen
                  name="call/CallScreen"
                  options={{
                    presentation: "fullScreenModal",
                    animation: "fade",
                  }}
                />

                <Stack.Screen
                  name="call/IncomingCall"
                  options={{
                    presentation: "transparentModal",
                    animation: "fade",
                  }}
                />

                {/* 👉 THÊM MÀN HÌNH CHAT AI VÀO ĐÂY */}
                <Stack.Screen
                  name="ai/[id]"
                  options={{ headerShown: true, title: 'Trợ lý AI', headerBackTitle: 'Quay lại' }}
                />
              </>
            )}
          </Stack>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
