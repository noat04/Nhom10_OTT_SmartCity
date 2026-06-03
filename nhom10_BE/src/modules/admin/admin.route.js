const express = require('express');
const router = express.Router();

const adminController = require('./admin.controller');
const { verifyToken } = require('../../shared/middlewares/auth.middleware');
const { requireAdmin } = require('./admin.middleware');

router.use(verifyToken, requireAdmin);

router.get('/dashboard', adminController.dashboard);

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.userDetail);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/lock', adminController.lockUser);
router.patch('/users/:id/unlock', adminController.unlockUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/reset-password', adminController.resetPassword);

router.get('/auth', adminController.authManagement);
router.post('/auth/revoke/:userId', adminController.revokeSession);

router.get('/friends', adminController.friends);
router.delete('/friends/:id', adminController.deleteFriendRequest);

router.get('/messages', adminController.messages);
router.get('/messages/stats', adminController.messageStats);

router.get('/groups', adminController.groups);
router.get('/groups/:id', adminController.groupDetail);
router.patch('/groups/:id/lock', adminController.lockGroup);
router.delete('/groups/:id', adminController.deleteGroup);

router.get('/reports', adminController.reports);
router.get('/statistics', adminController.statistics);

module.exports = router;
