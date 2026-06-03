import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  deleteAdminFriend,
  deleteAdminGroup,
  deleteAdminUser,
  getAdminAuth,
  getAdminDashboard,
  getAdminFriends,
  getAdminGroupDetail,
  getAdminGroups,
  getAdminMessageStats,
  getAdminMessages,
  getAdminReports,
  getAdminStatistics,
  getAdminUserDetail,
  getAdminUsers,
  lockAdminGroup,
  lockAdminUser,
  resetAdminUserPassword,
  revokeAdminSession,
  unlockAdminUser,
  updateAdminUser
} from "../api/adminApi";
import "./AdminPage.css";

import {
  asArray,
  Badge,
  Chart,
  formatDate,
  GroupDetail,
  messageReceiverName,
  roleText,
  statusText,
  storageText,
  Table,
  tabs,
  typeText,
  UserDetail,
  userName,
} from "../components/admin/AdminCommon";
export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({});
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [messageLimit, setMessageLimit] = useState(20);

  const isAdmin = user?.role === "admin" || user?.isAdmin;

  useEffect(() => {
    if (!isAdmin) navigate("/", { replace: true });
  }, [isAdmin, navigate]);

  const title = useMemo(() => tabs.find(([key]) => key === tab)?.[1] || "Admin", [tab]);

  const load = async () => {
    setLoading(true);
    setError("");
    setData(tab === "users" || tab === "friends" || tab === "groups" ? [] : {});
    if (tab === "messages") setMessageLimit(20);
    try {
      if (tab === "dashboard") setData((await getAdminDashboard()).data);
      if (tab === "users") setData((await getAdminUsers(query)).data);
      if (tab === "auth") setData((await getAdminAuth()).data);
      if (tab === "friends") setData((await getAdminFriends()).data);
      if (tab === "messages") {
        const [messages, stats] = await Promise.all([getAdminMessages(), getAdminMessageStats()]);
        setData({ messages: messages.data, stats: stats.data });
      }
      if (tab === "groups") setData((await getAdminGroups()).data);
      if (tab === "reports") {
        const [reports, statistics] = await Promise.all([getAdminReports(), getAdminStatistics()]);
        setData({ reports: reports.data, statistics: statistics.data });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Không tải được dữ liệu admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin]);

  const refresh = async () => load();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderDashboard = () => (
    <>
      <div className="admin-grid admin-cards">
        {[
          ["Tổng người dùng", data.totalUsers],
          ["Đang online", data.onlineUsers],
          ["Tin nhắn hôm nay", data.messagesToday],
          ["Tổng nhóm chat", data.totalGroups],
          ["Báo cáo vi phạm", data.violationReports],
          ["Người dùng mới", data.newUsersToday]
        ].map(([label, value]) => (
          <div className="admin-card" key={label}>
            <div className="admin-label">{label}</div>
            <div className="admin-number">{value ?? 0}</div>
          </div>
        ))}
      </div>
      <div className="admin-grid admin-two">
        <section className="admin-panel">
          <h2>Biểu đồ tăng trưởng user</h2>
          <Chart data={data.userGrowth} xLabel="Ngày đăng ký" yLabel="Số người dùng" />
        </section>
        <section className="admin-panel">
          <h2>Biểu đồ tin nhắn theo ngày</h2>
          <Chart data={data.messageTraffic} xLabel="Ngày gửi" yLabel="Số tin nhắn" />
        </section>
      </div>
    </>
  );

  const viewUser = async (id) => {
    const res = await getAdminUserDetail(id);
    setSelected(res.data);
  };

  const renderUsers = () => (
    <section className="admin-panel">
      <div className="admin-toolbar">
        <input className="admin-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, email, số điện thoại" />
        <button className="admin-btn primary" onClick={refresh}>Tìm kiếm</button>
        <button className="admin-btn" onClick={() => setQuery("")}>Xóa lọc</button>
      </div>
      <Table headers={["Họ tên", "Email", "Trạng thái", "Vai trò", "Tạo lúc", "Chức năng"]}>
        {asArray(data).map((item) => (
          <tr key={item.id}>
            <td>{userName(item)}</td>
            <td>{item.email}</td>
            <td>{item.isLocked ? <Badge type="danger">Đã khóa</Badge> : <Badge type={item.status === "online" ? "ok" : ""}>{statusText[item.status] || item.status}</Badge>}</td>
            <td>{roleText[item.role] || item.role}</td>
            <td>{formatDate(item.createdAt)}</td>
            <td className="admin-actions">
              <button className="admin-btn" onClick={() => viewUser(item.id)}>Chi tiết</button>
              <button className="admin-btn" onClick={() => editUser(item)}>Cập nhật</button>
              {item.isLocked ? (
                <button className="admin-btn primary" onClick={async () => { await unlockAdminUser(item.id); refresh(); }}>Mở khóa</button>
              ) : (
                <button className="admin-btn warn" onClick={async () => { await lockAdminUser(item.id, prompt("Lý do khóa") || "Khóa bởi admin"); refresh(); }}>Khóa</button>
              )}
              <button className="admin-btn" onClick={async () => { const pw = prompt("Mật khẩu mới"); if (pw) await resetAdminUserPassword(item.id, pw); }}>Đặt lại MK</button>
              <button className="admin-btn danger" onClick={async () => { if (confirm("Xóa tài khoản này?")) { await deleteAdminUser(item.id); refresh(); } }}>Xóa</button>
            </td>
          </tr>
        ))}
      </Table>
      {selected && <UserDetail detail={selected} onClose={() => setSelected(null)} />}
    </section>
  );

  const editUser = async (item) => {
    const fullName = prompt("Họ tên", item.fullName || "");
    if (fullName === null) return;
    const phone = prompt("Số điện thoại", item.phone || "");
    if (phone === null) return;
    await updateAdminUser(item.id, { fullName, phone });
    refresh();
  };

  const renderAuth = () => (
    <>
      <section className="admin-panel">
        <h2>Nhật ký đăng nhập</h2>
        <Table headers={["Người dùng", "Email", "IP", "Thiết bị", "Trạng thái", "Thời gian"]}>
          {(data.loginLogs || []).map((item) => (
            <tr key={item._id}>
              <td>{userName(item.userId)}</td>
              <td>{item.email}</td>
              <td>{item.ip || "-"}</td>
              <td>{item.userAgent || "-"}</td>
              <td><Badge type={item.status === "success" ? "ok" : "warn"}>{statusText[item.status] || item.status}</Badge></td>
              <td>{formatDate(item.createdAt)}</td>
            </tr>
          ))}
        </Table>
      </section>
      <section className="admin-panel">
        <h2>Quản lý OTP và JWT</h2>
        <Table headers={["Loại", "Thông tin", "Trạng thái", "Chức năng"]}>
          {(data.otpList || []).map((item) => (
            <tr key={item._id}>
              <td>OTP</td>
              <td>{item.email}</td>
              <td>Hết hạn: {formatDate(item.expiresAt)}</td>
              <td>-</td>
            </tr>
          ))}
          {(data.tokenUsers || []).map((item) => (
            <tr key={item.id}>
              <td>JWT</td>
              <td>{item.email}</td>
              <td><Badge type="ok">Đang hoạt động</Badge></td>
              <td><button className="admin-btn warn" onClick={async () => { await revokeAdminSession(item.id); refresh(); }}>Thu hồi phiên</button></td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );

  const renderFriends = () => (
    <section className="admin-panel">
      <h2>Quản lý bạn bè</h2>
      <Table headers={["Người gửi", "Người nhận", "Trạng thái", "Cập nhật", "Chức năng"]}>
        {asArray(data).map((item) => (
          <tr key={item._id}>
            <td>{userName(item.userId)}</td>
            <td>{userName(item.friendId)}</td>
            <td><Badge type={item.status === "accepted" ? "ok" : "warn"}>{statusText[item.status] || item.status}</Badge></td>
            <td>{formatDate(item.updatedAt)}</td>
            <td><button className="admin-btn danger" onClick={async () => { await deleteAdminFriend(item._id); refresh(); }}>Xóa / Hủy kết bạn</button></td>
          </tr>
        ))}
      </Table>
    </section>
  );

  const renderMessages = () => (
    <>
      <div className="admin-grid admin-two">
        <section className="admin-panel">
          <h2>Tin nhắn/ngày</h2>
          <Chart data={data.stats?.daily} xLabel="Ngày gửi" yLabel="Số tin nhắn" />
        </section>
        <section className="admin-panel">
          <h2>Tin nhắn theo user</h2>
          <Table headers={["Người dùng", "Email", "Số tin"]}>
            {(data.stats?.byUser || []).map((item) => (
              <tr key={item._id || item.user?.email}>
                <td>{userName(item.user)}</td>
                <td>{item.user?.email}</td>
                <td>{item.count}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
      <section className="admin-panel">
        <h2>Siêu dữ liệu tin nhắn cá nhân</h2>
        <p className="admin-muted admin-panel-note">
          Đang hiển thị {Math.min(messageLimit, data.messages?.length || 0)} / {data.messages?.length || 0} tin nhắn gần nhất.
        </p>
        <Table headers={["Người gửi", "Người nhận / Nhóm", "Loại", "Trạng thái đọc", "Đã gửi lúc", "Siêu dữ liệu"]} scroll>
          {(data.messages || []).slice(0, messageLimit).map((item) => (
            <tr key={item._id}>
              <td>{userName(item.senderId)}</td>
              <td>{messageReceiverName(item)}</td>
              <td>{typeText[item.type] || item.type}</td>
              <td>{statusText[item.status] || item.status}</td>
              <td>{formatDate(item.createdAt)}</td>
              <td>seen: {item.seenBy?.length || 0}, delivered: {item.deliveredTo?.length || 0}</td>
            </tr>
          ))}
        </Table>
        {messageLimit < (data.messages?.length || 0) && (
          <div className="admin-load-more">
            <button className="admin-btn primary" onClick={() => setMessageLimit((current) => current + 20)}>
              Xem thêm
            </button>
          </div>
        )}
      </section>
    </>
  );

  const viewGroup = async (id) => {
    const res = await getAdminGroupDetail(id);
    setSelected(res.data);
  };

  const renderGroups = () => (
    <section className="admin-panel">
      <h2>Quản lý nhóm chat</h2>
      <Table headers={["Tên nhóm", "Chủ nhóm", "Thành viên", "Trạng thái", "Chức năng"]}>
        {asArray(data).map((item) => (
          <tr key={item._id}>
            <td>{item.name || "Nhóm không tên"}</td>
            <td>{userName(item.createdBy)}</td>
            <td>{item.members?.length || 0}</td>
            <td><Badge type={item.isActive === false ? "danger" : "ok"}>{item.isActive === false ? "Đã khóa" : "Đang hoạt động"}</Badge></td>
            <td className="admin-actions">
              <button className="admin-btn" onClick={() => viewGroup(item._id)}>Chi tiết</button>
              <button className="admin-btn warn" onClick={async () => { await lockAdminGroup(item._id, prompt("Lý do khóa") || "Khóa bởi admin"); refresh(); }}>Khóa</button>
              <button className="admin-btn danger" onClick={async () => { if (confirm("Giải tán / xóa nhóm?")) { await deleteAdminGroup(item._id); refresh(); } }}>Giải tán</button>
            </td>
          </tr>
        ))}
      </Table>
      {selected?.group && <GroupDetail detail={selected} onClose={() => setSelected(null)} />}
    </section>
  );

  const renderReports = () => {
    const stats = data.statistics || {};
    return (
      <>
        <div className="admin-grid admin-cards">
          <div className="admin-card"><div className="admin-label">DAU</div><div className="admin-number">{stats.dau || 0}</div></div>
          <div className="admin-card"><div className="admin-label">MAU</div><div className="admin-number">{stats.mau || 0}</div></div>
          <div className="admin-card"><div className="admin-label">Báo cáo vi phạm</div><div className="admin-number">{data.reports?.reports?.length || 0}</div></div>
        </div>
        <div className="admin-grid admin-two">
          <section className="admin-panel"><h2>Tăng trưởng người dùng</h2><Chart data={stats.userGrowth} xLabel="Ngày đăng ký" yLabel="Số người dùng" /></section>
          <section className="admin-panel"><h2>Lưu lượng tin nhắn</h2><Chart data={stats.messageTraffic} xLabel="Ngày gửi" yLabel="Số tin nhắn" /></section>
          <section className="admin-panel"><h2>Nhóm mới tạo</h2><Chart data={stats.newGroupsByDay} xLabel="Ngày tạo" yLabel="Số nhóm" /></section>
          <section className="admin-panel"><h2>Lời mời kết bạn</h2><Chart data={stats.friendRequestsByDay} xLabel="Ngày gửi" yLabel="Số lời mời" /></section>
        </div>
        <section className="admin-panel">
          <h2>Dung lượng lưu trữ</h2>
          <Table headers={["Loại dữ liệu", "Số lượng"]}>
            {(stats.storageUsage || []).map((item) => <tr key={item.label}><td>{storageText[item.label] || item.label}</td><td>{item.count}</td></tr>)}
          </Table>
        </section>
      </>
    );
  };

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>SmartCity OTT Admin</strong>
          <span>{userName(user)}</span>
        </div>
        <nav className="admin-nav">
          {tabs.map(([key, label]) => (
            <button key={key} className={tab === key ? "active" : ""} onClick={() => { setSelected(null); setTab(key); }}>
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>{title}</h1>
            <p>Quản trị hệ thống chat</p>
          </div>
          <div className="admin-header-actions">
            <button className="admin-btn" onClick={() => navigate("/")}>Về trang chat</button>
            <button className="admin-btn danger" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </header>
        <div className="admin-content">
          {error && <div className="admin-alert">{error}</div>}
          {loading && <div className="admin-alert">Đang tải dữ liệu...</div>}
          {tab === "dashboard" && renderDashboard()}
          {tab === "users" && renderUsers()}
          {tab === "auth" && renderAuth()}
          {tab === "friends" && renderFriends()}
          {tab === "messages" && renderMessages()}
          {tab === "groups" && renderGroups()}
          {tab === "reports" && renderReports()}
        </div>
      </main>
    </div>
  );
}

