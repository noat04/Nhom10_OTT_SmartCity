const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const User = require('../models/user');
const Message = require('../models/message');
const Conversation = require('../models/conversation');
const Friend = require('../models/friend');
const OTP = require('../models/otp.model');
const LoginLog = require('../models/loginLog');

const toId = (id) => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
const startOfDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const publicUser = (user) => {
  if (!user) return null;
  const item = user.toObject ? user.toObject() : user;
  return {
    id: item._id,
    username: item.username,
    email: item.email,
    phone: item.phone,
    fullName: item.fullName,
    avatar: item.avatar,
    bio: item.bio,
    role: item.role,
    status: item.status,
    isLocked: Boolean(item.isLocked),
    isDeleted: Boolean(item.isDeleted),
    deletedAt: item.deletedAt,
    lockReason: item.lockReason,
    lockedAt: item.lockedAt,
    lastSeen: item.lastSeen,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    hasActiveToken: Boolean(item.currentToken || item.refreshToken)
  };
};

async function byDay(Model, match = {}, days = 14) {
  const from = addDays(startOfDay(), -(days - 1));
  const rows = await Model.aggregate([
    { $match: { createdAt: { $gte: from }, ...match } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const map = new Map(rows.map((row) => [row._id, row.count]));
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(from, index).toISOString().slice(0, 10);
    return { date, count: map.get(date) || 0 };
  });
}

class AdminService {
  async dashboard() {
    const today = startOfDay();
    const tomorrow = addDays(today, 1);
    const [totalUsers, onlineUsers, messagesToday, totalGroups, newUsersToday, userGrowth, messageTraffic] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'online' }),
      Message.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      Conversation.countDocuments({ type: 'group', isActive: { $ne: false } }),
      User.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      byDay(User),
      byDay(Message)
    ]);

    return {
      totalUsers,
      onlineUsers,
      messagesToday,
      totalGroups,
      violationReports: 0,
      newUsersToday,
      userGrowth,
      messageTraffic
    };
  }

  async listUsers(q = '') {
    const keyword = q.trim();
    const query = keyword ? {
      $or: [
        { username: new RegExp(keyword, 'i') },
        { fullName: new RegExp(keyword, 'i') },
        { email: new RegExp(keyword, 'i') },
        { phone: new RegExp(keyword, 'i') }
      ]
    } : {};

    const users = await User.find(query).sort({ createdAt: -1 }).limit(200);
    return users.map(publicUser);
  }

  async userDetail(id) {
    const userId = toId(id);
    if (!userId) throw new Error('User id khong hop le');

    const user = await User.findById(userId);
    const [friends, groups, activity, loginDevices] = await Promise.all([
      Friend.find({ $or: [{ userId }, { friendId: userId }] }).populate('userId friendId', 'username fullName email avatar status').sort({ updatedAt: -1 }),
      Conversation.find({ 'members.user': userId }).populate('createdBy', 'username fullName email').populate('members.user', 'username fullName email avatar status').sort({ updatedAt: -1 }),
      Message.find({ senderId: userId }).select('_id conversationId type status createdAt updatedAt deliveredTo seenBy isDeleted isUnsent').sort({ createdAt: -1 }).limit(30),
      LoginLog.find({ userId }).sort({ createdAt: -1 }).limit(20)
    ]);

    return { profile: publicUser(user), friends, groups, loginDevices, activity };
  }

  async updateUser(id, data) {
    const allow = ['username', 'email', 'phone', 'fullName', 'bio', 'role', 'status', 'avatar', 'coverImage'];
    const update = {};
    allow.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(data, key)) update[key] = data[key];
    });

    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    return publicUser(user);
  }

  async lockUser(id, reason) {
    await User.findByIdAndUpdate(id, {
      isLocked: true,
      lockReason: reason || 'Locked by admin',
      lockedAt: new Date(),
      currentToken: null,
      refreshToken: '',
      status: 'offline'
    });
    return true;
  }

  async unlockUser(id) {
    await User.findByIdAndUpdate(id, {
      isLocked: false,
      isDeleted: false,
      deletedAt: null,
      lockReason: '',
      lockedAt: null
    });
    return true;
  }

  async deleteUser(id) {
    const userId = toId(id);
    if (!userId) throw new Error('User id khong hop le');
    await User.findByIdAndDelete(userId);
    await Friend.deleteMany({ $or: [{ userId }, { friendId: userId }] });
    await Conversation.updateMany({ 'members.user': userId }, { $pull: { members: { user: userId } } });
    return true;
  }

  async resetPassword(id, newPassword) {
    if (!newPassword || newPassword.length < 6) throw new Error('Mat khau moi toi thieu 6 ky tu');
    const password = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(id, { password, currentToken: null, refreshToken: '' });
    return true;
  }

  async authManagement() {
    const [loginLogs, otpList, tokenUsers] = await Promise.all([
      LoginLog.find().populate('userId', 'username fullName email status').sort({ createdAt: -1 }).limit(200),
      OTP.find().select('email expiresAt createdAt updatedAt').sort({ createdAt: -1 }).limit(200),
      User.find({ currentToken: { $ne: null } }).select('username fullName email status lastSeen currentToken updatedAt').sort({ updatedAt: -1 })
    ]);
    return { loginLogs, otpList, tokenUsers: tokenUsers.map(publicUser) };
  }

  async revokeSession(userId) {
    await User.findByIdAndUpdate(userId, { currentToken: null, refreshToken: '', status: 'offline', lastSeen: new Date() });
    await LoginLog.create({ userId, status: 'revoked' });
    return true;
  }

  async friends(status) {
    const query = status ? { status } : {};
    return Friend.find(query).populate('userId', 'username fullName email avatar status').populate('friendId', 'username fullName email avatar status').sort({ updatedAt: -1 }).limit(300);
  }

  async deleteFriendRequest(id) {
    await Friend.findByIdAndDelete(id);
    return true;
  }

  async messages() {
    const messages = await Message.find()
      .select('_id conversationId senderId type status createdAt updatedAt deliveredTo seenBy isEdited isDeleted isUnsent fileName fileSize')
      .populate('senderId', 'username fullName email')
      .populate({
        path: 'conversationId',
        select: 'type name members',
        populate: {
          path: 'members.user',
          select: 'username fullName email'
        }
      })
      .sort({ createdAt: -1 })
      .limit(300);

    return messages.map((message) => {
      const item = message.toObject();
      const conversation = item.conversationId;
      const senderId = item.senderId?._id?.toString();

      if (conversation?.type === 'group') {
        item.receiverName = conversation.name || 'Nhóm không tên';
      } else {
        const receiver = conversation?.members
          ?.map((member) => member.user)
          .find((member) => member?._id?.toString() !== senderId);

        item.receiverName = receiver?.fullName || receiver?.username || receiver?.email || '-';
      }

      return item;
    });
  }

  async messageStats() {
    const monthlyStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [daily, monthly, byUser] = await Promise.all([
      byDay(Message, {}, 30),
      Message.countDocuments({ createdAt: { $gte: monthlyStart } }),
      Message.aggregate([
        { $group: { _id: '$senderId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { count: 1, 'user.username': 1, 'user.fullName': 1, 'user.email': 1 } }
      ])
    ]);
    return { daily, monthly, byUser };
  }

  async groups() {
    return Conversation.find({ type: 'group' }).populate('createdBy', 'username fullName email').populate('members.user', 'username fullName email avatar status').sort({ updatedAt: -1 }).limit(200);
  }

  async groupDetail(id) {
    const group = await Conversation.findOne({ _id: id, type: 'group' }).populate('createdBy', 'username fullName email').populate('members.user', 'username fullName email avatar status');
    const activity = await Message.find({ conversationId: id }).select('_id senderId type systemType status createdAt updatedAt isDeleted isUnsent').populate('senderId', 'username fullName email').sort({ createdAt: -1 }).limit(50);
    return { group, members: group?.members || [], admins: group?.members?.filter((m) => m.role === 'admin') || [], activity };
  }

  async lockGroup(id, reason) {
    await Conversation.findByIdAndUpdate(id, { isActive: false, 'settings.onlyAdminCanSend': true, adminLockReason: reason || 'Locked by admin' });
    return true;
  }

  async deleteGroup(id) {
    await Conversation.findByIdAndUpdate(id, { isActive: false, members: [] });
    return true;
  }

  async statistics() {
    const today = startOfDay();
    const activeSince = addDays(today, -30);
    const [dau, mau, messagesByDay, newGroupsByDay, friendRequestsByDay, userGrowth, messageTraffic] = await Promise.all([
      User.countDocuments({ lastSeen: { $gte: today } }),
      User.countDocuments({ lastSeen: { $gte: activeSince } }),
      byDay(Message, {}, 30),
      byDay(Conversation, { type: 'group' }, 30),
      byDay(Friend, {}, 30),
      byDay(User, {}, 30),
      byDay(Message, {}, 30)
    ]);
    return {
      dau,
      mau,
      messagesByDay,
      newGroupsByDay,
      friendRequestsByDay,
      userGrowth,
      messageTraffic,
      storageUsage: [
        { label: 'Users', count: await User.countDocuments() },
        { label: 'Messages', count: await Message.countDocuments() },
        { label: 'Groups', count: await Conversation.countDocuments({ type: 'group' }) }
      ]
    };
  }
}

module.exports = new AdminService();
