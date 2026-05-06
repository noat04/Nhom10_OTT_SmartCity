import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../../context/authContext";
import {
    addGroupMembersAPI,
    getGroupInfoAPI,
    leaveGroupAPI,
    promoteGroupAdminAPI,
    removeGroupMemberAPI,
    updateGroupInfoAPI,
} from "../../../service/chat.api";

// 👉 CẦN IMPORT CÁC API VỀ BẠN BÈ VÀ LỜI MỜI
import { getFriendRequestsAPI, getFriendsAPI, sendFriendRequestAPI } from "../../../service/friend.api";

import {
    offConversationUpdated,
    offGroupAdminChanged,
    offGroupInfoUpdated,
    offGroupLeft,
    offGroupMemberRemoved,
    offGroupMembersAdded,
    onConversationUpdated,
    onGroupAdminChanged,
    onGroupInfoUpdated,
    onGroupLeft,
    onGroupMemberRemoved,
    onGroupMembersAdded
} from "../../../socket/socket";

export default function GroupSettingsScreen() {
    const { id } = useLocalSearchParams();
    const conversationId = Array.isArray(id) ? id[0] : id;
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [groupInfo, setGroupInfo] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [myRole, setMyRole] = useState("member");
    const [loading, setLoading] = useState(true);

    const [showEditModal, setShowEditModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");

    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [friendsList, setFriendsList] = useState<any[]>([]);
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

    // 👉 STATE MỚI CHO TÍNH NĂNG KẾT BẠN
    const [allFriends, setAllFriends] = useState<any[]>([]);
    const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);

    // ================= LOAD DATA =================
    const loadData = useCallback(async (showLoading = true) => {
        if (!conversationId) return;
        if (showLoading) setLoading(true);

        const res = await getGroupInfoAPI(conversationId);

        if (res?.success) {
            const data = res.data || res;
            setGroupInfo(data);
            setMembers(data.members || []);

            const myId = user?._id || user?.id;
            const me = data.members?.find((m: any) => {
                const mId = typeof m.user === "object" ? m.user._id : m.user;
                return String(mId) === String(myId);
            });

            if (!me) {
                Alert.alert("Thông báo", "Bạn không còn ở trong nhóm này hoặc nhóm đã bị giải tán.");
                router.replace("/");
                return;
            }
            setMyRole(me.role || "member");
        } else {
            Alert.alert("Thông báo", "Không thể lấy thông tin nhóm.");
            router.replace("/");
        }

        // Tải danh sách bạn bè và lời mời
        await fetchFriendData();

        if (showLoading) setLoading(false);
    }, [conversationId, user]);

    const fetchFriendData = async () => {
        try {
            // Lấy danh sách bạn bè
            const fRes = await getFriendsAPI();
            if (fRes?.success) setAllFriends(Array.isArray(fRes.data) ? fRes.data : []);

            // Lấy danh sách đã gửi lời mời (để UI hiện "Đã gửi")
            const rRes = await getFriendRequestsAPI();
            let sentIds: string[] = [];
            if (rRes?.data?.sent && Array.isArray(rRes.data.sent)) {
                const pendingReqs = rRes.data.sent.filter((req: any) => req.status === 'pending');
                sentIds = pendingReqs.map((req: any) => {
                    const receiver = req.friendId || req.receiverId || req.receiver || req.toUser;
                    return String(typeof receiver === 'object' && receiver !== null ? (receiver._id || receiver.id) : receiver);
                });
            }
            setSentRequestIds(sentIds);
        } catch (error) {
            console.log("Lỗi tải data bạn bè:", error);
        }
    };

    useEffect(() => {
        loadData(true);
    }, [loadData]);


    // ================= SOCKET REALTIME =================
    useEffect(() => {
        const handleGroupUpdate = () => { loadData(false); };
        onGroupInfoUpdated(handleGroupUpdate);
        onGroupMembersAdded(handleGroupUpdate);
        onGroupMemberRemoved(handleGroupUpdate);
        onGroupAdminChanged(handleGroupUpdate);
        onGroupLeft(handleGroupUpdate);
        onConversationUpdated(handleGroupUpdate);
        return () => {
            offGroupInfoUpdated(handleGroupUpdate);
            offGroupMembersAdded(handleGroupUpdate);
            offGroupMemberRemoved(handleGroupUpdate);
            offGroupAdminChanged(handleGroupUpdate);
            offGroupLeft(handleGroupUpdate);
            offConversationUpdated(handleGroupUpdate);
        };
    }, [loadData]);


    // ================= ACTIONS =================
    const handleSaveGroupName = async () => {
        if (!newGroupName.trim() || newGroupName === groupInfo?.name) { setShowEditModal(false); return; }
        const res = await updateGroupInfoAPI({ conversationId, name: newGroupName });
        if (res?.success) { setShowEditModal(false); loadData(false); }
        else Alert.alert("Lỗi", "Không thể đổi tên nhóm");
    };

    const handleLeaveGroup = () => {
        Alert.alert("Xác nhận", "Bạn có chắc chắn muốn rời khỏi nhóm này?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Rời nhóm", style: "destructive", onPress: async () => {
                    const res = await leaveGroupAPI({ conversationId });
                    if (res?.success) router.replace("/");
                    else Alert.alert("Lỗi", "Không thể rời nhóm");
                }
            }
        ]);
    };

    const handleRemoveMember = (memberId: string, memberName: string) => {
        Alert.alert("Xác nhận", `Xóa ${memberName} khỏi nhóm?`, [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xóa", style: "destructive", onPress: async () => {
                    await removeGroupMemberAPI({ conversationId, memberId });
                }
            }
        ]);
    };

    const handlePromoteAdmin = (memberId: string, memberName: string) => {
        Alert.alert("Thăng cấp", `Chuyển quyền Admin cho ${memberName}?`, [
            { text: "Hủy", style: "cancel" },
            {
                text: "Đồng ý", style: "default", onPress: async () => {
                    await promoteGroupAdminAPI({ conversationId, targetUserId: memberId });
                }
            }
        ]);
    };

    // 👉 HÀM GỬI YÊU CẦU KẾT BẠN
    const handleAddFriend = async (targetUserId: string) => {
        try {
            const rawId = typeof targetUserId === 'object' ? (targetUserId as any)._id || (targetUserId as any).id : targetUserId;
            const safeId = String(rawId);

            const res = await sendFriendRequestAPI({ receiverId: safeId });

            if (res?.success) {
                // Thêm ngay vào state để đổi UI sang màu xám "Đã gửi"
                setSentRequestIds((prev) => [...prev, safeId]);
                Alert.alert("Thành công", "Đã gửi yêu cầu kết bạn!");
            } else {
                if (res?.message?.toLowerCase().includes("đã gửi")) {
                    setSentRequestIds((prev) => [...prev, safeId]);
                } else {
                    Alert.alert("Thông báo", res?.message || "Lỗi khi gửi kết bạn");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    // Check xem người này đã là bạn bè chưa
    const checkIsFriend = (userId: string) => {
        return allFriends.some((f: any) => {
            const fUser = f.friendInfo || f.user || f;
            return String(fUser._id || fUser.id) === String(userId);
        });
    };

    const handleOpenAddMemberModal = async () => {
        setShowAddMemberModal(true);
        setSelectedFriendIds([]);
        const currentMemberIds = members.map(m => typeof m.user === 'object' ? m.user._id : m.user);
        const availableFriends = allFriends.filter((friend: any) => {
            const fId = friend?.friendInfo?._id || friend?.user?._id || friend?._id || friend?.id;
            return !currentMemberIds.includes(String(fId));
        });
        setFriendsList(availableFriends);
    };

    const handleSubmitAddMembers = async () => {
        if (selectedFriendIds.length === 0) return Alert.alert("Thông báo", "Vui lòng chọn ít nhất 1 người");
        const res = await addGroupMembersAPI({ conversationId, newMemberIds: selectedFriendIds });
        if (res?.success) {
            setShowAddMemberModal(false);
            if (res.data) { setGroupInfo(res.data); setMembers(res.data.members || []); }
        } else {
            Alert.alert("Lỗi", res?.message || "Không thể thêm thành viên");
        }
    };

    const toggleSelectFriend = (id: string) => {
        setSelectedFriendIds((prev) => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0d6efd" /></View>;

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <Stack.Screen options={{ headerShown: false }} />

                <View style={[styles.customHeader, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#0d6efd" />
                        <Text style={styles.backButtonText}>Quay lại</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tùy chọn nhóm</Text>
                    <View style={{ width: 80 }} />
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
                    <View style={styles.headerSection}>
                        <Image source={{ uri: groupInfo?.avatar || "https://i.pravatar.cc/200" }} style={styles.largeAvatar} />
                        <View style={styles.nameRow}>
                            <Text style={styles.groupName}>{groupInfo?.name || "Nhóm Chat"}</Text>
                            {myRole === "admin" && (
                                <TouchableOpacity onPress={() => { setNewGroupName(groupInfo?.name || ""); setShowEditModal(true); }} style={{ marginLeft: 8 }}>
                                    <Ionicons name="pencil" size={20} color="#0d6efd" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.memberCount}>{members.length} thành viên</Text>
                    </View>

                    <View style={styles.actionSection}>
                        {myRole === "admin" && (
                            <TouchableOpacity style={styles.actionItem} onPress={handleOpenAddMemberModal}>
                                <View style={[styles.iconBox, { backgroundColor: "#e5f0ff" }]}><Ionicons name="person-add" size={24} color="#0d6efd" /></View>
                                <Text style={styles.actionText}>Thêm thành viên</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.actionItem} onPress={() => alert("Mở chức năng tìm kiếm")}>
                            <View style={[styles.iconBox, { backgroundColor: "#f3f4f6" }]}><Ionicons name="search" size={24} color="#374151" /></View>
                            <Text style={styles.actionText}>Tìm tin nhắn</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>Thành viên nhóm</Text>
                        {members.map((m, index) => {
                            const mUser = m.user;
                            const uId = typeof mUser === "object" ? mUser._id : mUser;
                            const uName = typeof mUser === "object" ? mUser.fullName : "Thành viên";
                            const uAvatar = typeof mUser === "object" ? mUser.avatar : "https://i.pravatar.cc/150";

                            const isMe = String(uId) === String(user?._id || user?.id);

                            // 👉 Kiểm tra xem người này có phải bạn bè và đã được gửi kết bạn chưa
                            const isFriend = checkIsFriend(uId);
                            const isSentRequest = sentRequestIds.includes(String(uId));

                            return (
                                <View key={uId || index} style={styles.memberItem}>
                                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                        <Image source={{ uri: uAvatar || "https://i.pravatar.cc/150" }} style={styles.memberAvatar} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.memberName}>{uName} {isMe && "(Bạn)"}</Text>
                                            {m.role === "admin" && <Text style={styles.adminBadge}>Quản trị viên</Text>}
                                        </View>
                                    </View>

                                    {/* 👉 HIỂN THỊ CÁC NÚT THAO TÁC */}
                                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>

                                        {/* Nút Kết bạn sẽ hiện nếu không phải là mình và chưa phải bạn bè */}
                                        {!isMe && !isFriend && (
                                            isSentRequest ? (
                                                <View style={[styles.friendBtn, { backgroundColor: "#f3f4f6", borderColor: "#d1d5db" }]}>
                                                    <Text style={[styles.friendBtnText, { color: "#9ca3af" }]}>Đã gửi</Text>
                                                </View>
                                            ) : (
                                                <TouchableOpacity style={styles.friendBtn} onPress={() => handleAddFriend(uId)}>
                                                    <Text style={styles.friendBtnText}>Kết bạn</Text>
                                                </TouchableOpacity>
                                            )
                                        )}

                                        {/* Nút Admin */}
                                        {myRole === "admin" && !isMe && (
                                            <>
                                                <TouchableOpacity onPress={() => handlePromoteAdmin(uId, uName)}>
                                                    <View style={[styles.iconCircle, { backgroundColor: "#fffbeb", borderColor: "#f59e0b" }]}><Ionicons name="key" size={16} color="#f59e0b" /></View>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleRemoveMember(uId, uName)}>
                                                    <View style={[styles.iconCircle, { backgroundColor: "#fef2f2", borderColor: "#ef4444" }]}><Ionicons name="person-remove" size={16} color="#ef4444" /></View>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>

                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.dangerSection}>
                        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
                            <Ionicons name="log-out-outline" size={24} color="#ef4444" style={{ marginRight: 8 }} />
                            <Text style={styles.leaveBtnText}>Rời khỏi nhóm</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* MODAL SỬA TÊN NHÓM */}
                <Modal visible={showEditModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Đổi tên nhóm</Text>
                            <TextInput style={styles.modalInput} value={newGroupName} onChangeText={setNewGroupName} placeholder="Nhập tên nhóm mới..." autoFocus />
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalBtn}><Text style={{ color: "#6b7280", fontWeight: "bold" }}>Hủy</Text></TouchableOpacity>
                                <TouchableOpacity onPress={handleSaveGroupName} style={styles.modalBtn}><Text style={{ color: "#0d6efd", fontWeight: "bold" }}>Lưu</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* MODAL THÊM THÀNH VIÊN BẠN BÈ */}
                <Modal visible={showAddMemberModal} animationType="slide" transparent>
                    <View style={styles.bottomSheetOverlay}>
                        <View style={styles.bottomSheetContent}>
                            <View style={styles.sheetHeader}>
                                <TouchableOpacity onPress={() => setShowAddMemberModal(false)}><Text style={styles.cancelText}>Đóng</Text></TouchableOpacity>
                                <Text style={styles.sheetTitle}>Chọn bạn bè</Text>
                                <TouchableOpacity onPress={handleSubmitAddMembers}><Text style={[styles.confirmText, selectedFriendIds.length > 0 && { color: "#0d6efd" }]}>Thêm ({selectedFriendIds.length})</Text></TouchableOpacity>
                            </View>
                            {friendsList.length === 0 ? (
                                <View style={styles.emptyFriendBox}><Text style={{ color: "#888" }}>Không có bạn bè nào phù hợp để thêm.</Text></View>
                            ) : (
                                <FlatList
                                    data={friendsList}
                                    keyExtractor={(item) => item._id || item.id}
                                    contentContainerStyle={{ padding: 15 }}
                                    renderItem={({ item }) => {
                                        const fData = item?.friendInfo || item?.user || item;
                                        const friendId = fData?._id || fData?.id;
                                        if (!friendId) return null;
                                        const isSelected = selectedFriendIds.includes(friendId);
                                        return (
                                            <TouchableOpacity style={styles.friendSelectItem} onPress={() => toggleSelectFriend(friendId)}>
                                                <Image source={{ uri: fData?.avatar || "https://i.pravatar.cc/100" }} style={styles.memberAvatar} />
                                                <Text style={styles.memberName}>{fData?.fullName || fData?.username}</Text>
                                                <Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={26} color={isSelected ? "#0d6efd" : "#ccc"} />
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}
                        </View>
                    </View>
                </Modal>

            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    container: { flex: 1, backgroundColor: "#f3f4f6" },
    customHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingBottom: 12, borderBottomWidth: 1, borderColor: "#e5e7eb", zIndex: 10 },
    backButton: { flexDirection: "row", alignItems: "center", width: 80, paddingLeft: 5 },
    backButtonText: { color: "#0d6efd", fontSize: 16, marginLeft: -4 },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: "#111" },
    headerSection: { alignItems: "center", backgroundColor: "#fff", paddingVertical: 30, borderBottomWidth: 1, borderColor: "#e5e7eb" },
    largeAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 15 },
    nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 5 },
    groupName: { fontSize: 22, fontWeight: "bold", color: "#111" },
    memberCount: { fontSize: 14, color: "#6b7280" },
    actionSection: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#fff", paddingVertical: 20, marginBottom: 10 },
    actionItem: { alignItems: "center" },
    iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center", marginBottom: 8 },
    actionText: { fontSize: 13, color: "#374151" },
    listSection: { backgroundColor: "#fff", paddingHorizontal: 15, paddingVertical: 10, marginBottom: 10 },
    sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#6b7280", marginBottom: 15 },
    memberItem: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
    memberAvatar: { width: 46, height: 46, borderRadius: 23, marginRight: 12 },
    memberName: { fontSize: 16, fontWeight: "500", color: "#111", flex: 1 },
    adminBadge: { color: "#0d6efd", fontSize: 12, marginTop: 2, fontWeight: "600" },
    dangerSection: { marginTop: 10 },
    leaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", paddingVertical: 15 },
    leaveBtnText: { color: "#ef4444", fontSize: 16, fontWeight: "bold" },

    // 👉 CSS cho nút Kết Bạn & Admin
    friendBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "#0d6efd", backgroundColor: "#eff6ff" },
    friendBtnText: { fontSize: 12, fontWeight: "600", color: "#0d6efd" },
    iconCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: "center", alignItems: "center" },

    // Modal Style
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
    modalContent: { backgroundColor: "#fff", width: "100%", borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
    modalInput: { backgroundColor: "#f3f4f6", padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 20 },
    modalActions: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: "#eee", paddingTop: 10 },
    modalBtn: { flex: 1, alignItems: "center", paddingVertical: 10 },
    bottomSheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    bottomSheetContent: { backgroundColor: "#fff", borderTopLeftRadius: 15, borderTopRightRadius: 15, height: "70%" },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, borderBottomWidth: 1, borderColor: "#eee" },
    sheetTitle: { fontSize: 17, fontWeight: "bold", color: "#111" },
    cancelText: { fontSize: 16, color: "#6b7280" },
    confirmText: { fontSize: 16, color: "#9ca3af", fontWeight: "bold" },
    friendSelectItem: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    emptyFriendBox: { flex: 1, justifyContent: "center", alignItems: "center" },
});