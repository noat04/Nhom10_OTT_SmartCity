const express = require("express");
const router = express.Router();
const friendController = require("../controllers/friend.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.use(verifyToken);

router.post("/request", friendController.sendFriendRequest);
router.put("/accept/:requestId", friendController.acceptFriendRequest);
router.put("/reject/:requestId", friendController.rejectFriendRequest);
router.get("/list", friendController.getFriends);
router.get("/requests", friendController.getFriendRequests);
router.get("/profile/:friendId", friendController.getFriendProfile);
router.delete("/remove/:friendId", friendController.removeFriend);
router.get("/search", friendController.searchUsers);

module.exports = router;