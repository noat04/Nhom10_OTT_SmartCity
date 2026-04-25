// hooks/useWebRTC.js
import { useRef } from "react";
import socket from "../socket/socket";

export default function useWebRTC() {
  const localStream = useRef(null);
  const peerConnection = useRef(null);

  const startLocalStream = async () => {
    localStream.current = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    return localStream.current;
  };

  const createPeer = (targetUserId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    });

    peerConnection.current = pc;

    // send ICE
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:ice-candidate", {
          to: targetUserId,
          candidate: event.candidate
        });
      }
    };

    return pc;
  };

  return {
    localStream,
    peerConnection,
    startLocalStream,
    createPeer
  };
}