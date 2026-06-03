import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { getSocket } from '../../socket/socket';
import { addIce, createAnswer, createOffer, createPeer, setRemoteAnswer } from '../../webrtc/peer';

// ✅ Format giây -> MM:SS hoặc HH:MM:SS
function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
}

// ✅ Component animation sóng âm — 4 thanh nhảy lên xuống lệch pha nhau
function VoiceWave({ active }: { active: boolean }) {
    // Mỗi thanh có 1 Animated.Value và 1 loop riêng
    const bars = useRef(
        Array.from({ length: 5 }, (_, i) => ({
            anim: new Animated.Value(0.3),
            delay: i * 120,
        }))
    ).current;

    useEffect(() => {
        if (!active) {
            // Khi tắt mic hoặc chưa kết nối: reset về chiều cao thấp
            bars.forEach(({ anim }) => anim.setValue(0.3));
            return;
        }

        const animations = bars.map(({ anim, delay }) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 350,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0.3,
                        duration: 350,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ])
            )
        );

        animations.forEach(a => a.start());
        return () => animations.forEach(a => a.stop());
    }, [active]);

    const BAR_HEIGHT = 48;
    const BAR_WIDTH = 6;
    const GAP = 6;

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', height: BAR_HEIGHT, gap: GAP, marginTop: 20 }}>
            {bars.map(({ anim }, i) => (
                <Animated.View
                    key={i}
                    style={{
                        width: BAR_WIDTH,
                        height: BAR_HEIGHT,
                        borderRadius: BAR_WIDTH / 2,
                        backgroundColor: active ? '#28a745' : '#555',
                        transform: [{ scaleY: anim }],
                    }}
                />
            ))}
        </View>
    );
}

export default function CallScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();

    const callId = params.callId as string;
    const partnerId = params.partnerId as string;
    const conversationId = params.conversationId as string;
    const isCaller = params.isCaller === 'true';
    const callType = params.type as string;

    const [localStream, setLocalStream] = useState<any>(null);
    const [remoteStream, setRemoteStream] = useState<any>(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);

    // ✅ Bộ đếm giờ thật
    const [callDuration, setCallDuration] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ✅ Bắt đầu đếm giờ
    const startTimer = () => {
        if (timerRef.current) return; // Tránh bắt đầu 2 lần
        timerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    // ✅ Dừng và reset đồng hồ
    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setCallDuration(0);
    };

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const init = async () => {
            const { localStream } = await createPeer(
                callType,
                (stream: any) => {
                    setRemoteStream(stream);
                    setIsConnected(true);
                    startTimer(); // ✅ Bắt đầu đếm khi có remote stream (kết nối thực sự thành công)
                },
                (candidate: any) => {
                    socket.emit('webrtc_ice_candidate', { receiverId: partnerId, candidate, callId });
                }
            );
            setLocalStream(localStream);

            if (isCaller) {
                const offer = await createOffer();
                socket.emit('webrtc_offer', { receiverId: partnerId, offer, callId });
            }
        };

        init();

        socket.on('webrtc_offer', async ({ offer }: { offer: any }) => {
            const answer = await createAnswer(offer);
            socket.emit('webrtc_answer', { receiverId: partnerId, answer, callId });
        });

        socket.on('webrtc_answer', async ({ answer }: { answer: any }) => {
            await setRemoteAnswer(answer);
        });

        socket.on('webrtc_ice_candidate', async ({ candidate }: { candidate: any }) => {
            await addIce(candidate);
        });

        socket.on('call_ended', () => {
            stopTimer();
            router.back();
        });

        return () => {
            socket.off('webrtc_offer');
            socket.off('webrtc_answer');
            socket.off('webrtc_ice_candidate');
            socket.off('call_ended');
            stopTimer(); // ✅ Cleanup khi unmount
        };
    }, []);

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach((track: any) => {
                track.enabled = !track.enabled;
            });
            setIsMicOn(prev => !prev);
        }
    };

    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach((track: any) => {
                track.enabled = !track.enabled;
            });
            setIsCameraOn(prev => !prev);
        }
    };

    const handleEndCall = () => {
        const socket = getSocket();
        if (socket) socket.emit('call_end', { callId, partnerId, conversationId });
        stopTimer();
        router.back();
    };

    return (
        <View style={styles.container}>
            {/* --- VIDEO HOẶC AUDIO UI --- */}
            {callType === 'video' ? (
                <>
                    {remoteStream && (
                        <RTCView
                            streamURL={remoteStream.toURL()}
                            style={StyleSheet.absoluteFill}
                            objectFit="cover"
                        />
                    )}
                    {localStream && isCameraOn && (
                        <RTCView
                            streamURL={localStream.toURL()}
                            style={styles.localVideo}
                            objectFit="cover"
                            zOrder={1}
                        />
                    )}
                    {/* ✅ Đồng hồ góc trên trái khi video call */}
                    <View style={styles.videoTopBar}>
                        <Text style={styles.videoTimer}>
                            {isConnected ? formatDuration(callDuration) : 'Đang kết nối...'}
                        </Text>
                    </View>
                </>
            ) : (
                // ✅ Màn hình gọi thoại — hiển thị sóng âm + đồng hồ
                <View style={styles.audioContainer}>
                    <Text style={styles.audioTitle}>Cuộc gọi thoại</Text>

                    {/* ✅ Đồng hồ đếm giờ */}
                    <Text style={styles.timerText}>
                        {isConnected ? formatDuration(callDuration) : 'Đang kết nối...'}
                    </Text>

                    {/* ✅ Animation sóng âm — active khi đã kết nối và mic bật */}
                    <VoiceWave active={isConnected && isMicOn} />

                    <Text style={styles.micHint}>
                        {!isMicOn ? '🔇 Mic đang tắt' : isConnected ? '🎙 Đang nghe...' : ''}
                    </Text>
                </View>
            )}

            {/* --- CONTROLS --- */}
            <View style={styles.controls}>
                {/* Mic */}
                <TouchableOpacity
                    onPress={toggleMic}
                    style={[styles.ctrlBtn, !isMicOn && styles.ctrlBtnActive]}
                >
                    <Ionicons name={isMicOn ? 'mic' : 'mic-off'} size={28} color={isMicOn ? '#fff' : '#222'} />
                </TouchableOpacity>

                {/* Camera — chỉ hiện khi gọi video */}
                {callType === 'video' && (
                    <TouchableOpacity
                        onPress={toggleCamera}
                        style={[styles.ctrlBtn, !isCameraOn && styles.ctrlBtnActive]}
                    >
                        <Ionicons name={isCameraOn ? 'videocam' : 'videocam-off'} size={28} color={isCameraOn ? '#fff' : '#222'} />
                    </TouchableOpacity>
                )}

                {/* Cúp máy */}
                <TouchableOpacity onPress={handleEndCall} style={styles.endBtn}>
                    <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },

    // Video call
    localVideo: {
        width: 110, height: 160,
        position: 'absolute', top: 60, right: 20,
        borderRadius: 12, backgroundColor: '#000',
        zIndex: 1,
    },
    videoTopBar: {
        position: 'absolute', top: 50, left: 20,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 20, zIndex: 2,
    },
    videoTimer: { color: '#fff', fontSize: 15, fontVariant: ['tabular-nums'] },

    // Audio call
    audioContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    audioTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    timerText: {
        color: '#aaa', fontSize: 20,
        fontVariant: ['tabular-nums'], // ✅ Giữ width cố định, chữ số không nhảy
        letterSpacing: 2,
    },
    micHint: { color: '#666', fontSize: 14, marginTop: 12 },

    // Controls
    controls: {
        position: 'absolute', bottom: 50, width: '100%',
        flexDirection: 'row', justifyContent: 'space-evenly',
        alignItems: 'center', paddingHorizontal: 20,
    },
    ctrlBtn: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    ctrlBtnActive: { backgroundColor: '#fff' },
    endBtn: {
        width: 65, height: 65, borderRadius: 35,
        backgroundColor: '#ff4d4f',
        justifyContent: 'center', alignItems: 'center',
        elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 4,
    },
});
