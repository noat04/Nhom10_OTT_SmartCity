import { Stack, useRouter } from "expo-router";
import { useEffect } from "react"; // Xóa useState
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/authContext"; // 👉 Import thêm useAuth
import { NotificationProvider } from "../context/notificationContext";
import { getSocket } from "../socket/socket";

// 1. Tách phần điều hướng (Routing) ra một component con để có thể dùng được useAuth()
// Vì useAuth() BẮT BUỘC phải nằm bên trong <AuthProvider>
const RootNavigator = () => {
  const router = useRouter();
  const { user } = useAuth(); // 👉 Lấy trạng thái user thực tế từ Context

  // Cấu hình Socket lắng nghe cuộc gọi
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let boundSocket: any = null;

    const bindIncomingCall = () => {
      const socket = getSocket();

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

      socket.off("call_incoming", handleIncomingCall);
      socket.on("call_incoming", handleIncomingCall);
    };

    bindIncomingCall();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (boundSocket) {
        boundSocket.off("call_incoming");
      }
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* 👉 Dùng user làm điều kiện thay vì biến isLogin tĩnh */}
      {!user ? (
        <>
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/register" />
        </>
      ) : (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="group/[id]" />
          <Stack.Screen
            name="call/CallScreen"
            options={{ presentation: "fullScreenModal", animation: "fade" }}
          />

          <Stack.Screen
            name="call/IncomingCall"
            options={{ presentation: "transparentModal", animation: "fade" }}
          />

          <Stack.Screen
            name="ai/[id]"
            options={{ headerShown: true, title: 'Trợ lý AI', headerBackTitle: 'Quay lại' }}
          />
        </>
      )}
    </Stack>
  );
};

// 2. Component Layout gốc (Bọc Providers ở ngoài cùng)
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          {/* Gọi Navigator ở bên trong để nó có thể truy cập được giá trị của AuthProvider */}
          <RootNavigator />
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}