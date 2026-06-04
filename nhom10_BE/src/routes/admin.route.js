const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/admin.middleware');

router.use(verifyToken, requireAdmin);

router.get('/dashboard', adminController.dashboard);

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.userDetail);
router.patch('/users/:id/lock', adminController.lockUser);
router.patch('/users/:id/unlock', adminController.unlockUser);
router.delete('/users/:id', adminController.deleteUser);

router.get('/auth', adminController.authManagement);
router.post('/auth/revoke/:userId', adminController.revokeSession);

router.get('/messages', adminController.messages);
router.get('/messages/stats', adminController.messageStats);

router.get('/groups', adminController.groups);
router.get('/groups/:id', adminController.groupDetail);
router.patch('/groups/:id/lock', adminController.lockGroup);
router.patch('/groups/:id/unlock', adminController.unlockGroup);
router.patch('/groups/:id/dissolve', adminController.dissolveGroup);
router.delete('/groups/:id', adminController.deleteGroup);

router.get('/statistics', adminController.statistics);

module.exports = router;
