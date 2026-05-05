import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { RTCView } from "react-native-webrtc";
// 👉 Import thêm Ionicons để làm nút bấm cho đẹp
import { Ionicons } from "@expo/vector-icons";

import { getSocket } from "../../socket/socket";
import { addIce, createAnswer, createOffer, createPeer, setRemoteAnswer } from "../../webrtc/peer";

export default function CallScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();

    const callId = params.callId as string;
    const partnerId = params.partnerId as string;
    const conversationId = params.conversationId as string;
    const isCaller = params.isCaller === "true";
    const callType = params.type as string;

    const [localStream, setLocalStream] = useState<any>(null);
    const [remoteStream, setRemoteStream] = useState<any>(null);

    // 👉 THÊM 2 STATE ĐỂ QUẢN LÝ TRẠNG THÁI MIC VÀ CAMERA
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const init = async () => {
            const { localStream } = await createPeer(
                callType,
                (stream: any) => setRemoteStream(stream),
                (candidate: any) => {
                    socket.emit("webrtc_ice_candidate", { receiverId: partnerId, candidate, callId });
                }
            );

            setLocalStream(localStream);

            if (isCaller) {
                const offer = await createOffer();
                socket.emit("webrtc_offer", { receiverId: partnerId, offer, callId });
            }
        };

        init();

        socket.on("webrtc_offer", async ({ offer }) => {
            const answer = await createAnswer(offer);
            socket.emit("webrtc_answer", { receiverId: partnerId, answer, callId });
        });

        socket.on("webrtc_answer", async ({ answer }) => {
            await setRemoteAnswer(answer);
        });

        socket.on("webrtc_ice_candidate", async ({ candidate }) => {
            await addIce(candidate);
        });

        socket.on("call_ended", () => {
            router.back();
        });

        return () => {
            socket.off("webrtc_offer");
            socket.off("webrtc_answer");
            socket.off("webrtc_ice_candidate");
            socket.off("call_ended");
        };
    }, []);

    // 👉 HÀM TẮT/BẬT MICRO
    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach((track: any) => {
                track.enabled = !track.enabled; // Lật trạng thái
            });
            setIsMicOn(!isMicOn);
        }
    };

    // 👉 HÀM TẮT/BẬT CAMERA
    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach((track: any) => {
                track.enabled = !track.enabled; // Lật trạng thái
            });
            setIsCameraOn(!isCameraOn);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#222" }}>
            {/* --- KHU VỰC HIỂN THỊ VIDEO HOẶC GIAO DIỆN AUDIO --- */}
            {callType === "video" ? (
                <>
                    {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} objectFit="cover" />}
                    {localStream && isCameraOn && (
                        <RTCView streamURL={localStream.toURL()} style={{ width: 110, height: 160, position: "absolute", top: 60, right: 20, borderRadius: 12, backgroundColor: '#000' }} objectFit="cover" zOrder={1} />
                    )}
                </>
            ) : (
                <View style={{ alignItems: "center", justifyContent: 'center', flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 24, marginBottom: 15, fontWeight: "bold" }}>Cuộc gọi thoại</Text>
                    <Text style={{ color: "#aaa", fontSize: 16 }}>Đang kết nối...</Text>
                </View>
            )}

            {/* --- THANH ĐIỀU KHIỂN BÊN DƯỚI (CONTROL BAR) --- */}
            <View style={{
                position: "absolute",
                bottom: 40,
                width: "100%",
                flexDirection: "row",
                justifyContent: "space-evenly",
                alignItems: "center",
                paddingHorizontal: 20
            }}>

                {/* 1. NÚT BẬT/TẮT MIC */}
                <TouchableOpacity
                    onPress={toggleMic}
                    style={{
                        width: 60, height: 60, borderRadius: 30,
                        backgroundColor: isMicOn ? "rgba(255,255,255,0.2)" : "#fff",
                        justifyContent: "center", alignItems: "center"
                    }}
                >
                    <Ionicons name={isMicOn ? "mic" : "mic-off"} size={28} color={isMicOn ? "#fff" : "#222"} />
                </TouchableOpacity>

                {/* 2. NÚT BẬT/TẮT CAMERA (CHỈ HIỆN NẾU LÀ GỌI VIDEO) */}
                {callType === "video" && (
                    <TouchableOpacity
                        onPress={toggleCamera}
                        style={{
                            width: 60, height: 60, borderRadius: 30,
                            backgroundColor: isCameraOn ? "rgba(255,255,255,0.2)" : "#fff",
                            justifyContent: "center", alignItems: "center"
                        }}
                    >
                        <Ionicons name={isCameraOn ? "videocam" : "videocam-off"} size={28} color={isCameraOn ? "#fff" : "#222"} />
                    </TouchableOpacity>
                )}

                {/* 3. NÚT KẾT THÚC CUỘC GỌI */}
                <TouchableOpacity
                    onPress={() => {
                        const socket = getSocket();
                        if (socket) socket.emit("call_end", { callId, partnerId, conversationId });
                        router.back();
                    }}
                    style={{
                        width: 65, height: 65, borderRadius: 35,
                        backgroundColor: '#ff4d4f',
                        justifyContent: "center", alignItems: "center",
                        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5
                    }}
                >
                    {/* Icon điện thoại cúp máy */}
                    <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>

            </View>
        </View>
    );
}   