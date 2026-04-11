// src/components/modals/CreateGroupModal.jsx
import React, { useState } from 'react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';

const CreateGroupModal = ({ isOpen, onClose, onCreate }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Dữ liệu giả lập danh sách bạn bè (thực tế sẽ gọi API lấy từ Node.js)
  const mockFriends = [
    { id: '1', name: 'Nguyễn Văn A', avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: '2', name: 'Trần Thị B', avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: '3', name: 'Lê Hoàng C', avatar: 'https://i.pravatar.cc/150?u=3' },
  ];

  if (!isOpen) return null;

  // Xử lý chọn/bỏ chọn bạn bè
  const toggleUser = (user) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      alert("Vui lòng nhập tên nhóm!");
      return;
    }
    if (selectedUsers.length < 2) {
      alert("Nhóm phải có ít nhất 3 người (bạn và 2 người khác)!");
      return;
    }
    // Gửi dữ liệu lên component cha xử lý API
    onCreate({ groupName, members: selectedUsers.map(u => u.id) });
  };

  // Lọc bạn bè theo từ khóa tìm kiếm
  const filteredFriends = mockFriends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Tạo nhóm chat mới</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Nhập tên nhóm */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhóm</label>
            <input 
              type="text" 
              placeholder="Nhập tên nhóm..." 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Tìm kiếm bạn bè */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thêm thành viên</label>
            <input 
              type="text" 
              placeholder="Tìm kiếm tên..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none mb-3"
            />

            {/* Vùng chọn bạn bè có thanh cuộn */}
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {filteredFriends.map((friend) => {
                const isSelected = selectedUsers.find((u) => u.id === friend.id);
                return (
                  <div 
                    key={friend.id}
                    onClick={() => toggleUser(friend)}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    <input 
                      type="checkbox" 
                      checked={!!isSelected} 
                      onChange={() => {}} // Dummy onChange để tránh React warning, logic nằm ở div bọc ngoài
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-3 pointer-events-none"
                    />
                    <Avatar src={friend.avatar} size="sm" />
                    <span className="ml-3 text-sm font-medium text-gray-700">{friend.name}</span>
                  </div>
                )
              })}
              {filteredFriends.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-500">Không tìm thấy kết quả.</div>
              )}
            </div>
          </div>

          {/* Hiển thị số lượng đã chọn */}
          {selectedUsers.length > 0 && (
            <div className="text-sm text-blue-600 font-medium">
              Đã chọn: {selectedUsers.length} người
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleCreate} disabled={!groupName.trim() || selectedUsers.length < 2}>
            Tạo nhóm
          </Button>
        </div>

      </div>
    </div>
  );
};

export default CreateGroupModal;