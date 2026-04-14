import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

const ChatInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); 
  const [showEmoji, setShowEmoji] = useState(false);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiRef = useRef(null); 

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearTimeout(typingTimeoutRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [previewUrl]);

  const handleChange = (e) => {
    setMessage(e.target.value);
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 1500);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 👉 SỬA 1: Nâng giới hạn lên 50MB cho Video
      if (file.size > 50 * 1024 * 1024) {
        alert("File quá lớn, vui lòng chọn file dưới 50MB.");
        e.target.value = null;
        return;
      }

      setSelectedFile(file);
      
      // 👉 SỬA 2: Tạo Preview URL cho CẢ ẢNH VÀ VIDEO
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
    e.target.value = null; 
  };

  const handleSend = () => {
    if (message.trim() || selectedFile) {
      
      // 👉 SỬA 3: Phân loại đúng msgType (image, video, hoặc file)
      let msgType = 'text';
      if (selectedFile) {
        if (selectedFile.type.startsWith('image/')) msgType = 'image';
        else if (selectedFile.type.startsWith('video/')) msgType = 'video';
        else msgType = 'file';
      }

      onSendMessage({
        content: message.trim(),
        file: selectedFile, 
        type: msgType
      });

      setMessage('');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setShowEmoji(false);
      
      if (onTyping) {
        clearTimeout(typingTimeoutRef.current);
        onTyping(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); 
      handleSend();
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 relative">
      
      {showEmoji && (
        <div className="absolute bottom-16 right-4 z-50 shadow-xl" ref={emojiRef}>
          <EmojiPicker 
            onEmojiClick={onEmojiClick} 
            searchDisabled={true} 
            skinTonesDisabled={true}
            height={350}
          />
        </div>
      )}

      {selectedFile && (
        <div className="mb-3 flex items-end relative w-max">
          <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 flex flex-col items-center shadow-sm">
            {previewUrl ? (
              // 👉 SỬA 4: Render giao diện Preview tùy theo Video hay Ảnh
              selectedFile.type.startsWith('video/') ? (
                <video src={previewUrl} className="h-20 w-auto rounded object-cover mb-1 bg-black" />
              ) : (
                <img src={previewUrl} alt="Preview" className="h-20 w-auto rounded object-contain mb-1" />
              )
            ) : (
              <svg className="w-8 h-8 text-blue-500 mb-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-xs text-gray-600 truncate max-w-[150px]" title={selectedFile.name}>
              {selectedFile.name}
            </span>
          </div>
          <button 
            onClick={() => {
              setSelectedFile(null);
              setPreviewUrl(null);
            }}
            className="absolute -top-2 -right-2 bg-white text-red-500 hover:text-white hover:bg-red-500 rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-colors border border-gray-200"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <button
          onClick={() => fileInputRef.current.click()}
          className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors focus:outline-none shrink-0"
          title="Đính kèm file hoặc ảnh"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
          </svg>
        </button>
        
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*, video/*, .pdf, .doc, .docx, .xls, .xlsx, .txt, .zip"
        />

        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className={`p-2 rounded-full transition-colors focus:outline-none shrink-0 ${showEmoji ? 'text-yellow-500 bg-yellow-50' : 'text-gray-500 hover:text-yellow-500 hover:bg-yellow-50'}`}
          title="Thả biểu tượng cảm xúc"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </button>

        <input
          type="text"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          className="flex-1 bg-gray-100 text-gray-900 placeholder-gray-500 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all min-w-0"
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() && !selectedFile}
          className={`p-2.5 rounded-full transition-colors focus:outline-none shrink-0 flex items-center justify-center ${
            message.trim() || selectedFile
              ? 'text-white bg-blue-500 hover:bg-blue-600 shadow-md'
              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
          }`}
        >
          <svg className="w-5 h-5 translate-x-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;