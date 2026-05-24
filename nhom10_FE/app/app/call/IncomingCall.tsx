import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getSocket } from '../../socket/socket';

export default function IncomingCallScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const callId = params.callId as string;
    const callerId = params.callerId as string;
    const conversationId = params.conversationId as string;
    const callerName = params.callerName as string || 'Người dùng';
    const callerAvatar = params.callerAvatar as string;
    const callType = params.callType as string || 'video';

    const [isAnswered, setIsAnswered] = useState(false);

    // ✅ 3 vòng pulse độc lập, mỗi vòng delay khác nhau để tạo hiệu ứng lan toả
    const pulse1 = useRef(new Animated.Value(1)).current;
    const pulse2 = useRef(new Animated.Value(1)).current;
    const pulse3 = useRef(new Animated.Value(1)).current;
    const opacity1 = useRef(new Animated.Value(0.6)).current;
    const opacity2 = useRef(new Animated.Value(0.6)).current;
    const opacity3 = useRef(new Animated.Value(0.6)).current;

    // ✅ Nút chấp nhận rung nhẹ để thu hút sự chú ý
    const acceptShake = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Hàm tạo 1 vòng pulse với delay khởi đầu
        const makePulse = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(scale, {
                            toValue: 2.2,
                            duration: 1600,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 1600,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.parallel([
                        Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
                        Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
                    ]),
                ])
            );

        const p1 = makePulse(pulse1, opacity1, 0);
        const p2 = makePulse(pulse2, opacity2, 500);
        const p3 = makePulse(pulse3, opacity3, 1000);
        p1.start(); p2.start(); p3.start();

        // Nút xanh rung nhẹ lặp lại
        const shake = Animated.loop(
            Animated.sequence([
                Animated.timing(acceptShake, { toValue: -6, duration: 80, useNativeDriver: true }),
                Animated.timing(acceptShake, { toValue: 6, duration: 80, useNativeDriver: true }),
                Animated.timing(acceptShake, { toValue: -4, duration: 80, useNativeDriver: true }),
                Animated.timing(acceptShake, { toValue: 4, duration: 80, useNativeDriver: true }),
                Animated.timing(acceptShake, { toValue: 0, duration: 80, useNativeDriver: true }),
                Animated.delay(2000), // nghỉ 2 giây rồi rung lại
            ])
        );
        shake.start();

        return () => { p1.stop(); p2.stop(); p3.stop(); shake.stop(); };
    }, []);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        const handleCallEnded = () => { if (!isAnswered) router.back(); };
        socket.on('call_ended', handleCallEnded);
        return () => { socket.off('call_ended', handleCallEnded); };
    }, [isAnswered]);

    const handleAccept = () => {
        setIsAnswered(true);
        const socket = getSocket();
        if (socket) socket.emit('call_accept', { callId, callerId });
        router.replace({
            pathname: '/call/CallScreen',
            params: { callId, partnerId: callerId, conversationId, isCaller: 'false', type: callType },
        } as any);
    };

    const handleReject = () => {
        const socket = getSocket();
        if (socket) socket.emit('call_reject', { callId, callerId, conversationId });
        router.back();
    };

    const AVATAR_SIZE = 120;

    return (
        <View style={styles.container}>
            <View style={styles.infoContainer}>

                {/* ✅ Vùng chứa avatar + 3 vòng pulse lan toả */}
                <View style={{ width: AVATAR_SIZE * 2.5, height: AVATAR_SIZE * 2.5, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    {/* Vòng 1 — lan ra đầu tiên */}
                    <Animated.View style={{
                        position: 'absolute',
                        width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
                        backgroundColor: '#28a745',
                        transform: [{ scale: pulse1 }],
                        opacity: opacity1,
                    }} />
                    {/* Vòng 2 — lan ra sau 500ms */}
                    <Animated.View style={{
                        position: 'absolute',
                        width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
                        backgroundColor: '#28a745',
                        transform: [{ scale: pulse2 }],
                        opacity: opacity2,
                    }} />
                    {/* Vòng 3 — lan ra sau 1000ms */}
                    <Animated.View style={{
                        position: 'absolute',
                        width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
                        backgroundColor: '#28a745',
                        transform: [{ scale: pulse3 }],
                        opacity: opacity3,
                    }} />
                    {/* Avatar nằm trên cùng */}
                    <Image
                        source={{ uri: callerAvatar || 'https://i.pravatar.cc/150' }}
                        style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 3, borderColor: '#fff' }}
                    />
                </View>

                <Text style={styles.name}>{callerName}</Text>
                <Text style={styles.status}>
                    {callType === 'video' ? '📹  Đang gọi video đến...' : '📞  Đang gọi thoại đến...'}
                </Text>
            </View>

            <View style={styles.actionContainer}>
                {/* Nút từ chối */}
                <View style={{ alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={handleReject}>
                        <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                    </TouchableOpacity>
                    <Text style={styles.btnLabel}>Từ chối</Text>
                </View>

                {/* Nút chấp nhận — rung nhẹ để thu hút */}
                <View style={{ alignItems: 'center', gap: 8 }}>
                    <Animated.View style={{ transform: [{ translateX: acceptShake }] }}>
                        <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAccept}>
                            <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={30} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.btnLabel}>Chấp nhận</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'space-between', paddingVertical: 60 },
    infoContainer: { alignItems: 'center', marginTop: 40 },
    name: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
    status: { color: '#aaa', fontSize: 16 },
    actionContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40, marginBottom: 40 },
    btn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
    rejectBtn: { backgroundColor: '#ff4d4f' },
    acceptBtn: { backgroundColor: '#28a745' },
    btnLabel: { color: '#aaa', fontSize: 13 },
});