import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// 👉 Import trực tiếp getSocket thay vì getCallSocket
import { getSocket } from '../../socket/socket';

export default function IncomingCallScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const callId = params.callId as string;
    const callerId = params.callerId as string;
    const conversationId = params.conversationId as string;
    const callerName = params.callerName as string || "Người dùng";
    const callerAvatar = params.callerAvatar as string;
    const callType = params.callType as string || "video";

    const [isAnswered, setIsAnswered] = useState(false);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleCallEnded = () => {
            if (!isAnswered) router.back();
        };

        socket.on("call_ended", handleCallEnded);
        return () => { socket.off("call_ended", handleCallEnded); };
    }, [isAnswered]);

    const handleAccept = () => {
        setIsAnswered(true);
        const socket = getSocket();
        // 👉 Tự Emit sự kiện chấp nhận cuộc gọi
        if (socket) socket.emit("call_accept", { callId, callerId });

        router.replace({
            pathname: "/call/CallScreen",
            params: { callId, partnerId: callerId, conversationId, isCaller: "false", type: callType }
        } as any);
    };

    const handleReject = () => {
        const socket = getSocket();
        // 👉 Tự Emit sự kiện từ chối
        if (socket) socket.emit("call_reject", { callId, callerId, conversationId });
        router.back();
    };

    return (
        <View style={styles.container}>
            <View style={styles.infoContainer}>
                <Image
                    source={{ uri: callerAvatar || 'https://i.pravatar.cc/150' }}
                    style={styles.avatar}
                />
                <Text style={styles.name}>{callerName}</Text>
                <Text style={styles.status}>
                    {callType === 'video' ? 'Đang gọi video đến...' : 'Đang gọi thoại đến...'}
                </Text>
            </View>

            <View style={styles.actionContainer}>
                <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={handleReject}>
                    <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAccept}>
                    <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={30} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#222', justifyContent: 'space-between', paddingVertical: 60 },
    infoContainer: { alignItems: 'center', marginTop: 40 },
    avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 20 },
    name: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    status: { color: '#ccc', fontSize: 16 },
    actionContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40, marginBottom: 40 },
    btn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
    rejectBtn: { backgroundColor: '#ff4d4f' },
    acceptBtn: { backgroundColor: '#28a745' }
});