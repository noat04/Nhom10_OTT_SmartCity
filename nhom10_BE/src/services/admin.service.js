const mongoose = require('mongoose');

const User = require('../models/user');
const Message = require('../models/message');
const Conversation = require('../models/conversation');
const Friend = require('../models/friend');
const OTP = require('../models/otp.model');
const LoginLog = require('../models/loginLog');

const toId = (id) => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
const getMemberUserId = (member) => {
  const user = member?.user || member;
  return user?._id || user?.id || user;
};
const getSocketIO = () => {
  try {
    return require('../utils/socket').getIO();
  } catch (error) {
    return null;
  }
};
const emitGroupRealtime = (event, group, payload = {}) => {
  const io = getSocketIO();
  if (!io || !group) return;

  const groupId = group._id?.toString();
  const data = { conversationId: groupId, group, ...payload };

  if (groupId) io.to(groupId).emit(event, data);

  (group.members || []).forEach((member) => {
    const userId = getMemberUserId(member);
    if (!userId) return;
    io.to(userId.toString()).emit(event, data);
    io.to(userId.toString()).emit('conversation_updated', data);
  });
};
const requiredReason = (reason, action) => {
  const value = String(reason || '').trim();
  if (!value) throw new Error(`Vui long nhap ly do ${action}`);
  return value;
};
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
      newUsersToday,
      userGrowth,
      messageTraffic
    };
  }

  async listUsers(q = '', activity = '') {
    const keyword = q.trim();
    const since = addDays(new Date(), -30);
    const query = keyword ? {
      $or: [
        { username: new RegExp(keyword, 'i') },
        { fullName: new RegExp(keyword, 'i') },
        { email: new RegExp(keyword, 'i') },
        { phone: new RegExp(keyword, 'i') }
      ]
    } : {};

    if (activity === 'recent') {
      const loginRows = await LoginLog.aggregate([
        { $match: { status: 'success', createdAt: { $gte: since } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$userId', lastLoginAt: { $first: '$createdAt' }, loginCount: { $sum: 1 } } },
        { $sort: { loginCount: -1, lastLoginAt: -1 } },
        { $limit: 20 }
      ]);

      const userIds = loginRows.map((row) => row._id).filter(Boolean);
      const users = await User.find({ ...query, _id: { $in: userIds } });
      const userMap = new Map(users.map((user) => [user._id.toString(), user]));

      return loginRows
        .map((row) => {
          const user = userMap.get(row._id?.toString());
          if (!user) return null;
          return { ...publicUser(user), lastLoginAt: row.lastLoginAt, loginCount30Days: row.loginCount };
        })
        .filter(Boolean);
    }

    if (activity === 'inactive') {
      const activeIds = await LoginLog.distinct('userId', { status: 'success', createdAt: { $gte: since } });
      query._id = { $nin: activeIds };
    }

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

  async lockUser(id, reason) {
    const lockReason = requiredReason(reason, 'khoa nguoi dung');
    await User.findByIdAndUpdate(id, {
      isLocked: true,
      lockReason,
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
    const io = getSocketIO();
    if (io) {
      io.to(userId.toString()).emit('force_logout', {
        reason: 'SESSION_REVOKED',
        message: 'Phien dang nhap da bi thu hoi'
      });
    }
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

  async groups(messageActivity = '') {
    const since = addDays(new Date(), -30);
    const query = { type: 'group' };

    if (messageActivity === 'active') {
      const activeGroupIds = await Message.distinct('conversationId', { createdAt: { $gte: since } });
      query._id = { $in: activeGroupIds };
    }

    if (messageActivity === 'inactive') {
      const activeGroupIds = await Message.distinct('conversationId', { createdAt: { $gte: since } });
      query._id = { $nin: activeGroupIds };
    }

    return Conversation.find(query).populate('createdBy', 'username fullName email').populate('members.user', 'username fullName email avatar status').sort({ updatedAt: -1 }).limit(200);
  }

  async groupDetail(id) {
    const group = await Conversation.findOne({ _id: id, type: 'group' }).populate('createdBy', 'username fullName email').populate('members.user', 'username fullName email avatar status');
    const activity = await Message.find({ conversationId: id }).select('_id senderId type systemType status createdAt updatedAt isDeleted isUnsent').populate('senderId', 'username fullName email').sort({ createdAt: -1 }).limit(50);
    return { group, members: group?.members || [], admins: group?.members?.filter((m) => m.role === 'admin') || [], activity };
  }

  async lockGroup(id, reason) {
    const lockReason = requiredReason(reason, 'khoa nhom chat');
    const group = await Conversation.findByIdAndUpdate(id, {
      isActive: false,
      'settings.onlyAdminCanSend': true,
      adminLockReason: lockReason,
      adminLockedAt: new Date()
    }, { new: true }).populate('createdBy', 'username fullName email').populate('members.user', 'username fullName email avatar status');
    emitGroupRealtime('group_locked', group, { reason: lockReason });
    return true;
  }

  async unlockGroup(id) {
    const group = await Conversation.findByIdAndUpdate(id, {
      isActive: true,
      'settings.onlyAdminCanSend': false,
      adminLockReason: '',
      adminLockedAt: null
    }, { new: true }).populate('createdBy', 'username fullName email').populate('members.user', 'username fullName email avatar status');
    emitGroupRealtime('group_unlocked', group);
    return true;
  }

  async dissolveGroup(id, reason) {
    const dissolveReason = requiredReason(reason, 'giai tan nhom chat');
    const groupBefore = await Conversation.findById(id).populate('createdBy', 'username fullName email').populate('members.user', 'username fullName email avatar status');
    const group = await Conversation.findByIdAndUpdate(id, {
      isActive: false,
      members: [],
      adminDissolveReason: dissolveReason,
      adminDissolvedAt: new Date()
    }, { new: true }).populate('createdBy', 'username fullName email').populate('members.user', 'username fullName email avatar status');
    emitGroupRealtime('group_dissolved', { ...(group?.toObject?.() || group || {}), members: groupBefore?.members || [] }, { reason: dissolveReason });
    return true;
  }

  async deleteGroup(id, reason) {
    const groupId = toId(id);
    if (!groupId) throw new Error('Group id khong hop le');

    const deleteReason = requiredReason(reason, 'xoa nhom chat');
    const groupBefore = await Conversation.findById(groupId).populate('createdBy', 'username fullName email').populate('members.user', 'username fullName email avatar status');
    await Conversation.findByIdAndUpdate(groupId, {
      isActive: false,
      members: [],
      adminDeletedReason: deleteReason,
      adminDeletedAt: new Date()
    });
    await Message.deleteMany({ conversationId: groupId });
    await Conversation.findByIdAndDelete(groupId);
    emitGroupRealtime('group_deleted', groupBefore, { reason: deleteReason });
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
