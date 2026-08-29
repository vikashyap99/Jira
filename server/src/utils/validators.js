const Joi = require('joi');

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid id',
    'string.length': 'Invalid id length',
  }),
});

const auth = {
  signup: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(72).required(),
    firstName: Joi.string().trim().max(60).allow('', null),
    lastName: Joi.string().trim().max(60).allow('', null),
    phone: Joi.string().trim().allow('', null),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
  refresh: Joi.object({
    refreshToken: Joi.string().required(),
  }),
  updateMe: Joi.object({
    firstName: Joi.string().trim().max(60).allow('', null),
    lastName: Joi.string().trim().max(60).allow('', null),
    phone: Joi.string().trim().allow('', null),
    avatarUrl: Joi.string().uri().allow('', null),
  }),
};

const workspace = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    description: Joi.string().trim().max(1000).allow('', null),
  }),
  update: Joi.object({
    name: Joi.string().trim().min(1).max(120),
    description: Joi.string().trim().max(1000).allow('', null),
    logoUrl: Joi.string().uri().allow('', null),
  }),
  addMember: Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid('owner', 'reviewer', 'member').default('member'),
  }),
  updateMemberRole: Joi.object({
    role: Joi.string().valid('owner', 'reviewer', 'member').required(),
  }),
  joinByCode: Joi.object({
    inviteCode: Joi.string().trim().required(),
  }),
};

const board = {
  create: Joi.object({
    workspace: Joi.string().hex().length(24).required(),
    name: Joi.string().trim().min(1).max(120).required(),
    description: Joi.string().trim().max(1000).allow('', null),
  }),
  update: Joi.object({
    name: Joi.string().trim().min(1).max(120),
    description: Joi.string().trim().max(1000).allow('', null),
  }),
};

const column = {
  create: Joi.object({
    board: Joi.string().hex().length(24).required(),
    name: Joi.string().trim().min(1).max(120).required(),
    color: Joi.string().allow('', null),
    wipLimit: Joi.number().integer().min(0).allow(null),
  }),
  update: Joi.object({
    name: Joi.string().trim().min(1).max(120),
    color: Joi.string().allow('', null),
    wipLimit: Joi.number().integer().min(0).allow(null),
  }),
  reorder: Joi.object({
    orderedIds: Joi.array().items(Joi.string().hex().length(24)).required(),
  }),
};

const ticket = {
  create: Joi.object({
    board: Joi.string().hex().length(24).required(),
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().allow('', null),
    assignees: Joi.array().items(Joi.string().hex().length(24)).default([]),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    labels: Joi.array().items(Joi.string().trim().max(50)).default([]),
    dueDate: Joi.date().allow(null),
    column: Joi.string().hex().length(24).allow(null),
  }),
  update: Joi.object({
    title: Joi.string().trim().min(1).max(200),
    description: Joi.string().allow('', null),
    assignees: Joi.array().items(Joi.string().hex().length(24)),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    labels: Joi.array().items(Joi.string().trim().max(50)),
    dueDate: Joi.date().allow(null),
    column: Joi.string().hex().length(24).allow(null),
  }),
  move: Joi.object({
    column: Joi.string().hex().length(24).required(),
    order: Joi.number().integer().min(0),
  }),
  query: Joi.object({
    workspace: Joi.string().hex().length(24),
    board: Joi.string().hex().length(24),
    column: Joi.string().hex().length(24),
    assignee: Joi.string().hex().length(24),
    reporter: Joi.string().hex().length(24),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    label: Joi.string().trim(),
    q: Joi.string().trim(),
    sortBy: Joi.string().valid('priority', 'dueDate', 'createdAt', 'updatedAt', 'order'),
    sortDir: Joi.string().valid('asc', 'desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const comment = {
  create: Joi.object({
    body: Joi.string().trim().min(1).max(5000).required(),
  }),
  update: Joi.object({
    body: Joi.string().trim().min(1).max(5000).required(),
  }),
};

module.exports = { auth, workspace, board, column, ticket, comment, idParam };
