import React, { useState, useRef, useEffect } from "react";
import { FaPaperPlane, FaRobot } from "react-icons/fa";
import { askPublicServiceAI, getAiMessagesAPI } from "../api/aiAPI";

export default function ChatAI({ selected, onNewSessionCreated }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // 1. TỰ ĐỘNG LOAD LỊCH SỬ KHI CHỌN SESSION
    // Trong ChatAI.js
    useEffect(() => {
        const loadHistory = async () => {
            // KIỂM TRA: Chỉ gọi API nếu ID đúng định dạng hex 24 ký tự (ObjectId thật)
            const isRealId = selected?._id && /^[0-9a-fA-F]{24}$/.test(selected._id);

            if (selected?.isAI && isRealId) {
                setIsLoading(true);
                try {
                    const res = await getAiMessagesAPI(selected._id);
                    if (res?.success) {
                        const history = res.data.map(msg => ({
                            _id: msg._id,
                            content: msg.content,
                            isBot: msg.role === 'model',
                            createdAt: msg.createdAt
                        }));
                        setMessages(history);
                    }
                } catch (error) {
                    console.error("❌ Lỗi tải lịch sử:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Nếu là "Đoạn chat mới" (ID tạm có timestamp), xóa trắng màn hình và hiện lời chào
                setMessages([{
                    _id: "init_msg",
                    content: "Xin chào! Tôi là Trợ lý Dịch vụ Công. Tôi có thể giúp gì cho bạn hôm nay?",
                    isBot: true,
                    createdAt: new Date().toISOString(),
                }]);
            }
        };

        loadHistory();
    }, [selected]); // useEffect sẽ chạy lại khi selected đổi (bao gồm cả ID tạm mới)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // 2. GỬI TIN NHẮN (CẬP NHẬT TRUYỀN SESSION ID)
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput("");

        const newUserMsg = {
            _id: Date.now().toString(),
            content: userText,
            isBot: false,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, newUserMsg]);
        setIsLoading(true);

        try {
            // Kiểm tra xem ID có phải là ObjectId của MongoDB không (24 ký tự hex)
            // Lưu ý: selected._id lúc này có thể là "new_ai_chat_12345..."
            const sId = (selected?._id && /^[0-9a-fA-F]{24}$/.test(selected._id))
                ? selected._id
                : null;

            const res = await askPublicServiceAI(userText, sId);

            if (res?.sessionId && !sId) {
                onNewSessionCreated(res.sessionId);
                // Quan trọng: Gán lại ID vào selected để tin nhắn tiếp theo trong cùng tab này dùng luôn
                selected._id = res.sessionId;
            }

            if (res && res.success) {
                const botMsg = {
                    _id: (Date.now() + 1).toString(),
                    content: res.data,
                    isBot: true,
                    createdAt: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, botMsg]);
            } else {
                const botErrorMsg = {
                    _id: (Date.now() + 1).toString(),
                    content: res?.message || "Hệ thống AI đang quá tải. Thử lại sau nhé!",
                    isBot: true,
                    createdAt: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, botErrorMsg]);
            }
        } catch (error) {
            const crashMsg = {
                _id: (Date.now() + 1).toString(),
                content: "Lỗi kết nối máy chủ!",
                isBot: true,
                createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, crashMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!selected?.isAI) return null;

    return (
        <div className="col-9 d-flex flex-column p-0 bg-light" style={{ height: "100vh" }}>
            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center p-3 bg-white border-bottom shadow-sm">
                <div className="d-flex align-items-center">
                    <div className="rounded-circle me-3 d-flex justify-content-center align-items-center" style={{ width: "45px", height: "45px", backgroundColor: "#0284c7" }}>
                        <FaRobot size={22} color="#fff" />
                    </div>
                    <div>
                        <h5 className="mb-0 fw-bold">{selected.title || "Trợ lý Dịch vụ Công"}</h5>
                        <small className="text-success fw-medium">● Đang hoạt động (Bot)</small>
                    </div>
                </div>
            </div>

            {/* MESSAGE LIST */}
            <div className="flex-grow-1 p-3 overflow-auto" style={{ backgroundColor: "#f8f9fa" }}>
                {messages.map((msg) => {
                    const isMe = !msg.isBot;
                    return (
                        <div key={msg._id} className={`d-flex mb-3 ${isMe ? "justify-content-end" : "justify-content-start"}`}>
                            {!isMe && (
                                <div className="rounded-circle me-2 d-flex justify-content-center align-items-center flex-shrink-0" style={{ width: "35px", height: "35px", backgroundColor: "#0284c7" }}>
                                    <FaRobot size={16} color="#fff" />
                                </div>
                            )}
                            <div className={`p-3 rounded-4 shadow-sm ${isMe ? "bg-primary text-white" : "bg-white text-dark"}`} style={{ maxWidth: "70%", borderTopRightRadius: isMe ? "4px" : "16px", borderTopLeftRadius: isMe ? "16px" : "4px" }}>
                                <span style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{msg.content}</span>
                            </div>
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="d-flex mb-3 justify-content-start align-items-end">
                        <div className="rounded-circle me-2 d-flex justify-content-center align-items-center flex-shrink-0" style={{ width: "35px", height: "35px", backgroundColor: "#0284c7" }}>
                            <FaRobot size={16} color="#fff" />
                        </div>
                        <div className="p-3 bg-white text-dark rounded-4 shadow-sm">
                            <div className="spinner-grow spinner-grow-sm text-secondary me-1"></div>
                            <div className="spinner-grow spinner-grow-sm text-secondary me-1"></div>
                            <div className="spinner-grow spinner-grow-sm text-secondary"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="p-3 bg-white border-top">
                <div className="input-group" style={{ borderRadius: "24px", overflow: "hidden", border: "1px solid #dee2e6" }}>
                    <input
                        type="text"
                        className="form-control border-0 px-4 py-3"
                        placeholder="Hỏi trợ lý ảo..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        style={{ boxShadow: "none" }}
                    />
                    <button className="btn btn-primary px-4" onClick={handleSend} disabled={!input.trim() || isLoading}>
                        <FaPaperPlane size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}