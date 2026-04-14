// src/components/sidebar/SearchBar.jsx
import React from 'react';

const SearchBar = ({ value, onChange, placeholder = "Tìm kiếm bạn bè, nhóm..." }) => {
  return (
    <div className="relative w-full">
      {/* 1. Icon kính lúp (cố định bên trái) */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg 
          className="w-4 h-4 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* 2. Ô nhập liệu (Input) */}
      <input
        type="text"
        className="w-full pl-10 pr-10 py-2 bg-gray-100 border border-transparent rounded-full text-sm text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {/* 3. Nút Xóa (Clear button - chỉ hiện khi có text) */}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')} // Trả về chuỗi rỗng để xóa text
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
          title="Xóa tìm kiếm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;