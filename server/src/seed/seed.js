const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const env = require('../config/env');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { WorkspaceMember } = require('../models/WorkspaceMember');
const Board = require('../models/Board');
const { Column, DEFAULT_COLUMNS } = require('../models/Column');
const { Ticket } = require('../models/Ticket');
const Comment = require('../models/Comment');

const PASSWORD = 'password123';

async function seed() {
  await mongoose.connect(env.mongodbUri);
  console.log('[seed] Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Workspace.deleteMany({}),
    WorkspaceMember.deleteMany({}),
    Board.deleteMany({}),
    Column.deleteMany({}),
    Ticket.deleteMany({}),
    Comment.deleteMany({}),
  ]);
  console.log('[seed] Cleared existing data');

  const hash = await bcrypt.hash(PASSWORD, 10);

  const owner = await User.create({
    email: 'owner@example.com',
    passwordHash: hash,
    firstName: 'Owner',
    lastName: 'One',
    phone: '+10000000001',
    emailVerified: true,
  });

  const reviewer = await User.create({
    email: 'reviewer@example.com',
    passwordHash: hash,
    firstName: 'Reviewer',
    lastName: 'Two',
    phone: '+10000000002',
    emailVerified: true,
  });

  const member = await User.create({
    email: 'member@example.com',
    passwordHash: hash,
    firstName: 'Member',
    lastName: 'Three',
    phone: '+10000000003',
    emailVerified: true,
  });

  const workspace = await Workspace.create({
    name: 'Acme Corp',
    description: 'Sample workspace for testing the ticket system',
    createdBy: owner._id,
    inviteCode: 'ACME123',
  });

  await WorkspaceMember.create([
    { workspace: workspace._id, user: owner._id, role: 'owner' },
    { workspace: workspace._id, user: reviewer._id, role: 'reviewer' },
    { workspace: workspace._id, user: member._id, role: 'member' },
  ]);

  const board = await Board.create({
    name: 'Product Roadmap',
    workspace: workspace._id,
    createdBy: owner._id,
    isDefault: true,
  });

  const columnRes = await Column.insertMany(
    DEFAULT_COLUMNS.map((c, idx) => ({ ...c, board: board._id, order: idx }))
  );
  const [toDo, inProgress, inReview, done] = columnRes;

  const tickets = await Ticket.create([
    {
      title: 'Design login flow',
      description: 'Create the signup/login pages with validation and JWT auth.',
      board: board._id,
      column: toDo._id,
      workspace: workspace._id,
      assignees: [member._id],
      reporter: owner._id,
      priority: 'high',
      labels: ['frontend', 'auth'],
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      order: 0,
      statusHistory: [{ column: toDo._id, changedBy: owner._id }],
    },
    {
      title: 'Dockerize backend',
      description: 'Add a Dockerfile and docker-compose for the Express API.',
      board: board._id,
      column: inProgress._id,
      workspace: workspace._id,
      assignees: [reviewer._id],
      reporter: owner._id,
      priority: 'medium',
      labels: ['devops'],
      order: 0,
      statusHistory: [{ column: inProgress._id, changedBy: owner._id }],
    },
    {
      title: 'Implement drag-and-drop',
      description: 'Wire @dnd-kit to persist column/ticket ordering.',
      board: board._id,
      column: inReview._id,
      workspace: workspace._id,
      assignees: [member._id],
      reporter: reviewer._id,
      priority: 'urgent',
      labels: ['frontend', 'kanban'],
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      order: 0,
      statusHistory: [
        { column: inProgress._id, changedBy: member._id },
        { column: inReview._id, changedBy: reviewer._id },
      ],
    },
    {
      title: 'Write seed script',
      description: 'Seed sample data so developers can get started quickly.',
      board: board._id,
      column: done._id,
      workspace: workspace._id,
      assignees: [owner._id],
      reporter: owner._id,
      priority: 'low',
      labels: ['tooling'],
      order: 0,
      statusHistory: [{ column: done._id, changedBy: owner._id }],
    },
  ]);

  await Comment.create([
    {
      ticket: tickets[0]._id,
      author: owner._id,
      body: 'Please prioritize the edge cases around password reset.',
    },
    {
      ticket: tickets[2]._id,
      author: reviewer._id,
      body: 'Looks good, but the keyboard accessibility needs work before Done.',
    },
  ]);

  console.log('[seed] Done. Sample data seeded.');
  console.log('Users (password: password123):');
  console.log('  owner@example.com    -> owner');
  console.log('  reviewer@example.com -> reviewer');
  console.log('  member@example.com   -> member');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
