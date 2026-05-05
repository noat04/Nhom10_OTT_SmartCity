import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'; // 👉 Import thêm TextInput
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteAiSessionAPI, getAiSessionsAPI } from '../../service/ai.api';

export default function AiSessionListScreen() {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 👉 State mới cho tìm kiếm
    const [searchQuery, setSearchQuery] = useState('');

    const router = useRouter();
    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            loadSessions();
        }, [])
    );

    const loadSessions = async () => {
        setIsLoading(true);
        try {
            const res = await getAiSessionsAPI();
            if (res?.success) setSessions(res.data || []);
        } catch (error) {
            console.error("Lỗi load sessions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = (sessionId) => {
        Alert.alert("Xóa đoạn chat", "Bạn có chắc chắn muốn xóa cuộc trò chuyện này?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xóa",
                style: "destructive",
                onPress: async () => {
                    const res = await deleteAiSessionAPI(sessionId);
                    if (res?.success) {
                        setSessions(prev => prev.filter(s => s._id !== sessionId));
                    } else {
                        Alert.alert("Lỗi", "Không thể xóa đoạn chat lúc này.");
                    }
                }
            }
        ]);
    };

    const handleOpenChat = (sessionId, title) => {
        router.push({
            pathname: "/ai/[id]",
            params: {
                id: sessionId ? sessionId : "new",
                title: title || "Trợ lý ảo AI"
            }
        });
    };

    // 👉 Hàm lọc danh sách sessions dựa trên searchQuery
    const filteredSessions = sessions.filter(session =>
        (session.title || "Cuộc trò chuyện").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.sessionItem}
            onPress={() => handleOpenChat(item._id, item.title)}
            onLongPress={() => handleDelete(item._id)}
        >
            <View style={styles.iconContainer}>
                <FontAwesome5 name="robot" size={18} color="#fff" />
            </View>
            <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle} numberOfLines={1}>{item.title || "Cuộc trò chuyện"}</Text>
                <Text style={styles.sessionSub}>Trợ lý dịch vụ công</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={{ padding: 5 }}>
                <Ionicons name="trash-outline" size={20} color="#ff4d4f" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitleMain}>Trợ lý ảo AI</Text>
            </View>

            {/* 👉 Ô Tìm kiếm */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm cuộc trò chuyện..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing" // Hiển thị nút 'x' trên iOS
                />
            </View>

            <TouchableOpacity
                style={styles.newChatBtn}
                onPress={() => handleOpenChat(null, "Đoạn chat mới")}
            >
                <View style={[styles.iconContainer, { backgroundColor: '#0284c7' }]}>
                    <Ionicons name="add" size={20} color="#fff" />
                </View>
                <Text style={styles.newChatText}>Đoạn chat mới</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>LỊCH SỬ HÔM NAY</Text>

            {isLoading ? (
                <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    // 👉 Truyền danh sách đã lọc vào FlatList
                    data={filteredSessions}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {searchQuery ? "Không tìm thấy kết quả phù hợp" : "Chưa có lịch sử trò chuyện"}
                        </Text>
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa', paddingHorizontal: 15 },
    header: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#e9ecef', marginBottom: 15 },
    headerTitleMain: { fontSize: 22, fontWeight: 'bold', color: '#212529' },

    // 👉 Styles mới cho thanh tìm kiếm
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e9ecef',
        borderRadius: 10,
        paddingHorizontal: 12,
        marginBottom: 15,
        height: 45,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#212529',
    },

    newChatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#64748b', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    newChatText: { fontSize: 16, fontWeight: 'bold', color: '#0284c7' },
    headerTitle: { fontSize: 12, fontWeight: 'bold', color: '#6c757d', marginBottom: 10, paddingLeft: 5 },
    sessionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10 },
    sessionInfo: { flex: 1, paddingRight: 10 },
    sessionTitle: { fontSize: 15, fontWeight: 'bold', color: '#212529', marginBottom: 3 },
    sessionSub: { fontSize: 12, color: '#6c757d' },
    emptyText: { textAlign: 'center', color: '#adb5bd', marginTop: 20 }
});