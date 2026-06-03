export const tabs = [
  ["dashboard", "Tổng quan"],
  ["users", "Người dùng"],
  ["auth", "Xác thực"],
  ["friends", "Bạn bè"],
  ["messages", "Tin nhắn"],
  ["groups", "Nhóm chat"],
  ["reports", "Báo cáo"]
];

export const formatDate = (value) => value ? new Date(value).toLocaleString("vi-VN") : "-";
export const userName = (user) => user?.fullName || user?.username || user?.email || "-";
export const messageReceiverName = (message) => {
  if (message?.receiverName) return message.receiverName;

  const conversation = message?.conversationId;
  if (!conversation) return "-";
  if (conversation.type === "group") return conversation.name || "Nhóm không tên";

  const senderId = message.senderId?._id || message.senderId?.id;
  const receiver = conversation.members
    ?.map((member) => member.user)
    .find((member) => String(member?._id || member?.id) !== String(senderId));

  return userName(receiver);
};
export const statusText = {
  online: "Đang online",
  offline: "Ngoại tuyến",
  accepted: "Đã chấp nhận",
  pending: "Đang chờ",
  rejected: "Đã từ chối",
  blocked: "Đã chặn",
  success: "Thành công",
  failed: "Thất bại",
  revoked: "Đã thu hồi",
  sent: "Đã gửi",
  delivered: "Đã nhận",
  seen: "Đã đọc",
  active: "Đang hoạt động",
  locked: "Đã khóa"
};

export const typeText = {
  text: "Văn bản",
  image: "Hình ảnh",
  video: "Video",
  file: "Tệp",
  call: "Cuộc gọi",
  system: "Hệ thống"
};

export const roleText = {
  admin: "Quản trị viên",
  user: "Người dùng"
};

export const storageText = {
  Users: "Người dùng",
  Messages: "Tin nhắn",
  Groups: "Nhóm chat"
};

export const asArray = (value) => Array.isArray(value) ? value : [];

export function Chart({ data = [], xLabel = "Ngày", yLabel = "Số lượng" }) {
  const chartData = asArray(data);
  const max = Math.max(1, ...chartData.map((item) => item.count || 0));
  const middle = Math.ceil(max / 2);

  return (
    <div className="admin-chart-frame">
      <div className="admin-y-title">{yLabel}</div>
      <div className="admin-chart-area">
        <div className="admin-y-axis" aria-hidden="true">
          <span>{max}</span>
          <span>{middle}</span>
          <span>0</span>
        </div>
        <div className="admin-chart">
          {chartData.map((item) => (
            <div className="admin-bar-wrap" key={item.date || item.label}>
              <div
                className="admin-bar"
                title={`${item.date || item.label}: ${item.count}`}
                style={{ height: `${Math.max(4, ((item.count || 0) / max) * 100)}%` }}
              >
                <span>{item.count || 0}</span>
              </div>
              <small>{item.date ? item.date.slice(5) : item.label}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="admin-x-title">{xLabel}</div>
    </div>
  );
}

export function Badge({ children, type = "" }) {
  return <span className={`admin-badge ${type}`}>{children}</span>;
}


export function Table({ headers, children, scroll = false }) {
  return (
    <div className={`admin-table-wrap ${scroll ? "admin-table-scroll" : ""}`}>
      <table className="admin-table">
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function UserDetail({ detail, onClose }) {
  return (
    <section className="admin-panel">
      <h2>Chi tiết người dùng</h2>
      <div className="admin-detail">
        <p><b>Họ tên:</b> {userName(detail.profile)}</p>
        <p><b>Email:</b> {detail.profile?.email}</p>
        <p><b>Bạn bè:</b> {detail.friends?.length || 0}</p>
        <p><b>Nhóm tham gia:</b> {detail.groups?.length || 0}</p>
        <p><b>Thiết bị đăng nhập:</b> {detail.loginDevices?.length || 0}</p>
        <p><b>Hoạt động gần đây:</b> {detail.activity?.length || 0}</p>
      </div>
      <button className="admin-btn" onClick={onClose}>Đóng</button>
    </section>
  );
}

export function GroupDetail({ detail, onClose }) {
  return (
    <section className="admin-panel">
      <h2>Chi tiết nhóm</h2>
      <div className="admin-detail">
        <p><b>Tên nhóm:</b> {detail.group?.name}</p>
        <p><b>Chủ nhóm:</b> {userName(detail.group?.createdBy)}</p>
        <p><b>Thành viên:</b> {detail.members?.length || 0}</p>
        <p><b>Quản trị viên:</b> {detail.admins?.length || 0}</p>
        <p><b>Lịch sử hoạt động:</b> {detail.activity?.length || 0}</p>
      </div>
      <button className="admin-btn" onClick={onClose}>Đóng</button>
    </section>
  );
}

