import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

const data = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    msg: "Hello",
    img: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: "2",
    name: "Trần Thị B",
    msg: "Ok nha",
    img: "https://i.pravatar.cc/150?img=2",
  },
];

export default function ChatScreen() {
  const router = useRouter();

  const [keyword, setKeyword] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [phone, setPhone] = useState("");

  const filtered = data.filter((c) =>
    c.name.toLowerCase().includes(keyword.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 10,
        }}
      >
        {/* Search */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: 10,
            alignItems: "center",
          }}
        >
          <Ionicons name="search" size={18} color="gray" />
          <TextInput
            placeholder="Tìm kiếm..."
            style={{ flex: 1, marginLeft: 5 }}
            value={keyword}
            onChangeText={setKeyword}
          />
        </View>

        {/* Add button */}
        <TouchableOpacity onPress={() => setShowMenu(true)}>
          <Ionicons name="add" size={28} style={{ marginLeft: 10 }} />
        </TouchableOpacity>
      </View>

      {/* LIST CHAT */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: "#eee", marginLeft: 70 }} />
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/chat/${item.id}`)}
            style={{
              flexDirection: "row",
              padding: 15,
              alignItems: "center",
            }}
          >
            <Image
              source={{ uri: item.img }}
              style={{ width: 50, height: 50, borderRadius: 25 }}
            />

            <View style={{ marginLeft: 10 }}>
              <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
              <Text style={{ color: "gray" }}>{item.msg}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* MENU POPUP */}
      <Modal transparent visible={showMenu} animationType="fade">
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "#00000055",
            justifyContent: "flex-start",
            alignItems: "flex-end",
          }}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={{
              backgroundColor: "white",
              marginTop: 60,
              marginRight: 10,
              borderRadius: 8,
              padding: 10,
              width: 160,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setShowMenu(false);
                setShowAddFriend(true);
              }}
            >
              <Text style={{ padding: 10 }}>➕ Thêm bạn</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={{ padding: 10 }}>👥 Tạo nhóm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ADD FRIEND POPUP */}
      <Modal transparent visible={showAddFriend} animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "#00000055",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 10,
              width: "80%",
            }}
          >
            <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
              Thêm bạn
            </Text>

            <TextInput
              placeholder="Nhập số điện thoại..."
              value={phone}
              onChangeText={setPhone}
              style={{
                borderWidth: 1,
                padding: 10,
                borderRadius: 5,
                marginBottom: 10,
              }}
            />

            <TouchableOpacity
              style={{
                backgroundColor: "#0d6efd",
                padding: 10,
                borderRadius: 5,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "white" }}>Thêm bạn</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowAddFriend(false)}>
              <Text style={{ textAlign: "center" }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
