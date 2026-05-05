import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements'; // 👉 Lấy chiều cao chuẩn của Header
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'; // 👉 Thêm Stack và useRouter
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askPublicServiceAI, getAiMessagesAPI } from '../../service/ai.api';

export default function AiChatScreen() {
    const { id, title } = useLocalSearchParams();
    const router = useRouter(); // 👉 Khởi tạo router
    const isNew = id === "new";

    const [currentSessionId, setCurrentSessionId] = useState(isNew ? null : id);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const flatListRef = useRef();
    const insets = useSafeAreaInsets();

    // Tính toán chiều cao của Header động để truyền cho KeyboardAvoidingView
    const headerHeight = useHeaderHeight();

    useEffect(() => {
        const loadHistory = async () => {
            if (currentSessionId) {
                setIsLoading(true);
                try {
                    const res = await getAiMessagesAPI(currentSessionId);
                    if (res?.success) {
                        const history = res.data.map(msg => ({
                            _id: msg._id,
                            content: msg.content,
                            isBot: msg.role === 'model',
                        }));
                        setMessages(history);
                    }
                } catch (error) {
                    console.error("Lỗi tải lịch sử AI:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setMessages([{
                    _id: "init",
                    content: "Xin chào! Tôi là Trợ lý Dịch vụ Công. Tôi có thể giúp gì cho bạn hôm nay?",
                    isBot: true
                }]);
            }
        };
        loadHistory();
    }, [id]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput('');

        const newUserMsg = { _id: Date.now().toString(), content: userText, isBot: false };
        setMessages(prev => [...prev, newUserMsg]);
        setIsLoading(true);

        try {
            const res = await askPublicServiceAI(userText, currentSessionId);

            if (!currentSessionId && res?.sessionId) {
                setCurrentSessionId(res.sessionId);
            }

            if (res && res.success) {
                const botMsg = { _id: (Date.now() + 1).toString(), content: res.data, isBot: true };
                setMessages(prev => [...prev, botMsg]);
            } else {
                const errorMsg = { _id: (Date.now() + 1).toString(), content: res?.message || "Hệ thống AI quá tải.", isBot: true };
                setMessages(prev => [...prev, errorMsg]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { _id: (Date.now() + 1).toString(), content: "Lỗi kết nối mạng!", isBot: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            // 👉 SỬA BEHAVIOR: iOS luôn cần 'padding', Android thường hoạt động tốt với 'height' hoặc để undefined
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}

            // 👉 SỬA OFFSET: Trên Android đôi khi cộng thêm headerHeight sẽ bị lệch, nên set cứng hoặc để 0
            keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 90}
        >
            <Stack.Screen
                options={{
                    title: title || 'Trợ lý AI',
                    headerShown: true,
                    headerBackTitleVisible: false,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ padding: 8, marginLeft: -8 }}
                        >
                            <Ionicons name="chevron-back" size={26} color="#0d6efd" />
                        </TouchableOpacity>
                    ),
                    headerStyle: { backgroundColor: '#f8f9fa' },
                    headerTitleStyle: { fontWeight: 'bold' }
                }}
            />

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item._id}
                contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
                // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc khi bàn phím mở lên
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                    const isMe = !item.isBot;
                    return (
                        <View style={[styles.msgWrapper, isMe ? styles.msgRight : styles.msgLeft]}>
                            {!isMe && (
                                <View style={styles.botAvatar}>
                                    <FontAwesome5 name="robot" size={14} color="#fff" />
                                </View>
                            )}
                            <View style={[styles.msgBubble, isMe ? styles.bubbleMe : styles.bubbleBot]}>
                                <Text style={[styles.msgText, isMe ? { color: '#fff' } : { color: '#212529' }]}>
                                    {item.content}
                                </Text>
                            </View>
                        </View>
                    );
                }}
            />

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0284c7" />
                    <Text style={styles.loadingText}>AI đang trả lời...</Text>
                </View>
            )}

            {/* 👉 VÙNG NHẬP LIỆU: Chỉ cộng insets.bottom cho iOS (do có thanh Home Indicator), Android set cứng 10 */}
            <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10 }]}>
                <TextInput
                    style={styles.input}
                    placeholder="Hỏi trợ lý ảo..."
                    value={input}
                    onChangeText={setInput}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!input.trim() || isLoading) && { opacity: 0.5 }]}
                    onPress={handleSend}
                    disabled={!input.trim() || isLoading}
                >
                    <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    msgWrapper: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    msgLeft: { justifyContent: 'flex-start', paddingRight: 50 },
    msgRight: { justifyContent: 'flex-end', paddingLeft: 50 },
    botAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    msgBubble: { padding: 12, borderRadius: 16 },
    bubbleBot: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    bubbleMe: { backgroundColor: '#0d6efd', borderBottomRightRadius: 4 },
    msgText: { fontSize: 15, lineHeight: 22 },
    inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#dee2e6', alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 20, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, maxHeight: 100, fontSize: 16 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0d6efd', justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 2 },
    loadingContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingLeft: 20 },
    loadingText: { marginLeft: 8, color: '#6c757d', fontStyle: 'italic' }
});