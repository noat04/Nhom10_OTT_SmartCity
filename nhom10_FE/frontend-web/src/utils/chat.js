export const groupMessagesByDate = (messages) => {
    const groups = {};

    messages.forEach((msg) => {
        const dateObj = new Date(msg.createdAt);
        
        // Format ngày chuẩn Việt Nam: DD/MM/YYYY
        const dateString = dateObj.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Tùy chọn nâng cao: Chuyển đổi thành "Hôm nay", "Hôm qua"
        const today = new Date().toLocaleDateString('vi-VN');
        let displayDate = dateString;
        if (dateString === today) {
            displayDate = "Hôm nay";
        }

        // Đưa tin nhắn vào nhóm tương ứng
        if (!groups[displayDate]) {
            groups[displayDate] = [];
        }
        groups[displayDate].push(msg);
    });

    return groups; 
    // Kết quả trả về dạng: { "Hôm nay": [{msg1}, {msg2}], "11/04/2026": [{msg3}] }
};