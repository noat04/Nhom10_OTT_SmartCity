import { Stack } from "expo-router";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../context/authContext";
import { NotificationProvider } from "../context/notificationContext";
export default function RootLayout() {
  const [isLogin, setIsLogin] = useState(false);

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
              </>
            )}
          </Stack>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
