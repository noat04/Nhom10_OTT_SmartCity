import { Stack } from "expo-router";
import { useState } from "react";
import { AuthProvider } from "../context/authContext";

export default function RootLayout() {
  const [isLogin, setIsLogin] = useState(false);

  return (
    <AuthProvider>
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
    </AuthProvider>
    
  );
}
