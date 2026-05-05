import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from "react-native-webrtc";

let peer = null;
let localStream = null;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ],
};

// 👉 Thêm tham số callType vào đầu tiên
export const createPeer = async (callType, onAddStream, onIce) => {
  peer = new RTCPeerConnection(config);

  localStream = await mediaDevices.getUserMedia({
    audio: true,
    video: callType === "video", // 👉 NẾU LÀ AUDIO THÌ SẼ LÀ FALSE -> KHÔNG BẬT CAMERA
  });

  localStream.getTracks().forEach(track => {
    peer.addTrack(track, localStream);
  });

  peer.ontrack = (event) => {
    onAddStream(event.streams[0]);
  };

  peer.onicecandidate = (event) => {
    if (event.candidate) onIce(event.candidate);
  };

  return { peer, localStream };
};

export const createOffer = async () => {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  return offer;
};

export const createAnswer = async (offer) => {
  await peer.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  return answer;
};

export const setRemoteAnswer = async (answer) => {
  await peer.setRemoteDescription(new RTCSessionDescription(answer));
};

export const addIce = async (candidate) => {
  await peer.addIceCandidate(new RTCIceCandidate(candidate));
};

export const closePeer = () => {
  if (peer) peer.close();
};