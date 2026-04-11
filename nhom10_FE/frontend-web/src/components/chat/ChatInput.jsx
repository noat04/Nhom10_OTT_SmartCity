import React, { useState, useRef, useEffect } from 'react';

const ChatInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Xử lý khi người dùng gõ phím
  const handleChange = (e) => {
    setMessage(e.target.value);

    // Kích hoạt trạng thái "đang gõ" lên socket
    if (onTyping) {
      onTyping(true);

      // Kỹ thuật Debounce: Tự động tắt trạng thái "đang gõ" sau 1.5s nếu không gõ tiếp
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  // Xử lý gửi tin nhắn
  const handleSend = () => {
    if (message.trim() || selectedFile) {
      // 💡 Truyền trực tiếp dữ liệu dạng chuỗi (text) và file lên component cha
      onSendMessage({
        content: message.trim(), // Sửa chữ 'text' thành 'content' cho tiện
        file: selectedFile,
        type: selectedFile ? 'file' : 'text' // Xác định loại tin nhắn
      });

      // Reset form sau khi gửi
      setMessage('');
      setSelectedFile(null);
      if (onTyping) {
        clearTimeout(typingTimeoutRef.current);
        onTyping(false);
      }
    }
  };

  // Bắt sự kiện nhấn "Enter" để gửi tin
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Ngăn không cho xuống dòng
      handleSend();
    }
  };

  // Kích hoạt input file ẩn khi bấm nút đính kèm
  const handleAttachmentClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Bạn có thể mở rộng để preview ảnh tại đây trước khi gửi
    }
    // Reset value để có thể chọn lại cùng một file nếu cần
    e.target.value = null; 
  };

  // Dọn dẹp timeout khi component unmount
  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      {/* Vùng hiển thị file đính kèm (Preview) nếu có */}
      {selectedFile && (
        <div className="mb-2 flex items-center bg-gray-50 p-2 rounded-lg border border-gray-200 w-max">
          <span className="text-sm text-gray-600 truncate max-w-xs">{selectedFile.name}</span>
          <button 
            onClick={() => setSelectedFile(null)}
            className="ml-2 text-red-500 hover:text-red-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Vùng nhập liệu chính */}
      <div className="flex items-center space-x-2">
        {/* Nút đính kèm file */}
        <button
          onClick={handleAttachmentClick}
          className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors focus:outline-none"
          title="Đính kèm file hoặc ảnh"
        >
          {/* Icon Paperclip (Ghim giấy) */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
          </svg>
        </button>

        {/* Thẻ input file ẩn */}
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*, .pdf, .doc, .docx" // Giới hạn loại file nếu cần
        />

        {/* Ô nhập text */}
        <input
          type="text"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          className="flex-1 bg-gray-100 text-gray-900 placeholder-gray-500 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
        />

        {/* Nút Gửi */}
        <button
          onClick={handleSend}
          disabled={!message.trim() && !selectedFile}
          className={`p-2 rounded-full transition-colors focus:outline-none ${
            message.trim() || selectedFile
              ? 'text-white bg-blue-500 hover:bg-blue-600 shadow-md'
              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
          }`}
        >
          {/* Icon Paper Airplane (Máy bay giấy) */}
          <svg className="w-5 h-5 translate-x-[1px] translate-y-[-1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;