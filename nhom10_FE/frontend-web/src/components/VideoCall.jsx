import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import {
  FaPhone,
  FaPhoneSlash,
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash
} from "react-icons/fa";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const VideoCall = forwardRef(({ socket, currentUser, partnerId, conversationId, onClose }, ref) => {
  const [callStatus, setCallStatus] = useState("idle");
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const [callType, setCallType] = useState("video");
  const callTypeRef = useRef("video");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const currentCallIdRef = useRef(null);

  const iceCandidateQueue = useRef([]);

  useImperativeHandle(ref, () => ({
    startCall: (type = "video", partner) => {
      setCallType(type);
      callTypeRef.current = type;

      // 🔥 FIX: luôn lưu user thật
      const realUser =
        partner?.members
          ? partner.members.find(
            (m) => String(m._id) !== String(currentUser.id)
          )
          : partner;

      setPartnerInfo(realUser);

      setCallStatus("calling");

      socket.emit("call_init", {
        conversationId,
        receiverId: partnerId,
        type
      });
    },
    handleIncomingCall: (data) => {
      const incomingType = data.type || "video";
      setCallType(incomingType);
      callTypeRef.current = incomingType;

      setIncomingCallData(data);
      currentCallIdRef.current = data.callId;
      setCallStatus("ringing");
    }
  }));

  const startMedia = async () => {
    try {
      const isVideo = callTypeRef.current === "video";
      const constraints = { video: isVideo, audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && isVideo) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn("⚠️ Lỗi lấy Media:", err);
      if (callTypeRef.current === "video") {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          localStreamRef.current = audioStream;
          return audioStream;
        } catch (audioErr) {
          console.error("Lỗi lấy Micro dự phòng:", audioErr);
          return null;
        }
      }
      return null;
    }
  };

  const processIceQueue = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || pc.remoteDescription === null) return;

    while (iceCandidateQueue.current.length > 0) {
      const candidate = iceCandidateQueue.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Lỗi giải phóng ICE:", err);
      }
    }
  };

  useEffect(() => {
    const handleLeave = () => {
      if (currentCallIdRef.current) {
        socket.emit("call_end", {
          callId: currentCallIdRef.current,
          partnerId: incomingCallData ? (incomingCallData.caller?._id || incomingCallData.caller?.id) : partnerId,
          conversationId: incomingCallData?.conversationId || conversationId
        });
      }
    };
    window.addEventListener("beforeunload", handleLeave);
    return () => window.removeEventListener("beforeunload", handleLeave);
  }, [socket, incomingCallData, partnerId, conversationId]);

  useEffect(() => {
    if (!socket || !socket.connected) return;

    socket.on("call_created", (data) => {
      currentCallIdRef.current = data.callId;
    });

    socket.on("call_accepted", async (data) => {
      setCallStatus("connected");
      currentCallIdRef.current = data.callId;
      await startMedia();
      createPeerConnection(data.receiverId);

      try {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit("webrtc_offer", { receiverId: data.receiverId, offer, callId: currentCallIdRef.current });
      } catch (e) {
        console.error("Lỗi tạo Offer:", e);
      }
    });

    socket.on("webrtc_offer", async (data) => {
      setCallStatus("connected");
      await startMedia();
      createPeerConnection(data.senderId);

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        processIceQueue();

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        socket.emit("webrtc_answer", { receiverId: data.senderId, answer, callId: data.callId });
      } catch (e) {
        console.error("Lỗi xử lý Offer:", e);
      }
    });

    socket.on("webrtc_answer", async (data) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc && pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          processIceQueue();
        }
      } catch (e) {
        console.error("Lỗi xử lý Answer:", e);
      }
    });

    socket.on("webrtc_ice_candidate", async (data) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          iceCandidateQueue.current.push(data.candidate);
        }
      } catch (err) {
        console.error("Lỗi addIceCandidate:", err);
      }
    });

    socket.on("call_ended", (data) => {
      endCallUI();
    });

    socket.on("call_rejected", () => {
      endCallUI();
    });

    socket.on("call_timeout", () => {
      endCallUI();
    });
    socket.on("call_busy", () => {
      alert("Người dùng đang bận");
      endCallUI();
    });

    return () => {
      socket.off("call_created");
      socket.off("call_accepted");
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
      socket.off("call_ended");
      socket.off("call_rejected");
      socket.off("call_timeout");
      socket.off("call_busy");
    };
  }, [socket]);

  const createPeerConnection = (targetId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc_ice_candidate", {
          receiverId: targetId, candidate: event.candidate, callId: currentCallIdRef.current
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        endCallUI();
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
  };

  const acceptCall = () => {
    if (!incomingCallData) return;
    setCallStatus("connecting");
    socket.emit("call_accept", {
      callId: incomingCallData.callId,
      callerId: incomingCallData.caller?._id || incomingCallData.caller?.id
    });
  };

  const rejectCall = () => {
    socket.emit("call_reject", {
      callId: incomingCallData?.callId,
      callerId: incomingCallData?.caller?._id || incomingCallData?.caller?.id,
      conversationId: incomingCallData?.conversationId || conversationId
    });
    endCallUI();
  };

  const endCall = () => {
    socket.emit("call_end", {
      callId: currentCallIdRef.current,
      partnerId: incomingCallData ? (incomingCallData.caller?._id || incomingCallData.caller?.id) : partnerId,
      conversationId: incomingCallData?.conversationId || conversationId
    });
    endCallUI();
  };

  const endCallUI = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) peerConnectionRef.current.close();

    iceCandidateQueue.current = [];
    setCallStatus("idle");
    setIncomingCallData(null);
    currentCallIdRef.current = null;
    onClose();
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMicOn(prev => !prev);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsCameraOn(prev => !prev);
  };

  if (callStatus === "idle") return null;

  const displayUser = (() => {
    // 📞 người nhận → hiển thị caller
    if (incomingCallData?.caller) return incomingCallData.caller;

    // 📞 người gọi → hiển thị partner (đã fix ở trên)
    if (partnerInfo) return partnerInfo;

    return null;
  })();

  // Format Status Text Zalo Style
  let statusText = "";
  if (callStatus === "calling") statusText = callType === "video" ? "Đang gọi video..." : "Đang gọi thoại...";
  if (callStatus === "ringing") statusText = "Đang đổ chuông...";
  if (callStatus === "connecting") statusText = "Đang kết nối...";
  if (callStatus === "connected" && callType === "audio") statusText = "00:00"; // Tương lai bạn có thể gắn đếm giờ vào đây

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 overflow-hidden"
      style={{ backgroundColor: "#242424", zIndex: 9999, fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* 1. REMOTE VIDEO (LỚP NỀN DƯỚI CÙNG NẾU LÀ VIDEO CALL) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          objectFit: "cover",
          opacity: (callStatus === "connected" && callType === "video") ? 1 : 0,
          transition: "opacity 0.3s ease",
          zIndex: 1
        }}
      />

      {/* 2. LAYER THÔNG TIN BỀ MẶT (ẢNH ĐẠI DIỆN + TÊN) */}
      {/* Ẩn cục avatar khổng lồ này đi nếu đang trong cuộc gọi video để nhường chỗ cho hình ảnh đối tác */}
      {!(callStatus === "connected" && callType === "video") && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center" style={{ zIndex: 2 }}>
          <div className="position-relative mb-4">
            <div
              className="rounded-circle overflow-hidden shadow-lg"
              style={{ width: "140px", height: "140px", border: "2px solid rgba(255,255,255,0.1)" }}
            >
              {displayUser?.avatar ? (
                <img src={displayUser.avatar} alt="avatar" className="w-100 h-100 object-fit-cover" />
              ) : (
                <div className="w-100 h-100 bg-secondary d-flex align-items-center justify-content-center text-white fs-1">
                  {displayUser?.fullName?.charAt(0) || "U"}
                </div>
              )}
            </div>
            {/* Hiệu ứng gợn sóng khi gọi thoại */}
            {callStatus === "connected" && callType === "audio" && (
              <div className="position-absolute top-50 start-50 translate-middle rounded-circle border border-success border-3"
                style={{ width: "160px", height: "160px", opacity: 0.5, animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
            )}
          </div>
          <h2 className="text-white fw-medium mb-1" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
            {displayUser?.fullName || displayUser?.username || displayUser?.name || "User"}
          </h2>
          <p className="text-white-50 fs-6" style={{ letterSpacing: "0.5px" }}>{statusText}</p>
        </div>
      )}

      {/* INFO THU NHỎ GÓC TRÁI (KHI TRONG CUỘC GỌI VIDEO) */}
      {(callStatus === "connected" && callType === "video") && (
        <div className="position-absolute top-0 start-0 p-4" style={{ zIndex: 3, textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
          <h4 className="text-white mb-0">{displayUser?.fullName || "Người dùng"}</h4>
        </div>
      )}

      {/* 3. LOCAL VIDEO (CAM CỦA CHÍNH MÌNH TẠI GÓC DƯỚI PHẢI) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="position-absolute shadow-lg rounded-4"
        style={{
          width: "120px",
          height: "160px",
          bottom: "120px",
          right: "24px",
          objectFit: "cover",
          backgroundColor: "#000",
          border: "1.5px solid rgba(255,255,255,0.2)",
          display: (callStatus === "connected" && callType === "video") ? "block" : "none",
          zIndex: 4
        }}
      />

      {/* 4. KHU VỰC ĐIỀU KHIỂN (CONTROLS BAR Ở ĐÁY MÀN HÌNH) */}
      <div className="position-absolute bottom-0 start-0 w-100 pb-5 d-flex justify-content-center align-items-center gap-4" style={{ zIndex: 5 }}>

        {/* TRẠNG THÁI GỌI ĐI (CALLING) */}
        {callStatus === "calling" && (
          <button
            className="btn rounded-circle shadow-lg d-flex justify-content-center align-items-center"
            style={{ width: "64px", height: "64px", backgroundColor: "#ff4d4f", color: "white" }}
            onClick={endCall}
            title="Hủy cuộc gọi"
          >
            <FaPhoneSlash size={24} />
          </button>
        )}

        {/* TRẠNG THÁI CUỘC GỌI ĐẾN (RINGING) */}
        {callStatus === "ringing" && (
          <>
            <button
              className="btn rounded-circle shadow-lg d-flex justify-content-center align-items-center"
              style={{ width: "64px", height: "64px", backgroundColor: "#ff4d4f", color: "white" }}
              onClick={rejectCall}
              title="Từ chối"
            >
              <FaPhoneSlash size={24} />
            </button>
            <button
              className="btn rounded-circle shadow-lg d-flex justify-content-center align-items-center"
              style={{ width: "64px", height: "64px", backgroundColor: "#28a745", color: "white", animation: "bounce 1s infinite" }}
              onClick={acceptCall}
              title="Nghe máy"
            >
              <FaPhone size={24} />
            </button>
          </>
        )}

        {/* TRẠNG THÁI ĐÃ KẾT NỐI (CONNECTED/CONNECTING) */}
        {(callStatus === "connected" || callStatus === "connecting") && (
          <>
            {/* Nút bật/tắt Mic */}
            <button
              className="btn rounded-circle shadow border-0 d-flex justify-content-center align-items-center"
              style={{
                width: "56px", height: "56px",
                backgroundColor: isMicOn ? "rgba(255,255,255,0.2)" : "white",
                color: isMicOn ? "white" : "black",
                backdropFilter: "blur(10px)",
                transition: "all 0.2s"
              }}
              onClick={toggleMic}
            >
              {isMicOn ? <FaMicrophone size={22} /> : <FaMicrophoneSlash size={22} />}
            </button>

            {/* Nút bật/tắt Camera (Chỉ hiện khi gọi Video) */}
            {callType === "video" && (
              <button
                className="btn rounded-circle shadow border-0 d-flex justify-content-center align-items-center"
                style={{
                  width: "56px", height: "56px",
                  backgroundColor: isCameraOn ? "rgba(255,255,255,0.2)" : "white",
                  color: isCameraOn ? "white" : "black",
                  backdropFilter: "blur(10px)",
                  transition: "all 0.2s"
                }}
                onClick={toggleCamera}
              >
                {isCameraOn ? <FaVideo size={22} /> : <FaVideoSlash size={22} />}
              </button>
            )}

            {/* Nút Cúp Máy */}
            <button
              className="btn rounded-circle shadow-lg d-flex justify-content-center align-items-center"
              style={{ width: "64px", height: "64px", backgroundColor: "#ff4d4f", color: "white" }}
              onClick={endCall}
            >
              <FaPhoneSlash size={26} />
            </button>
          </>
        )}
      </div>

      {/* CHÚT CSS CHO HIỆU ỨNG RUNG CHUÔNG & SÓNG ÂM */}
      <style>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
          40% {transform: translateY(-10px);}
          60% {transform: translateY(-5px);}
        }
        @keyframes ping {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
});

export default VideoCall;