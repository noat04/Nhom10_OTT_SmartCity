import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

// Fake data (sau này thay bằng API)
const users = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    img: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: "2",
    name: "Trần Thị B",
    img: "https://i.pravatar.cc/150?img=2",
  },
];

export default function ChatDetail() {
  const { id } = useLocalSearchParams();

  const user = users.find((u) => u.id === id);

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    { from: "them", text: "Xin chào" },
  ]);

  const send = () => {
    if (!message) return;

    setChat([...chat, { from: "me", text: message }]);
    setMessage("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 15,
          backgroundColor: "#0d6efd",
        }}
      >
        <Image
          source={{ uri: user?.img }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: 10,
          }}
        />

        <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
          {user?.name}
        </Text>
      </View>

      {/* MESSAGES */}
      <FlatList
        data={chat}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 10 }}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: item.from === "me" ? "row-reverse" : "row",
              alignItems: "flex-end",
              marginBottom: 10,
            }}
          >
            {/* Avatar người nhận */}
            {item.from !== "me" && (
              <Image
                source={{ uri: user?.img }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  marginRight: 5,
                }}
              />
            )}

            {/* Bubble */}
            <View
              style={{
                backgroundColor:
                  item.from === "me" ? "#0d6efd" : "#e4e6eb",
                padding: 10,
                borderRadius: 15,
                maxWidth: "70%",
              }}
            >
              <Text
                style={{
                  color: item.from === "me" ? "white" : "black",
                }}
              >
                {item.text}
              </Text>
            </View>
          </View>
        )}
      />

      {/* INPUT */}
      <View
        style={{
          flexDirection: "row",
          padding: 10,
          borderTopWidth: 1,
          borderColor: "#ddd",
          backgroundColor: "#fff",
        }}
      >
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn..."
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 20,
            paddingHorizontal: 10,
            marginRight: 10,
          }}
        />

        <TouchableOpacity
          onPress={send}
          style={{
            backgroundColor: "#0d6efd",
            paddingHorizontal: 15,
            justifyContent: "center",
            borderRadius: 20,
          }}
        >
          <Text style={{ color: "white" }}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
