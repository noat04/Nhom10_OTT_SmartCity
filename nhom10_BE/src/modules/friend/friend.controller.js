const mongoose = require("mongoose");
const Friend = require("../../../models/friend");
const User = require("../../../models/user");
const NotificationService = require("../../services/notification.service");
const chatService = require("../chat/chat.service");
const Conversation = require("../../../models/conversation");

class FriendController {
  async sendFriendRequest(req, res) {
    try {
      const { receiverId } = req.body;
      const senderId = req.user.id || req.user._id;

      if (!receiverId) {
        return res.status(400).json({
          success: false,
          message: "Thiếu receiverId",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(receiverId)) {
        return res.status(400).json({
          success: false,
          message: "receiverId không hợp lệ",
        });
      }

      if (senderId.toString() === receiverId.toString()) {
        return res.status(400).json({
          success: false,
          message: "Không thể tự kết bạn với chính mình",
        });
      }

      const [sender, receiver] = await Promise.all([
        User.findById(senderId).select("-password"),
        User.findById(receiverId).select("-password"),
      ]);

      if (!receiver) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng nhận lời mời",
        });
      }

      const existingFriendship = await Friend.findOne({
        $or: [
          { userId: senderId, friendId: receiverId },
          { userId: receiverId, friendId: senderId },
        ],
      });

      if (existingFriendship) {
        if (existingFriendship.status === "accepted") {
          return res.status(400).json({
            success: false,
            message: "Hai người đã là bạn bè",
          });
        }

        if (existingFriendship.status === "pending") {
          return res.status(400).json({
            success: false,
            message: "Yêu cầu kết bạn đã tồn tại",
          });
        }

        if (existingFriendship.status === "blocked") {
          return res.status(400).json({
            success: false,
            message: "Không thể gửi lời mời cho người dùng này",
          });
        }

        if (existingFriendship.status === "rejected") {
          existingFriendship.userId = senderId;
          existingFriendship.friendId = receiverId;
          existingFriendship.status = "pending";
          await existingFriendship.save();

          await NotificationService.createNotification({
            userId: receiverId,
            senderId: senderId,
            type: "friend_request",
            content: `${
              sender?.fullName || sender?.username || "Ai đó"
            } đã gửi lời mời kết bạn cho bạn`,
            data: {
              requestId: existingFriendship._id,
              senderId,
            },
          });

          const socketUtil = require("../../shared/utils/socket");
          const io = socketUtil.getIO();

          const populatedRequest = await Friend.findById(existingFriendship._id)
            .populate("userId", "-password");

          io.to(receiverId.toString()).emit("friend_request_received", {
            success: true,
            data: populatedRequest,
          });

          io.to(receiverId.toString()).emit("new_notification", {
            success: true,
            data: {
              type: "friend_request",
              requestId: existingFriendship._id,
              senderId,
            },
          });

          io.to(senderId.toString()).emit("friend_request_sent", {
            success: true,
            data: {
              requestId: existingFriendship._id,
              receiverId,
            },
          });

          return res.status(200).json({
            success: true,
            message: "Đã gửi lại lời mời kết bạn",
            data: existingFriendship,
          });
        }
      }

      const newRequest = await Friend.create({
        userId: senderId,
        friendId: receiverId,
        status: "pending",
      });

      await NotificationService.createNotification({
        userId: receiverId,
        senderId: senderId,
        type: "friend_request",
        content: `${
          sender?.fullName || sender?.username || "Ai đó"
        } đã gửi lời mời kết bạn cho bạn`,
        data: {
          requestId: newRequest._id,
          senderId,
        },
      });

      const socketUtil = require("../../shared/utils/socket");
      const io = socketUtil.getIO();

      const populatedRequest = await Friend.findById(newRequest._id)
        .populate("userId", "-password");

      io.to(receiverId.toString()).emit("friend_request_received", {
        success: true,
        data: populatedRequest,
      });

      io.to(receiverId.toString()).emit("new_notification", {
        success: true,
        data: {
          type: "friend_request",
          requestId: newRequest._id,
          senderId,
        },
      });

      io.to(senderId.toString()).emit("friend_request_sent", {
        success: true,
        data: {
          requestId: newRequest._id,
          receiverId,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Đã gửi lời mời kết bạn",
        data: newRequest,
      });
    } catch (error) {
      console.error("Lỗi gửi kết bạn:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async acceptFriendRequest(req, res) {
    try {
      const { requestId } = req.params;
      const currentUserId = req.user.id || req.user._id;

      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({
          success: false,
          message: "requestId không hợp lệ",
        });
      }

      const request = await Friend.findById(requestId);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy yêu cầu",
        });
      }

      if (request.friendId.toString() !== currentUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền thực hiện hành động này",
        });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Yêu cầu này không còn ở trạng thái pending",
        });
      }

      request.status = "accepted";
      await request.save();

      const senderId = request.userId;

      const conversationId = await chatService.getOrCreateOneToOneConversation(
        senderId,
        currentUserId
      );

      const [receiver, sender, conversation] = await Promise.all([
        User.findById(currentUserId).select("-password"),
        User.findById(senderId).select("-password"),
        Conversation.findById(conversationId)
          .populate("members.user", "fullName avatar status")
          .populate("latestMessage")
          .lean(),
      ]);

      await NotificationService.createNotification({
        userId: senderId,
        senderId: currentUserId,
        type: "friend_accepted",
        content: `${
          receiver?.fullName || receiver?.username || "Ai đó"
        } đã chấp nhận lời mời kết bạn`,
        data: {
          requestId: request._id,
          friendId: currentUserId,
          conversationId,
        },
      });

      const socketUtil = require("../../shared/utils/socket");
      const io = socketUtil.getIO();

      // event cũ
      io.to(senderId.toString()).emit("friend_request_accepted", {
        success: true,
        data: {
          requestId: request._id,
          conversationId,
          friend: receiver,
        },
      });

      io.to(senderId.toString()).emit("new_notification", {
        success: true,
        data: {
          type: "friend_accepted",
          requestId: request._id,
          friendId: currentUserId,
          conversationId,
        },
      });

      // event mới: báo cho cả 2 bên có conversation mới
      io.to(senderId.toString()).emit("conversation_created", {
        success: true,
        data: conversation,
      });

      io.to(currentUserId.toString()).emit("conversation_created", {
        success: true,
        data: conversation,
      });

      return res.status(200).json({
        success: true,
        message: "Đã trở thành bạn bè",
        data: {
          request,
          conversationId,
          conversation,
        },
      });
    } catch (error) {
      console.error("Lỗi chấp nhận kết bạn:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async rejectFriendRequest(req, res) {
    try {
      const { requestId } = req.params;
      const currentUserId = req.user.id || req.user._id;

      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({
          success: false,
          message: "requestId không hợp lệ",
        });
      }

      const request = await Friend.findById(requestId);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy yêu cầu",
        });
      }

      if (request.friendId.toString() !== currentUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền thực hiện hành động này",
        });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Yêu cầu này không còn ở trạng thái pending",
        });
      }

      request.status = "rejected";
      await request.save();

      const receiver = await User.findById(currentUserId).select("-password");

      await NotificationService.createNotification({
        userId: request.userId,
        senderId: currentUserId,
        type: "friend_rejected",
        content: `${
          receiver?.fullName || receiver?.username || "Ai đó"
        } đã từ chối lời mời kết bạn`,
        data: {
          requestId: request._id,
          friendId: currentUserId,
        },
      });

      const socketUtil = require("../../shared/utils/socket");
      const io = socketUtil.getIO();

      io.to(request.userId.toString()).emit("friend_request_rejected", {
        success: true,
        data: {
          requestId: request._id,
          friendId: currentUserId,
        },
      });

      io.to(request.userId.toString()).emit("new_notification", {
        success: true,
        data: {
          type: "friend_rejected",
          requestId: request._id,
          friendId: currentUserId,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Đã từ chối lời mời kết bạn",
        data: request,
      });
    } catch (error) {
      console.error("Lỗi từ chối kết bạn:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async getFriends(req, res) {
    try {
      const userId = req.user.id || req.user._id;

      const friendships = await Friend.find({
        $or: [{ userId }, { friendId: userId }],
        status: "accepted",
      });

      const friendIds = friendships.map((item) =>
        item.userId.toString() === userId.toString()
          ? item.friendId
          : item.userId
      );

      const friends = await User.find({
        _id: { $in: friendIds },
      }).select("-password");

      return res.status(200).json({
        success: true,
        count: friends.length,
        data: friends,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách bạn:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async getFriendProfile(req, res) {
    try {
      const currentUserId = req.user.id || req.user._id;
      const { friendId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(friendId)) {
        return res.status(400).json({
          success: false,
          message: "friendId không hợp lệ",
        });
      }

      const user = await User.findById(friendId).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      const friendship = await Friend.findOne({
        $or: [
          { userId: currentUserId, friendId },
          { userId: friendId, friendId: currentUserId },
        ],
      });

      return res.status(200).json({
        success: true,
        data: {
          ...user.toObject(),
          friendshipStatus: friendship ? friendship.status : "none",
          requestId: friendship ? friendship._id : null,
          isSender: friendship
            ? friendship.userId.toString() === currentUserId.toString()
            : false,
        },
      });
    } catch (error) {
      console.error("Lỗi xem profile người dùng:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async removeFriend(req, res) {
    try {
      const currentUserId = req.user.id || req.user._id;
      const { friendId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(friendId)) {
        return res.status(400).json({
          success: false,
          message: "friendId không hợp lệ",
        });
      }

      const friendship = await Friend.findOneAndDelete({
        $or: [
          { userId: currentUserId, friendId, status: "accepted" },
          { userId: friendId, friendId: currentUserId, status: "accepted" },
        ],
      });

      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy quan hệ bạn bè",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Đã xóa bạn bè thành công",
      });
    } catch (error) {
      console.error("Lỗi xóa bạn bè:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async getFriendRequests(req, res) {
    try {
      const userId = req.user.id || req.user._id;

      const received = await Friend.find({
        friendId: userId,
        status: "pending",
      }).populate("userId", "-password");

      const sent = await Friend.find({
        userId,
        status: "pending",
      }).populate("friendId", "-password");

      return res.status(200).json({
        success: true,
        data: {
          received,
          sent,
        },
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách lời mời:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async searchUsers(req, res) {
    try {
      const currentUserId = req.user.id || req.user._id;
      const { keyword } = req.query;

      if (!keyword || !keyword.trim()) {
        return res.status(400).json({
          success: false,
          message: "Thiếu email tìm kiếm",
        });
      }

      const trimmedKeyword = keyword.trim();

      const users = await User.find({
        _id: { $ne: currentUserId },
        email: { $regex: trimmedKeyword, $options: "i" },
      }).select("-password");

      const relations = await Friend.find({
        $or: [{ userId: currentUserId }, { friendId: currentUserId }],
      });

      const relationMap = new Map();

      relations.forEach((item) => {
        const otherUserId =
          item.userId.toString() === currentUserId.toString()
            ? item.friendId.toString()
            : item.userId.toString();

        relationMap.set(otherUserId, {
          requestId: item._id,
          status: item.status,
          isSender: item.userId.toString() === currentUserId.toString(),
        });
      });

      const result = users.map((user) => {
        const relation = relationMap.get(user._id.toString());

        return {
          ...user.toObject(),
          friendshipStatus: relation ? relation.status : "none",
          requestId: relation ? relation.requestId : null,
          isSender: relation ? relation.isSender : false,
        };
      });

      return res.status(200).json({
        success: true,
        count: result.length,
        data: result,
      });
    } catch (error) {
      console.error("Lỗi tìm kiếm user:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }
}

module.exports = new FriendController();