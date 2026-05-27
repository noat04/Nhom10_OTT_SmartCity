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

  // ✅ THÊM: State đếm giờ
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const currentCallIdRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const iceCandidateQueue = useRef([]);

  // ✅ THÊM: Hàm format giây -> MM:SS
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ✅ THÊM: Bắt đầu đếm giờ khi connected
  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // ✅ THÊM: Dừng đếm giờ
  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);
  };

  useImperativeHandle(ref, () => ({
    startCall: (type = "video", partner) => {
      setCallType(type);
      callTypeRef.current = type;

      const realUser =
        partner?.members
          ? partner.members.find(
            (m) => String(m._id) !== String(currentUser.id)
          )
          : partner;

      setPartnerInfo(realUser);

      const targetReceiverId = realUser?.user?._id || realUser?._id || realUser?.id || partnerId;

      console.log("🚀 ĐANG GỌI CHO APP CÓ ID LÀ:", targetReceiverId);

      if (!targetReceiverId) {
        alert("Lỗi: Không tìm thấy ID người nhận!");
        return;
      }
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

  // ✅ THÊM: Cleanup timer khi component unmount
  useEffect(() => {
    return () => stopCallTimer();
  }, []);

  useEffect(() => {
    if (!socket || !socket.connected) return;

    socket.on("call_created", (data) => {
      currentCallIdRef.current = data.callId;
    });

    socket.on("call_accepted", async (data) => {
      setCallStatus("connected");
      startCallTimer(); // ✅ Bắt đầu đếm giờ khi đối phương nghe máy
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
      pendingOfferRef.current = data;
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

  const acceptCall = async () => {
    if (!incomingCallData) return;

    setCallStatus("connecting");
    socket.emit("call_accept", {
      callId: incomingCallData.callId,
      callerId: incomingCallData.caller?._id || incomingCallData.caller?.id
    });

    setCallStatus("connected");
    startCallTimer(); // ✅ Bắt đầu đếm giờ khi mình nghe máy
    await startMedia();
    createPeerConnection(incomingCallData.caller?._id || incomingCallData.caller?.id);

    if (pendingOfferRef.current) {
      try {
        const data = pendingOfferRef.current;
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        processIceQueue();

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        socket.emit("webrtc_answer", { receiverId: data.senderId, answer, callId: data.callId });
        pendingOfferRef.current = null;
      } catch (e) {
        console.error("Lỗi xử lý Offer khi bấm Nghe:", e);
      }
    }
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
    stopCallTimer(); // ✅ Dừng và reset đồng hồ
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
    if (incomingCallData?.caller) return incomingCallData.caller;
    if (partnerInfo) return partnerInfo;
    return null;
  })();

  // ✅ SỬA: statusText dùng formatDuration thay vì hardcode "00:00"
  let statusText = "";
  if (callStatus === "calling") statusText = callType === "video" ? "Đang gọi video..." : "Đang gọi thoại...";
  if (callStatus === "ringing") statusText = "Đang đổ chuông...";
  if (callStatus === "connecting") statusText = "Đang kết nối...";
  if (callStatus === "connected") statusText = formatDuration(callDuration);

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 overflow-hidden"
      style={{ backgroundColor: "#242424", zIndex: 9999, fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* REMOTE VIDEO */}
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

      {/* AVATAR + TÊN + TRẠNG THÁI (ẩn khi đang video call) */}
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
            {callStatus === "connected" && callType === "audio" && (
              <div className="position-absolute top-50 start-50 translate-middle rounded-circle border border-success border-3"
                style={{ width: "160px", height: "160px", opacity: 0.5, animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
            )}
          </div>
          <h2 className="text-white fw-medium mb-1" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
            {displayUser?.fullName || displayUser?.username || displayUser?.name || "User"}
          </h2>
          {/* ✅ statusText giờ tự động cập nhật mỗi giây khi connected */}
          <p className="text-white-50 fs-6" style={{ letterSpacing: "0.5px" }}>{statusText}</p>
        </div>
      )}

      {/* INFO GÓC TRÁI KHI VIDEO CALL — hiển thị tên + đồng hồ */}
      {(callStatus === "connected" && callType === "video") && (
        <div className="position-absolute top-0 start-0 p-4" style={{ zIndex: 3, textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
          <h4 className="text-white mb-0">{displayUser?.fullName || "Người dùng"}</h4>
          {/* ✅ Hiển thị đồng hồ ngay dưới tên khi video call */}
          <p className="text-white-50 mb-0" style={{ fontSize: "14px", letterSpacing: "1px" }}>
            {formatDuration(callDuration)}
          </p>
        </div>
      )}

      {/* LOCAL VIDEO */}
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

      {/* CONTROLS */}
      <div className="position-absolute bottom-0 start-0 w-100 pb-5 d-flex justify-content-center align-items-center gap-4" style={{ zIndex: 5 }}>

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

        {(callStatus === "connected" || callStatus === "connecting") && (
          <>
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