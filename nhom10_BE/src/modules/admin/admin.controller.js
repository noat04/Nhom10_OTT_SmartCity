const adminService = require('./admin.service');

const ok = (res, data = true) => res.json({ success: true, data });
const fail = (res, error) => res.status(400).json({ success: false, message: error.message });

module.exports = {
  dashboard: async (req, res) => {
    try { ok(res, await adminService.dashboard()); } catch (error) { fail(res, error); }
  },
  listUsers: async (req, res) => {
    try { ok(res, await adminService.listUsers(req.query.q || '')); } catch (error) { fail(res, error); }
  },
  userDetail: async (req, res) => {
    try { ok(res, await adminService.userDetail(req.params.id)); } catch (error) { fail(res, error); }
  },
  updateUser: async (req, res) => {
    try { ok(res, await adminService.updateUser(req.params.id, req.body)); } catch (error) { fail(res, error); }
  },
  lockUser: async (req, res) => {
    try { ok(res, await adminService.lockUser(req.params.id, req.body.reason)); } catch (error) { fail(res, error); }
  },
  unlockUser: async (req, res) => {
    try { ok(res, await adminService.unlockUser(req.params.id)); } catch (error) { fail(res, error); }
  },
  deleteUser: async (req, res) => {
    try { ok(res, await adminService.deleteUser(req.params.id)); } catch (error) { fail(res, error); }
  },
  resetPassword: async (req, res) => {
    try { ok(res, await adminService.resetPassword(req.params.id, req.body.newPassword)); } catch (error) { fail(res, error); }
  },
  authManagement: async (req, res) => {
    try { ok(res, await adminService.authManagement()); } catch (error) { fail(res, error); }
  },
  revokeSession: async (req, res) => {
    try { ok(res, await adminService.revokeSession(req.params.userId)); } catch (error) { fail(res, error); }
  },
  friends: async (req, res) => {
    try { ok(res, await adminService.friends(req.query.status)); } catch (error) { fail(res, error); }
  },
  deleteFriendRequest: async (req, res) => {
    try { ok(res, await adminService.deleteFriendRequest(req.params.id)); } catch (error) { fail(res, error); }
  },
  messages: async (req, res) => {
    try { ok(res, await adminService.messages()); } catch (error) { fail(res, error); }
  },
  messageStats: async (req, res) => {
    try { ok(res, await adminService.messageStats()); } catch (error) { fail(res, error); }
  },
  groups: async (req, res) => {
    try { ok(res, await adminService.groups()); } catch (error) { fail(res, error); }
  },
  groupDetail: async (req, res) => {
    try { ok(res, await adminService.groupDetail(req.params.id)); } catch (error) { fail(res, error); }
  },
  lockGroup: async (req, res) => {
    try { ok(res, await adminService.lockGroup(req.params.id, req.body.reason)); } catch (error) { fail(res, error); }
  },
  deleteGroup: async (req, res) => {
    try { ok(res, await adminService.deleteGroup(req.params.id)); } catch (error) { fail(res, error); }
  },
  reports: async (req, res) => {
    ok(res, { reports: [], note: 'Project hien tai chua co model bao cao vi pham.' });
  },
  statistics: async (req, res) => {
    try { ok(res, await adminService.statistics()); } catch (error) { fail(res, error); }
  }
};
