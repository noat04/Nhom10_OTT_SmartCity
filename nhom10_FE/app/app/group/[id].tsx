import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import {
    deleteMessageAPI,
    editMessageAPI,
    getGroupInfoAPI,
    getMessagesAPI,
    getPinnedMessagesAPI,
    getPresignedUrlAPI,
    pinMessageAPI,
    reactMessageAPI,
    searchMessagesAPI,
    sendMessageAPI,
} from "../../service/chat.api";
import { getSocket } from "../../socket/socket";

type Reaction = { userId: any; type: string };

type Message = {
    _id: string;
    conversationId: string;
    senderId: any;
    content: string;
    type?: string;
    systemType?: string;
    fileUrl?: string;
    fileName?: string;
    createdAt?: string;
    status?: string;
    reactions?: Reaction[];
    replyTo?: Message;
    isDeleted?: boolean;
};

const emojiMap: Record<string, string> = {
    like: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢", angry: "😡",
};

export default function GroupChatDetail() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams();
    const conversationId = Array.isArray(id) ? id[0] : id;

    const [myId, setMyId] = useState<string | null>(null);
    const [groupInfo, setGroupInfo] = useState<any>(null);

    const [message, setMessage] = useState("");
    const [chat, setChat] = useState<Message[]>([]);
    const [typing, setTyping] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [isSending, setIsSending] = useState(false);
    const [activeReactionId, setActiveReactionId] = useState<string | null>(null);

    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // States cho tính năng Search, Pin, Reply, Edit
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);

    const [highlightId, setHighlightId] = useState<string | null>(null);
    const messageIndexMap = useRef<{ [key: string]: number }>({});

    const [replyMessage, setReplyMessage] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);

    useEffect(() => {
        const map: any = {};
        chat.forEach((msg, index) => {
            map[msg._id] = index;
        });
        messageIndexMap.current = map;
    }, [chat]);

    // ================= LOAD DATA BAN ĐẦU =================
    useEffect(() => {
        const loadInitData = async () => {
            const userRaw = await AsyncStorage.getItem("user");
            if (userRaw) {
                const user = JSON.parse(userRaw);
                setMyId(user?._id || user?.id || null);
            }

            if (conversationId) {
                const infoRes = await getGroupInfoAPI(conversationId);
                if (infoRes?.success) setGroupInfo(infoRes.data || infoRes);

                const pinRes = await getPinnedMessagesAPI(conversationId);
                if (pinRes?.success) setPinnedMessages(pinRes.data?.pinnedMessages || pinRes.data || []);
            }
        };
        loadInitData();
    }, [conversationId]);

    // ================= DEBOUNCE TÌM KIẾM TIN NHẮN =================
    useEffect(() => {
        if (!isSearching) return;

        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim()) {
                setIsSearchLoading(true);
                const res = await searchMessagesAPI(conversationId, searchQuery);
                setSearchResults(res?.success ? res.data : []);
                setIsSearchLoading(false);
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, isSearching, conversationId]);

    // ================= LOAD LỊCH SỬ TIN NHẮN =================
    const loadMessages = async () => {
        if (!conversationId) return;
        const res = await getMessagesAPI(conversationId, null);

        if (res?.success) {
            const fetchedMsgs = res.data?.messages || res.data || [];
            const messagesArray = Array.isArray(fetchedMsgs) ? fetchedMsgs : [];
            setChat(messagesArray.reverse());
            setNextCursor(res.data?.nextCursor || null);
            setHasMore(res.data?.hasMore || false);
        } else {
            Alert.alert("Lỗi", res?.message || "Không thể tải tin nhắn");
        }
    };

    useEffect(() => { loadMessages(); }, [conversationId]);

    const loadMoreMessages = async () => {
        if (!hasMore || isLoadingMore || !nextCursor) return;
        setIsLoadingMore(true);
        const res = await getMessagesAPI(conversationId, nextCursor);

        if (res?.success) {
            const olderMessages = res.data?.messages || res.data || [];
            if (Array.isArray(olderMessages) && olderMessages.length > 0) {
                setChat((prev) => {
                    const uniqueOlderMessages = olderMessages.filter(
                        (oldMsg) => !prev.some((pMsg) => pMsg._id === oldMsg._id)
                    );
                    return [...prev, ...uniqueOlderMessages.reverse()];
                });
                setNextCursor(res.data?.nextCursor || null);
                setHasMore(res.data?.hasMore || false);
            } else {
                setHasMore(false);
            }
        }
        setIsLoadingMore(false);
    };

    // ================= SOCKET REALTIME =================
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !conversationId) return;

        socket.emit("joinConversation", conversationId);

        const handleNewMessage = (msg: Message) => {
            const id = typeof msg.conversationId === "object" ? (msg.conversationId as any)._id : msg.conversationId;
            if (String(id) !== String(conversationId)) return;

            setChat((prev) => {
                if (prev.some((m) => m._id === msg._id)) return prev;
                return [msg, ...prev];
            });
        };

        const handleReaction = (updatedMsg: Message) => {
            setChat((prev) => prev.map((m) => String(m._id) === String(updatedMsg._id) ? { ...m, reactions: updatedMsg.reactions } : m));
        };

        const handleSeen = ({ userId }: { userId: string }) => {
            setChat((prev) => prev.map((m) => {
                const sender = typeof m.senderId === "object" ? m.senderId._id : m.senderId;
                return String(sender) === String(myId) ? { ...m, status: "seen" } : m;
            }));
        };

        const handleTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
            if (userId !== myId) setTyping(isTyping);
        };

        const handleMessagePinned = (updatedConversation: any) => {
            setPinnedMessages(updatedConversation?.pinnedMessages || []);
        };

        const handleEdit = (updatedMsg: Message) => {
            setChat(prev =>
                prev.map(m =>
                    m._id === updatedMsg._id ? { ...m, content: updatedMsg.content } : m
                )
            );
        };

        const handleDelete = (msgId: string) => {
            setChat(prev =>
                prev.map(m =>
                    m._id === msgId ? { ...m, isDeleted: true } : m
                )
            );
        };

        const handleGroupInfoUpdated = () => {
            getGroupInfoAPI(conversationId).then(res => {
                if (res.success) setGroupInfo(res.data);
            });
        };

        socket.on("newMessage", handleNewMessage);
        socket.on("message_reaction", handleReaction);
        socket.on("message_seen", handleSeen);
        socket.on("typing", handleTyping);
        socket.on("message_pinned", handleMessagePinned);
        socket.on("message_edited", handleEdit);
        socket.on("message_deleted", handleDelete);
        socket.on("group_info_updated", handleGroupInfoUpdated);

        return () => {
            socket.emit("leaveConversation", conversationId);
            socket.off("newMessage", handleNewMessage);
            socket.off("message_reaction", handleReaction);
            socket.off("message_seen", handleSeen);
            socket.off("typing", handleTyping);
            socket.off("message_pinned", handleMessagePinned);
            socket.off("message_edited", handleEdit);
            socket.off("message_deleted", handleDelete);
            socket.off("group_info_updated", handleGroupInfoUpdated);
        };
    }, [conversationId, myId]);

    // ================= ACTIONS =================
    const handleEditMessage = async (msg: Message) => {
        setActiveReactionId(null);
        setEditingMessage(msg);
        setMessage(msg.content);
    };

    const handleSaveEdit = async () => {
        if (!editingMessage) return;
        const res = await editMessageAPI({ messageId: editingMessage._id, content: message });
        if (res?.success) {
            setChat(prev => prev.map(m => m._id === editingMessage._id ? { ...m, content: message } : m));
            setEditingMessage(null);
            setMessage("");
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        setActiveReactionId(null);
        const res = await deleteMessageAPI({ messageId: msgId });
        if (res?.success) {
            setChat(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: true } : m));
        }
    };

    const scrollToMessage = async (messageId: string) => {
        let index = messageIndexMap.current[messageId];

        if (index === undefined) {
            while (hasMore) {
                await loadMoreMessages();
                index = messageIndexMap.current[messageId];
                if (index !== undefined) break;
            }
        }

        if (index !== undefined && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
            setHighlightId(messageId);
            setTimeout(() => { setHighlightId(null); }, 2000);
        }
    };

    const handlePickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
        if (!result.canceled) {
            const asset = result.assets[0];
            setSelectedFile({ uri: asset.uri, type: asset.type === "video" ? "video" : "image", name: asset.fileName || `upload_${Date.now()}.${asset.uri.split('.').pop()}`, mimeType: asset.mimeType || "image/jpeg" });
        }
    };

    const handlePickDocument = async () => {
        let result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
        if (!result.canceled) {
            const asset = result.assets[0];
            setSelectedFile({ uri: asset.uri, type: "file", name: asset.name, mimeType: asset.mimeType || "application/octet-stream" });
        }
    };

    const send = async () => {
        if (editingMessage) return handleSaveEdit();
        if (!message.trim() && !selectedFile) return;
        setIsSending(true);
        let finalFileUrl = null;
        let msgType = "text";

        try {
            if (selectedFile) {
                msgType = selectedFile.type;
                const presignedRes = await getPresignedUrlAPI({ fileName: selectedFile.name, fileType: selectedFile.mimeType });
                if (!presignedRes?.success) { Alert.alert("Lỗi", "Không tạo được URL upload"); setIsSending(false); return; }

                const { presignedUrl, fileUrl } = presignedRes.data;
                const response = await fetch(selectedFile.uri);
                const blob = await response.blob();
                await fetch(presignedUrl, { method: "PUT", body: blob, headers: { "Content-Type": selectedFile.mimeType } });
                finalFileUrl = fileUrl;
            }

            const res = await sendMessageAPI({
                conversationId,
                content: message.trim() || `[Đã gửi ${msgType}]`,
                type: msgType,
                fileUrl: finalFileUrl,
                fileName: selectedFile?.name,
                replyTo: replyMessage?._id || null,
            });

            if (!res?.success) Alert.alert("Lỗi", res?.message || "Gửi tin nhắn thất bại");
            else {
                setMessage("");
                setSelectedFile(null);
                setReplyMessage(null);
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
        } catch (error) {
            console.log("Lỗi upload/gửi:", error); Alert.alert("Lỗi", "Quá trình gửi thất bại");
        } finally { setIsSending(false); }
    };

    const handleSelectReaction = async (msgId: string, type: string) => {
        setActiveReactionId(null);
        setChat((prev) =>
            prev.map((msg) => {
                if (msg._id === msgId) {
                    const currentReactions = msg.reactions || [];
                    const myExisting = currentReactions.find((r) => String(typeof r.userId === "object" ? r.userId._id : r.userId) === String(myId));
                    let newReactions = [...currentReactions];
                    if (myExisting) {
                        if (myExisting.type === type) {
                            newReactions = newReactions.filter((r) => String(typeof r.userId === "object" ? r.userId._id : r.userId) !== String(myId));
                        } else {
                            myExisting.type = type;
                        }
                    } else {
                        newReactions.push({ userId: myId, type });
                    }
                    return { ...msg, reactions: newReactions };
                }
                return msg;
            })
        );
        await reactMessageAPI({ messageId: msgId, type: type });
    };

    const handleTogglePin = async (msgId: string) => {
        setActiveReactionId(null);
        const res = await pinMessageAPI({ conversationId, messageId: msgId });
        if (res?.success) {
            setPinnedMessages(res.data?.pinnedMessages || []);
        } else {
            Alert.alert("Lỗi", "Thao tác ghim thất bại");
        }
    };

    const handleReplyMessage = (item: Message) => {
        setReplyMessage(item);
        setActiveReactionId(null);
    };

    // ================= HELPERS & RENDER =================
    const formatTime = (dateString?: string) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getMessageSnippet = (msg?: Message | null) => {
        if (!msg) return "";
        if (msg.type === "image") return "[Hình ảnh]";
        if (msg.type === "video") return "[Video]";
        if (msg.type === "file") return `[Tệp] ${msg.fileName || ""}`;
        return msg.content;
    };

    const handleOpenFile = (url?: string) => { if (url) Linking.openURL(url).catch(() => Alert.alert("Lỗi", "Không thể mở file.")); };

    const renderMessageContent = (item: Message, isMe: boolean) => {
        if (item.isDeleted) return <Text style={{ color: "#888", fontStyle: 'italic' }}>Tin nhắn đã thu hồi</Text>;
        switch (item.type) {
            case "image":
                // Lọc rỗng: Nếu fileUrl bị rỗng thì lấy ảnh Placeholder mặc định
                const safeImgUrl = (item.fileUrl && String(item.fileUrl).trim() !== "")
                    ? item.fileUrl
                    : "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png";

                return (
                    <TouchableOpacity onPress={() => handleOpenFile(safeImgUrl)}>
                        <Image
                            source={{ uri: safeImgUrl }}
                            style={{ width: 220, height: 300, borderRadius: 12, backgroundColor: '#f0f0f0' }}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                );
            case "video": return <TouchableOpacity onPress={() => handleOpenFile(item.fileUrl)} style={{ width: 200, height: 150, backgroundColor: '#000', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="play-circle" size={50} color="rgba(255,255,255,0.8)" /><Text style={{ color: '#fff', fontSize: 12, marginTop: 5 }}>Video</Text></TouchableOpacity>;
            case "file": return <TouchableOpacity onPress={() => handleOpenFile(item.fileUrl)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isMe ? "rgba(255,255,255,0.2)" : "#f3f4f6", padding: 10, borderRadius: 8, maxWidth: 220 }}><View style={{ width: 40, height: 40, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}><Ionicons name="document-text" size={24} color="#0d6efd" /></View><View style={{ flex: 1 }}><Text style={{ color: isMe ? "#fff" : "#111", fontWeight: '500' }} numberOfLines={1}>{item.fileName || "Tài liệu"}</Text><Text style={{ color: isMe ? "#e0e0e0" : "#666", fontSize: 12 }}>Nhấn để mở</Text></View></TouchableOpacity>;
            default: return <Text style={{ color: isMe ? "white" : "#111827", fontSize: 16, lineHeight: 22 }}>{item.content}</Text>;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#e2e8f0" }} edges={["top", "bottom"]}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

                {/* HEADER VÀ TÌM KIẾM */}
                <View style={styles.header}>
                    {isSearching ? (
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(""); }} style={{ padding: 5 }}>
                                <Ionicons name="chevron-back" size={26} color="#111" />
                            </TouchableOpacity>
                            <TextInput
                                autoFocus
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Tìm kiếm tin nhắn..."
                                style={{ flex: 1, backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8, fontSize: 15 }}
                            />
                        </View>
                    ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, justifyContent: "space-between" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                <TouchableOpacity onPress={() => router.back()} style={{ padding: 5, marginRight: 5 }}>
                                    <Ionicons name="chevron-back" size={26} color="#111" />
                                </TouchableOpacity>
                                <Image source={{ uri: groupInfo?.avatar || "https://i.pravatar.cc/150" }} style={styles.headerAvatar} />
                                <View>
                                    <Text style={styles.headerName} numberOfLines={1}>{groupInfo?.name || "Nhóm Chat"}</Text>
                                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{groupInfo?.members?.length || 0} thành viên</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: "row", gap: 15, alignItems: "center" }}>
                                <TouchableOpacity onPress={() => setIsSearching(true)}>
                                    <Ionicons name="search" size={24} color="#0d6efd" />
                                </TouchableOpacity>

                                {/* 👉 NÚT CÀI ĐẶT NHÓM THAY CHO NÚT GỌI ĐIỆN */}
                                <TouchableOpacity onPress={() => alert("Mở màn hình cài đặt nhóm")}>
                                    <Ionicons name="information-circle-outline" size={28} color="#0d6efd" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* THANH HIỂN THỊ TIN NHẮN GHIM */}
                {!isSearching && pinnedMessages?.length > 0 && (
                    <View style={styles.pinnedBar}>
                        <Ionicons name="pin" size={20} color="#0d6efd" />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={{ fontWeight: "bold", fontSize: 13, color: "#111827" }}>Tin nhắn đã ghim</Text>
                            <Text style={{ fontSize: 13, color: "#4b5563" }} numberOfLines={1}>
                                {getMessageSnippet(pinnedMessages[pinnedMessages.length - 1]?.message)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* KẾT QUẢ TÌM KIẾM HOẶC KHUNG CHAT */}
                {isSearching ? (
                    <View style={{ flex: 1, backgroundColor: "#fff" }}>
                        {isSearchLoading ? (
                            <ActivityIndicator size="large" color="#0d6efd" style={{ marginTop: 20 }} />
                        ) : (
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item._id}
                                getItemLayout={(data, index) => ({ length: 80, offset: 80 * index, index })}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                renderItem={({ item }) => {
                                    const senderName = typeof item.senderId === "object" ? item.senderId.fullName : "Người dùng";

                                    // 👉 SỬA AVATAR TÌM KIẾM TẠI ĐÂY
                                    const rawAvatarUrl = typeof item.senderId === "object" ? item.senderId.avatar : null;
                                    const avatarUrl = (rawAvatarUrl && String(rawAvatarUrl).trim() !== "")
                                        ? rawAvatarUrl
                                        : "https://i.pravatar.cc/150";

                                    return (
                                        <TouchableOpacity
                                            style={styles.searchResultItem}
                                            onPress={() => {
                                                setIsSearching(false);
                                                setTimeout(() => { scrollToMessage(item._id); }, 300);
                                            }}>
                                            <Image source={{ uri: avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontWeight: "bold", fontSize: 15, color: "#111" }}>{senderName}</Text>
                                                <Text style={{ fontSize: 14, color: "#555", marginTop: 2 }} numberOfLines={2}>{item.content}</Text>
                                                <Text style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{formatTime(item.createdAt)}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={searchQuery.trim() ? <Text style={{ textAlign: "center", marginTop: 20, color: "#888" }}>Không tìm thấy kết quả</Text> : null}
                            />
                        )}
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={chat}
                        keyExtractor={(item, index) => item._id ? String(item._id) : `msg-${index}`}
                        inverted={true}
                        onEndReached={loadMoreMessages}
                        onEndReachedThreshold={0.2}
                        ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color="#0d6efd" style={{ margin: 20 }} /> : null}
                        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        renderItem={({ item }) => {
                            const senderId = typeof item.senderId === "object" ? item.senderId._id : item.senderId;
                            const senderName = typeof item.senderId === "object" ? item.senderId.fullName : "Thành viên";

                            // 👉 SỬA AVATAR BONG BÓNG CHAT TẠI ĐÂY
                            const rawSenderAvatar = typeof item.senderId === "object" ? item.senderId.avatar : null;
                            const senderAvatar = (rawSenderAvatar && String(rawSenderAvatar).trim() !== "")
                                ? rawSenderAvatar
                                : "https://i.pravatar.cc/150";

                            const isMe = String(senderId) === String(myId);
                            const isReactionActive = activeReactionId === item._id;
                            const isPinned = pinnedMessages.some(p => String(p.message?._id) === String(item._id));

                            // 🔴 XỬ LÝ TIN NHẮN HỆ THỐNG
                            if (item.type === "system") {
                                return (
                                    <View style={styles.systemMsgContainer}>
                                        <Text style={styles.systemMsgText}>
                                            <Text style={{ fontWeight: 'bold', color: '#555' }}>{senderName}</Text> {item.content}
                                        </Text>
                                    </View>
                                );
                            }

                            // 🟢 TIN NHẮN CHAT BÌNH THƯỜNG
                            return (
                                <View style={{ marginBottom: 16, zIndex: isReactionActive ? 100 : 1, elevation: isReactionActive ? 100 : 1 }}>
                                    {isReactionActive && (
                                        <View style={[styles.reactionPopupWrapper, isMe ? { alignItems: 'flex-end', marginRight: 8 } : { alignItems: 'flex-start', marginLeft: 38 }]}>
                                            <View style={styles.reactionPopup}>
                                                {Object.entries(emojiMap).map(([key, icon]) => (
                                                    <TouchableOpacity key={key} style={{ padding: 6, marginHorizontal: 2 }} onPress={() => handleSelectReaction(item._id, key)}>
                                                        <Text style={{ fontSize: 28 }}>{icon}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>

                                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleReplyMessage(item)}>
                                                    <Ionicons name="arrow-undo" size={16} color="#fff" />
                                                    <Text style={styles.actionBtnText}>Trả lời</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleTogglePin(item._id)}>
                                                    <Ionicons name="pin" size={16} color="#fff" />
                                                    <Text style={styles.actionBtnText}>{isPinned ? "Bỏ ghim" : "Ghim"}</Text>
                                                </TouchableOpacity>

                                                {isMe && !item.isDeleted && (
                                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditMessage(item)}>
                                                        <Ionicons name="create" size={16} color="#fff" />
                                                        <Text style={styles.actionBtnText}>Sửa</Text>
                                                    </TouchableOpacity>
                                                )}

                                                {isMe && !item.isDeleted && (
                                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteMessage(item._id)}>
                                                        <Ionicons name="trash" size={16} color="#fff" />
                                                        <Text style={styles.actionBtnText}>Xóa</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    )}

                                    <View style={{ flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", width: '100%' }}>
                                        {!isMe && <Image source={{ uri: senderAvatar }} style={styles.messageAvatar} />}

                                        <View style={{ position: 'relative', marginLeft: isMe ? 0 : 8, marginRight: isMe ? 8 : 0, maxWidth: "75%" }}>

                                            {/* 👉 HIỂN THỊ TÊN NGƯỜI GỬI NẾU KHÔNG PHẢI LÀ MÌNH */}
                                            {!isMe && (
                                                <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, marginLeft: 4 }}>
                                                    {senderName}
                                                </Text>
                                            )}

                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onLongPress={() => setActiveReactionId(prev => prev === item._id ? null : item._id)}
                                                style={{
                                                    backgroundColor: highlightId === item._id ? "#fde68a" : isMe ? "#0d6efd" : "#ffffff",
                                                    padding: item.type === "text" ? 12 : 6,
                                                    borderRadius: 18,
                                                    borderBottomRightRadius: isMe ? 4 : 18,
                                                    borderBottomLeftRadius: !isMe ? 4 : 18,
                                                    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
                                                }}
                                            >
                                                {item.replyTo && (
                                                    <TouchableOpacity activeOpacity={0.8} onPress={() => scrollToMessage(item.replyTo._id)}>
                                                        <View style={[styles.repliedBubble, { backgroundColor: isMe ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.05)" }]}>
                                                            <Text style={{ fontWeight: "bold", fontSize: 12, color: isMe ? "#fff" : "#111" }}>
                                                                <Ionicons name="arrow-undo" size={12} /> {item.replyTo?.senderId?.fullName || "Người dùng"}
                                                            </Text>
                                                            <Text numberOfLines={1} style={{ fontSize: 12, color: isMe ? "#e0e0e0" : "#666", marginTop: 2 }}>
                                                                {getMessageSnippet(item.replyTo)}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                )}

                                                {renderMessageContent(item, isMe)}
                                                <Text style={{ fontSize: 11, color: isMe ? "rgba(255,255,255,0.7)" : "#999", alignSelf: 'flex-end', marginTop: 4 }}>{formatTime(item.createdAt)}</Text>
                                            </TouchableOpacity>

                                            {item.reactions && item.reactions.length > 0 && (
                                                <View style={[styles.reactionBadge, isMe ? { right: 0 } : { left: 0 }]}>
                                                    <Text style={{ fontSize: 12 }}>
                                                        {Array.from(new Set(item.reactions.map((r: Reaction) => emojiMap[r.type] || r.type))).join("")} {item.reactions.length > 1 ? ` ${item.reactions.length}` : ""}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        }}
                    />
                )}

                {typing && !isSearching && <Text style={{ marginLeft: 50, color: "#888", marginBottom: 10, fontStyle: 'italic' }}>Ai đó đang nhập...</Text>}

                {/* INPUT AREA */}
                {!isSearching && (
                    <View style={{ backgroundColor: "#ffffff" }}>
                        {replyMessage && (
                            <View style={styles.replyPreviewBox}>
                                <View style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: "#0d6efd", paddingLeft: 8 }}>
                                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#0d6efd' }}>
                                        Đang trả lời {replyMessage?.senderId?.fullName || "tin nhắn"}
                                    </Text>
                                    <Text numberOfLines={1} style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                                        {getMessageSnippet(replyMessage)}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setReplyMessage(null)} style={{ padding: 4 }}>
                                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {selectedFile && (
                            <View style={{ padding: 10, backgroundColor: "#f9fafb", borderTopWidth: 1, borderColor: "#e5e7eb", flexDirection: "row", alignItems: "center" }}>
                                <View style={{ width: 40, height: 40, backgroundColor: "#e5e7eb", borderRadius: 8, justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
                                    {selectedFile.type === "image" ? <Image source={{ uri: selectedFile.uri }} style={{ width: 40, height: 40 }} /> : <Ionicons name={selectedFile.type === "video" ? "videocam" : "document"} size={24} color="#6b7280" />}
                                </View>
                                <Text style={{ flex: 1, marginLeft: 10, fontSize: 13 }} numberOfLines={1}>{selectedFile.name}</Text>
                                <TouchableOpacity onPress={() => setSelectedFile(null)}><Ionicons name="close-circle" size={24} color="#ef4444" /></TouchableOpacity>
                            </View>
                        )}

                        <View style={[styles.inputContainer, { paddingBottom: 10 }]}>
                            <TouchableOpacity style={{ padding: 8 }} onPress={handlePickDocument} disabled={isSending}><Ionicons name="add-circle-outline" size={28} color="#6b7280" /></TouchableOpacity>
                            <TouchableOpacity style={{ padding: 8 }} onPress={handlePickImage} disabled={isSending}><Ionicons name="image-outline" size={26} color="#6b7280" /></TouchableOpacity>
                            <TextInput value={message} onChangeText={(text) => { setMessage(text); getSocket().emit("typing", { conversationId, isTyping: text.length > 0 }); }} placeholder="Tin nhắn" style={styles.textInput} multiline editable={!isSending} />
                            <TouchableOpacity onPress={send} style={{ padding: 8 }} disabled={(!message.trim() && !selectedFile) || isSending}>
                                {isSending ? <ActivityIndicator size="small" color="#0d6efd" /> : <Ionicons name="send" size={24} color={(message.trim() || selectedFile) ? "#0d6efd" : "#9ca3af"} />}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 12, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
    headerAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
    headerName: { color: "#111827", fontWeight: "700", fontSize: 17, flex: 1 },
    messageAvatar: { width: 30, height: 30, borderRadius: 15 },
    inputContainer: { flexDirection: "row", alignItems: "flex-end", padding: 8, backgroundColor: "#ffffff", borderTopWidth: 0, borderColor: "#e5e7eb" },
    textInput: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 20, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, fontSize: 16, maxHeight: 100, marginLeft: 4, marginRight: 4 },

    reactionPopupWrapper: { marginBottom: 8, zIndex: 999, elevation: 5 },
    reactionPopup: { backgroundColor: '#ffffff', borderRadius: 30, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
    reactionBadge: { position: 'absolute', bottom: -10, backgroundColor: '#ffffff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },

    actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4b5563', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 },
    actionBtnText: { color: "#fff", marginLeft: 4, fontWeight: "600", fontSize: 13 },

    pinnedBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0fdf4", paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#e5e7eb" },
    searchResultItem: { flexDirection: "row", paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },

    replyPreviewBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: "#e5e7eb" },
    repliedBubble: { padding: 8, borderRadius: 8, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: "rgba(255,255,255,0.5)" },

    // System Message Styles
    systemMsgContainer: { alignItems: 'center', marginVertical: 15 },
    systemMsgText: { fontSize: 12, color: '#6b7280', backgroundColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, overflow: 'hidden', textAlign: 'center', maxWidth: '85%' },
});