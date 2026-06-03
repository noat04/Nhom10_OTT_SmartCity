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
    Modal,
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
    // 👉 IMPORT THÊM 2 HÀM NÀY
    forwardMessageAPI,
    getConversationsAPI,
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
    seenBy?: any[];
};

const emojiMap: Record<string, string> = {
    like: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢", angry: "😡",
};

export default function GroupChatDetail() {
    const insets = useSafeAreaInsets();
    const { id, isActive } = useLocalSearchParams();
    const conversationId = Array.isArray(id) ? id[0] : id;
    const initialIsActive = Array.isArray(isActive) ? isActive[0] : isActive;

    const [myId, setMyId] = useState<string | null>(null);
    const [groupInfo, setGroupInfo] = useState<any>(null);

    const [message, setMessage] = useState("");
    const [chat, setChat] = useState<Message[]>([]);
    const [typing, setTyping] = useState(false);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // 👉 THÊM STATE QUẢN LÝ CHUYỂN TIẾP (FORWARD)
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [messageToForward, setMessageToForward] = useState<Message | null>(null);
    const [conversationsList, setConversationsList] = useState<any[]>([]);
    const [selectedForwardTargets, setSelectedForwardTargets] = useState<string[]>([]);
    const [isForwarding, setIsForwarding] = useState(false);
    const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
    const [groupDissolved, setGroupDissolved] = useState(initialIsActive === "false");

    useEffect(() => {
        const map: any = {};
        chat.forEach((msg, index) => {
            map[msg._id] = index;
        });
        messageIndexMap.current = map;
    }, [chat]);

    const getSenderId = (item: Message) => {
        return typeof item.senderId === "object" ? item.senderId?._id : item.senderId;
    };

    const hasSeenByOthers = (item: Message) => {
        const seenBy = Array.isArray(item.seenBy) ? item.seenBy : [];
        return (
            item.status === "seen" ||
            seenBy.some((seen: any) => {
                const seenUserId =
                    typeof seen?.userId === "object" ? seen.userId?._id : seen?.userId;
                return seenUserId && String(seenUserId) !== String(myId);
            })
        );
    };

    const getLastOwnMessageId = () => {
        return chat.find((item) => String(getSenderId(item)) === String(myId))?._id || null;
    };

    const emitSeen = () => {
        const socket = getSocket();
        if (!socket || !conversationId) return;
        socket.emit("seen", { conversationId });
        socket.emit("group_seen", { conversationId });
    };

    const getMemberUserId = (member: any) => {
        const memberUser = member?.user || member;
        return typeof memberUser === "object" ? memberUser?._id || memberUser?.id : memberUser;
    };

    const onlineMemberCount = Array.isArray(groupInfo?.members)
        ? groupInfo.members.filter((member: any) =>
            onlineUserIds.includes(String(getMemberUserId(member))),
        ).length
        : 0;

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
                if (infoRes?.success) {
                    const group = infoRes.data || infoRes;
                    setGroupInfo(group);
                    setGroupDissolved(group?.isActive === false);
                }

                const pinRes = await getPinnedMessagesAPI(conversationId);
                if (pinRes?.success) setPinnedMessages(pinRes.data?.pinnedMessages || pinRes.data || []);
            }
        };
        loadInitData();
    }, [conversationId]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleOnlineList = (ids: any[]) => {
            setOnlineUserIds(Array.isArray(ids) ? ids.map(String) : []);
        };

        const handleUserOnline = (userId: any) => {
            setOnlineUserIds((prev) => {
                const id = String(userId);
                return prev.includes(id) ? prev : [...prev, id];
            });
        };

        const handleUserOffline = (payload: any) => {
            const offlineUserId =
                typeof payload === "object" ? payload?.userId : payload;
            setOnlineUserIds((prev) =>
                prev.filter((id) => id !== String(offlineUserId)),
            );
        };

        socket.on("online_list", handleOnlineList);
        socket.on("user_online", handleUserOnline);
        socket.on("user_offline", handleUserOffline);
        socket.emit("get_online_users");

        return () => {
            socket.off("online_list", handleOnlineList);
            socket.off("user_online", handleUserOnline);
            socket.off("user_offline", handleUserOffline);
        };
    }, []);

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
            setTimeout(emitSeen, 0);
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
        socket.emit("group_join_room", conversationId);
        socket.emit("seen", { conversationId });
        socket.emit("group_seen", { conversationId });

        const handleNewMessage = (msg: Message) => {
            const id = typeof msg.conversationId === "object" ? (msg.conversationId as any)._id : msg.conversationId;
            if (String(id) !== String(conversationId)) return;

            setChat((prev) => {
                if (prev.some((m) => m._id === msg._id)) return prev;
                return [msg, ...prev];
            });
            if (String(getSenderId(msg)) !== String(myId)) {
                socket.emit("seen", { conversationId });
                socket.emit("group_seen", { conversationId });
            }
        };

        const handleReaction = (updatedMsg: Message) => {
            setChat((prev) => prev.map((m) => String(m._id) === String(updatedMsg._id) ? { ...m, reactions: updatedMsg.reactions } : m));
        };

        const handleSeen = ({ userId, seenMessages }: { userId: string; seenMessages?: Message[] }) => {
            if (Array.isArray(seenMessages) && seenMessages.length > 0) {
                const seenMap = new Map(seenMessages.map((item) => [String(item._id), item]));
                setChat((prev) =>
                    prev.map((m) => {
                        const updated = seenMap.get(String(m._id));
                        return updated ? { ...m, ...updated, status: "seen" } : m;
                    }),
                );
                return;
            }

            setChat((prev) => prev.map((m) => {
                const sender = typeof m.senderId === "object" ? m.senderId._id : m.senderId;
                return String(sender) === String(myId) ? { ...m, status: "seen" } : m;
            }));
        };

        const handleTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
            if (userId === myId) return;

            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
            }

            setTyping(isTyping);

            if (isTyping) {
                typingTimerRef.current = setTimeout(() => {
                    setTyping(false);
                    typingTimerRef.current = null;
                }, 2500);
            }
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

        const handleGroupDissolved = (payload: any) => {
            const dissolvedConversationId = String(payload?.conversationId || payload?.group?._id || "");
            if (dissolvedConversationId && String(dissolvedConversationId) !== String(conversationId)) return;

            setGroupDissolved(true);
            if (payload?.group) setGroupInfo(payload.group);
            setMessage("");
            setSelectedFile(null);
            setReplyMessage(null);
        };

        socket.on("newMessage", handleNewMessage);
        socket.on("message_reaction", handleReaction);
        socket.on("message_seen", handleSeen);
        socket.on("group_message_seen", handleSeen);
        socket.on("typing", handleTyping);
        socket.on("message_pinned", handleMessagePinned);
        socket.on("message_edited", handleEdit);
        socket.on("message_deleted", handleDelete);
        socket.on("group_dissolved", handleGroupDissolved);

        return () => {
            socket.emit("typing", { conversationId, isTyping: false });
            socket.emit("leaveConversation", conversationId);
            socket.emit("group_leave_room", conversationId);
            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
                typingTimerRef.current = null;
            }
            socket.off("newMessage", handleNewMessage);
            socket.off("message_reaction", handleReaction);
            socket.off("message_seen", handleSeen);
            socket.off("group_message_seen", handleSeen);
            socket.off("typing", handleTyping);
            socket.off("message_pinned", handleMessagePinned);
            socket.off("message_edited", handleEdit);
            socket.off("message_deleted", handleDelete);
            socket.off("group_dissolved", handleGroupDissolved);
        };
    }, [conversationId, myId]);

    // ================= CHUYỂN TIẾP TIN NHẮN (FORWARD) =================
    const handleOpenForwardModal = async (msg: Message) => {
        setMessageToForward(msg);
        setActiveReactionId(null); // Đóng menu
        const res = await getConversationsAPI();
        if (res?.success) {
            setConversationsList(res.data);
            setSelectedForwardTargets([]);
            setShowForwardModal(true);
        } else {
            Alert.alert("Lỗi", "Không thể tải danh sách cuộc trò chuyện");
        }
    };

    const toggleForwardTarget = (convId: string) => {
        setSelectedForwardTargets(prev =>
            prev.includes(convId) ? prev.filter(id => id !== convId) : [...prev, convId]
        );
    };

    const submitForwardMessage = async () => {
        if (selectedForwardTargets.length === 0) return Alert.alert("Thông báo", "Vui lòng chọn người nhận!");
        if (!messageToForward) return;

        setIsForwarding(true);
        const res = await forwardMessageAPI({
            originalMessageId: messageToForward._id,
            targetConversationIds: selectedForwardTargets
        });
        setIsForwarding(false);

        if (res?.success) {
            setShowForwardModal(false);
            setMessageToForward(null);
            Alert.alert("Thành công", "Đã chuyển tiếp tin nhắn!");
        } else {
            Alert.alert("Lỗi", res?.message || "Chuyển tiếp thất bại");
        }
    };

    // ================= ACTIONS CƠ BẢN =================
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
        if (groupDissolved) return;
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
        if (!result.canceled) {
            const asset = result.assets[0];
            const sizeCheck = await canUsePickedFile(asset);
            if (!sizeCheck.allowed) return;
            setSelectedFile({ uri: asset.uri, type: asset.type === "video" ? "video" : "image", name: asset.fileName || `upload_${Date.now()}.${asset.uri.split('.').pop()}`, mimeType: asset.mimeType || "image/jpeg", size: sizeCheck.size });
        }
    };

    const handlePickDocument = async () => {
        if (groupDissolved) return;
        let result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
        if (!result.canceled) {
            const asset = result.assets[0];
            const sizeCheck = await canUsePickedFile(asset);
            if (!sizeCheck.allowed) return;
            setSelectedFile({ uri: asset.uri, type: "file", name: asset.name, mimeType: asset.mimeType || "application/octet-stream", size: sizeCheck.size });
        }
    };

    const send = async () => {
        if (groupDissolved) {
            Alert.alert("Thông báo", "Nhóm đã giải tán, bạn chỉ có thể xem lại tin nhắn.");
            return;
        }

        if (editingMessage) return handleSaveEdit();
        if (!message.trim() && !selectedFile) return;
        setIsSending(true);
        let finalFileUrl = null;
        let msgType = "text";

        try {
            if (selectedFile) {
                const sizeCheck = await canUsePickedFile(selectedFile);
                if (!sizeCheck.allowed) { setIsSending(false); return; }
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
                getSocket()?.emit("typing", { conversationId, isTyping: false });
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
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    const getPickedFileSize = async (asset: any) => {
        const directSize = asset?.fileSize || asset?.size;
        if (typeof directSize === "number") return directSize;

        try {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            return blob.size;
        } catch {
            return 0;
        }
    };

    const canUsePickedFile = async (asset: any) => {
        const size = await getPickedFileSize(asset);
        if (size > MAX_FILE_SIZE) {
            Alert.alert("Thong bao", "Khong gui duoc file tren 10MB");
            return { allowed: false, size };
        }
        return { allowed: true, size };
    };

    const getAttachmentMeta = (type?: string, fileName?: string, mimeType?: string) => {
        const name = String(fileName || "").toLowerCase();
        const mime = String(mimeType || "").toLowerCase();

        if (type === "image" || mime.startsWith("image/")) return { icon: "image-outline" as any, color: "#0284c7", label: "Anh" };
        if (type === "video" || mime.startsWith("video/")) return { icon: "videocam-outline" as any, color: "#7c3aed", label: "Video" };
        if (name.endsWith(".pdf") || mime.includes("pdf")) return { icon: "document-text-outline" as any, color: "#dc2626", label: "PDF" };
        if (/\.(doc|docx)$/i.test(name) || mime.includes("word")) return { icon: "document-text-outline" as any, color: "#2563eb", label: "Word" };
        if (/\.(xls|xlsx|csv)$/i.test(name) || mime.includes("spreadsheet") || mime.includes("excel")) return { icon: "grid-outline" as any, color: "#16a34a", label: "Excel" };
        return { icon: "document-attach-outline" as any, color: "#4b5563", label: "Tep" };
    };

    const renderAttachmentContent = (item: Message, isMe: boolean) => {
        const meta = getAttachmentMeta(item.type, item.fileName);
        const fileName = item.fileName || (item.type === "image" ? "Anh" : item.type === "video" ? "Video" : "Tep dinh kem");

        return (
            <TouchableOpacity onPress={() => handleOpenFile(item.fileUrl)} style={{ flexDirection: "row", alignItems: "center", backgroundColor: isMe ? "rgba(255,255,255,0.18)" : "#f3f4f6", padding: 10, borderRadius: 10, minWidth: 210, maxWidth: 260 }}>
                <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                    <Ionicons name={meta.icon} size={24} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: isMe ? "#ffffff" : "#111827", fontWeight: "700", fontSize: 14 }} numberOfLines={1}>{fileName}</Text>
                    <Text style={{ color: isMe ? "#e5e7eb" : "#6b7280", fontSize: 12, marginTop: 2 }}>{meta.label} - Nhan de mo</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTextContent = (content: string, isMe: boolean) => {
        const match = content.match(/(\S*group\/join\/\S+)/);
        const color = isMe ? "white" : "#111827";
        const linkColor = isMe ? "#dbeafe" : "#0d6efd";

        if (!match) return <Text style={{ color, fontSize: 16, lineHeight: 22 }}>{content}</Text>;

        const link = match[1];
        const [before, after = ""] = content.split(link);

        return (
            <Text style={{ color, fontSize: 16, lineHeight: 22 }}>
                {before}
                <Text
                    style={{ color: linkColor, textDecorationLine: "underline", fontWeight: "700" }}
                    onPress={() => Linking.openURL(link).catch(() => Alert.alert("Lá»—i", "KhÃ´ng thá»ƒ má»Ÿ link."))}
                >
                    {link}
                </Text>
                {after}
            </Text>
        );
    };
    const lastOwnMessageId = getLastOwnMessageId();

    const renderMessageContent = (item: Message, isMe: boolean) => {
        if (item.isDeleted) return <Text style={{ color: "#888", fontStyle: 'italic' }}>Tin nhắn đã thu hồi</Text>;
        if (["image", "video", "file"].includes(String(item.type))) return renderAttachmentContent(item, isMe);
        switch (item.type) {
            case "image":
                const safeImgUrl = (item.fileUrl && String(item.fileUrl).trim() !== "") ? item.fileUrl : "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png";
                return (
                    <TouchableOpacity onPress={() => handleOpenFile(safeImgUrl)}>
                        <Image source={{ uri: safeImgUrl }} style={{ width: 220, height: 300, borderRadius: 12, backgroundColor: '#f0f0f0' }} resizeMode="cover" />
                    </TouchableOpacity>
                );
            case "video": return <TouchableOpacity onPress={() => handleOpenFile(item.fileUrl)} style={{ width: 200, height: 150, backgroundColor: '#000', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="play-circle" size={50} color="rgba(255,255,255,0.8)" /><Text style={{ color: '#fff', fontSize: 12, marginTop: 5 }}>Video</Text></TouchableOpacity>;
            case "file": return <TouchableOpacity onPress={() => handleOpenFile(item.fileUrl)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isMe ? "rgba(255,255,255,0.2)" : "#f3f4f6", padding: 10, borderRadius: 8, maxWidth: 220 }}><View style={{ width: 40, height: 40, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}><Ionicons name="document-text" size={24} color="#0d6efd" /></View><View style={{ flex: 1 }}><Text style={{ color: isMe ? "#fff" : "#111", fontWeight: '500' }} numberOfLines={1}>{item.fileName || "Tài liệu"}</Text><Text style={{ color: isMe ? "#e0e0e0" : "#666", fontSize: 12 }}>Nhấn để mở</Text></View></TouchableOpacity>;
            default: return renderTextContent(item.content || "", isMe);
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
                                    <Text style={{ fontSize: 12, color: groupDissolved ? '#ef4444' : '#6b7280' }}>
                                        {groupDissolved
                                            ? "Nhóm đã giải tán"
                                            : `${groupInfo?.members?.length || 0} thành viên • ${onlineMemberCount} đang hoạt động`}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: "row", gap: 15, alignItems: "center" }}>
                                <TouchableOpacity onPress={() => setIsSearching(true)}>
                                    <Ionicons name="search" size={24} color="#0d6efd" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => router.push(`/group/settings/${conversationId}` as any)} style={{ padding: 5 }}>
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
                                    const rawAvatarUrl = typeof item.senderId === "object" ? item.senderId.avatar : null;
                                    const avatarUrl = (rawAvatarUrl && String(rawAvatarUrl).trim() !== "") ? rawAvatarUrl : "https://i.pravatar.cc/150";

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
                            const rawSenderAvatar = typeof item.senderId === "object" ? item.senderId.avatar : null;
                            const senderAvatar = (rawSenderAvatar && String(rawSenderAvatar).trim() !== "") ? rawSenderAvatar : "https://i.pravatar.cc/150";

                            const isMe = String(senderId) === String(myId);
                            const isReactionActive = activeReactionId === item._id;
                            const isPinned = pinnedMessages.some(p => String(p.message?._id) === String(item._id));
                            const shouldShowDeliveryStatus = isMe && item._id === lastOwnMessageId && item.type !== "system";

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

                                            {/* 👉 BỔ SUNG FLEXWRAP CHỐNG TRÀN VÀ NÚT CHUYỂN TIẾP */}
                                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleReplyMessage(item)}>
                                                    <Ionicons name="arrow-undo" size={16} color="#fff" />
                                                    <Text style={styles.actionBtnText}>Trả lời</Text>
                                                </TouchableOpacity>

                                                {/* 👉 NÚT CHUYỂN TIẾP MỚI */}
                                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenForwardModal(item)}>
                                                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                                                    <Text style={styles.actionBtnText}>Chuyển tiếp</Text>
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
                                                    <TouchableOpacity activeOpacity={0.8} onPress={() => scrollToMessage(item.replyTo!._id)}>
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
                                            {shouldShowDeliveryStatus && (
                                                <Text style={styles.deliveryStatusText}>
                                                    {hasSeenByOthers(item) ? "Đã xem" : "Đã gửi"}
                                                </Text>
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
                    groupDissolved ? (
                        <View style={styles.lockedGroupBox}>
                            <Ionicons name="lock-closed-outline" size={18} color="#6b7280" />
                            <Text style={styles.lockedGroupText}>
                                Nhóm đã giải tán. Bạn chỉ có thể xem lại tin nhắn trước đó.
                            </Text>
                        </View>
                    ) : (
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
                                    <Ionicons name={getAttachmentMeta(selectedFile.type, selectedFile.name, selectedFile.mimeType).icon} size={24} color={getAttachmentMeta(selectedFile.type, selectedFile.name, selectedFile.mimeType).color} />
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
                    )
                )}

            </KeyboardAvoidingView>

            {/* 👉 MODAL CHỌN DANH SÁCH BẠN BÈ / NHÓM ĐỂ CHUYỂN TIẾP TIN NHẮN */}
            <Modal visible={showForwardModal} animationType="slide" transparent>
                <View style={styles.bottomSheetOverlay}>
                    <View style={styles.bottomSheetContent}>
                        <View style={styles.sheetHeader}>
                            <TouchableOpacity onPress={() => setShowForwardModal(false)}>
                                <Text style={styles.cancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={styles.sheetTitle}>Chuyển tiếp đến</Text>
                            <TouchableOpacity onPress={submitForwardMessage} disabled={isForwarding}>
                                {isForwarding ? (
                                    <ActivityIndicator size="small" color="#0d6efd" />
                                ) : (
                                    <Text style={[styles.confirmText, selectedForwardTargets.length > 0 && { color: "#0d6efd" }]}>
                                        Gửi ({selectedForwardTargets.length})
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={conversationsList}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={{ padding: 15 }}
                            renderItem={({ item }) => {
                                const isSelected = selectedForwardTargets.includes(item._id);
                                const targetName = item.name;
                                const avatar = item.avatar || "https://i.pravatar.cc/100";

                                return (
                                    <TouchableOpacity style={styles.friendSelectItem} onPress={() => toggleForwardTarget(item._id)}>
                                        <Image source={{ uri: avatar }} style={styles.memberAvatar} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.memberName}>{targetName}</Text>
                                            {item.isGroup && <Text style={{ fontSize: 12, color: "gray" }}>Nhóm chat</Text>}
                                        </View>
                                        <Ionicons
                                            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                            size={26}
                                            color={isSelected ? "#0d6efd" : "#ccc"}
                                        />
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={<Text style={{ textAlign: "center", color: "#888", marginTop: 20 }}>Không có cuộc trò chuyện nào</Text>}
                        />
                    </View>
                </View>
            </Modal>

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
    deliveryStatusText: { color: "#6b7280", fontSize: 11, alignSelf: "flex-end", marginTop: 3, marginRight: 4 },
    lockedGroupBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingHorizontal: 14, paddingVertical: 12 },
    lockedGroupText: { flex: 1, color: "#6b7280", fontSize: 13, lineHeight: 18, marginLeft: 8 },

    reactionPopupWrapper: { marginBottom: 8, zIndex: 999, elevation: 5 },
    reactionPopup: { backgroundColor: '#ffffff', borderRadius: 30, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
    reactionBadge: { position: 'absolute', bottom: -10, backgroundColor: '#ffffff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },

    actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4b5563', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4, marginBottom: 4 },
    actionBtnText: { color: "#fff", marginLeft: 4, fontWeight: "600", fontSize: 13 },

    pinnedBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0fdf4", paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#e5e7eb" },
    searchResultItem: { flexDirection: "row", paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },

    replyPreviewBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: "#e5e7eb" },
    repliedBubble: { padding: 8, borderRadius: 8, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: "rgba(255,255,255,0.5)" },

    systemMsgContainer: { alignItems: 'center', marginVertical: 15 },
    systemMsgText: { fontSize: 12, color: '#6b7280', backgroundColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, overflow: 'hidden', textAlign: 'center', maxWidth: '85%' },

    // 👉 CSS DÀNH CHO MODAL CHỌN DANH SÁCH BẠN BÈ ĐỂ CHUYỂN TIẾP
    bottomSheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    bottomSheetContent: { backgroundColor: "#fff", borderTopLeftRadius: 15, borderTopRightRadius: 15, height: "70%" },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, borderBottomWidth: 1, borderColor: "#eee" },
    sheetTitle: { fontSize: 17, fontWeight: "bold", color: "#111" },
    cancelText: { fontSize: 16, color: "#6b7280" },
    confirmText: { fontSize: 16, color: "#9ca3af", fontWeight: "bold" },
    friendSelectItem: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    memberAvatar: { width: 46, height: 46, borderRadius: 23, marginRight: 12 },
    memberName: { fontSize: 16, fontWeight: "500", color: "#111" },
});
