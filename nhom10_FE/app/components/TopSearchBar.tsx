import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onPressAddFriend?: () => void;
};

export default function TopSearchBar({
  value,
  onChangeText,
  placeholder = "Tìm kiếm",
  onPressAddFriend,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#cfd3dc" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8d93a1"
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.addButton} onPress={onPressAddFriend}>
        <Ionicons name="person-add-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: "#111827",
    fontSize: 16,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});
