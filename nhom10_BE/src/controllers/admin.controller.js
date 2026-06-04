const adminService = require('../services/admin.service');

const ok = (res, data = true) => res.json({ success: true, data });
const fail = (res, error) => res.status(400).json({ success: false, message: error.message });

module.exports = {
  dashboard: async (req, res) => {
    try { ok(res, await adminService.dashboard()); } catch (error) { fail(res, error); }
  },
  listUsers: async (req, res) => {
    try { ok(res, await adminService.listUsers(req.query.q || '', req.query.activity || '')); } catch (error) { fail(res, error); }
  },
  userDetail: async (req, res) => {
    try { ok(res, await adminService.userDetail(req.params.id)); } catch (error) { fail(res, error); }
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
  authManagement: async (req, res) => {
    try { ok(res, await adminService.authManagement()); } catch (error) { fail(res, error); }
  },
  revokeSession: async (req, res) => {
    try { ok(res, await adminService.revokeSession(req.params.userId)); } catch (error) { fail(res, error); }
  },
  messages: async (req, res) => {
    try { ok(res, await adminService.messages()); } catch (error) { fail(res, error); }
  },
  messageStats: async (req, res) => {
    try { ok(res, await adminService.messageStats()); } catch (error) { fail(res, error); }
  },
  groups: async (req, res) => {
    try { ok(res, await adminService.groups(req.query.messageActivity || '')); } catch (error) { fail(res, error); }
  },
  groupDetail: async (req, res) => {
    try { ok(res, await adminService.groupDetail(req.params.id)); } catch (error) { fail(res, error); }
  },
  lockGroup: async (req, res) => {
    try { ok(res, await adminService.lockGroup(req.params.id, req.body.reason)); } catch (error) { fail(res, error); }
  },
  unlockGroup: async (req, res) => {
    try { ok(res, await adminService.unlockGroup(req.params.id)); } catch (error) { fail(res, error); }
  },
  dissolveGroup: async (req, res) => {
    try { ok(res, await adminService.dissolveGroup(req.params.id, req.body.reason)); } catch (error) { fail(res, error); }
  },
  deleteGroup: async (req, res) => {
    try { ok(res, await adminService.deleteGroup(req.params.id, req.body.reason)); } catch (error) { fail(res, error); }
  },
  statistics: async (req, res) => {
    try { ok(res, await adminService.statistics()); } catch (error) { fail(res, error); }
  }
};
