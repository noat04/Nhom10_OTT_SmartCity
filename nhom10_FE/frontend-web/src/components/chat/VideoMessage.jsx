import React from 'react';

const VideoMessage = ({ url }) => {
  return (
    <div className="relative overflow-hidden rounded-xl bg-black/5 flex items-center justify-center">
      <video 
        controls 
        className="max-w-full h-auto object-contain max-h-[300px] rounded-xl outline-none"
        //preload="metadata": CỰC KỲ QUAN TRỌNG
        // Chỉ tải trước thông tin video (độ dài, kích thước), KHÔNG tải cả video.
        // Giúp app không bị lag và không tốn băng thông của user khi cuộn qua lại.
        preload="metadata" 
      >
        {/* Hỗ trợ linh hoạt các định dạng video phổ biến */}
        <source src={url} type="video/mp4" />
        <source src={url} type="video/webm" />
        <source src={url} type="video/ogg" />
        
        {/* Dòng chữ này sẽ hiện ra nếu trình duyệt quá cũ không hỗ trợ thẻ video */}
        <div className="p-4 text-sm text-gray-500 text-center">
          Trình duyệt của bạn không hỗ trợ phát video trực tiếp. <br/>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
            Nhấn vào đây để tải về
          </a>
        </div>
      </video>
    </div>
  );
};

export default VideoMessage;