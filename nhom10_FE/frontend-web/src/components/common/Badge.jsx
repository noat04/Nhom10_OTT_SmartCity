// Component dùng để hiển thị số lượng thông báo hoặc tin nhắn chưa đọc.
//  Tính năng nổi bật là tự động chuyển thành 99+ nếu số đếm quá lớn.
import React from 'react';

const Badge = ({ count = 0, max = 99, variant = 'danger' }) => {
  // Nếu không có tin nhắn/thông báo thì ẩn luôn
  if (count <= 0) return null;

  // Định dạng lại con số hiển thị
  const displayCount = count > max ? `${max}+` : count;

  // Các biến thể màu sắc
  const variantClasses = {
    danger: 'bg-red-500 text-white',
    primary: 'bg-blue-500 text-white',
    neutral: 'bg-gray-200 text-gray-800'
  };

  return (
    <span 
      className={`${variantClasses[variant]} text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] inline-flex items-center justify-center text-center`}
    >
      {displayCount}
    </span>
  );
};

export default Badge;