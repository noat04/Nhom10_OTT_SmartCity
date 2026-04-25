import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useNotification } from "../../context/notificationContext";
// 👉 1. Import useSafeAreaInsets
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { contactBadgeCount } = useNotification();

  // 👉 2. Lấy thông số vùng an toàn của thiết bị hiện tại
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
          // 👉 3. Cộng thêm insets.bottom vào chiều cao và padding đáy
          height: 60 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#0d6efd",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size = 22 }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contact",
          tabBarIcon: ({ color, size = 22 }) => (
            <View style={{ width: size + 14, height: size + 14 }}>
              <Ionicons name="people" size={size} color={color} />
              {contactBadgeCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -4,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: "red",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {contactBadgeCount > 9 ? "9+" : contactBadgeCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          tabBarIcon: ({ color, size = 22 }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}