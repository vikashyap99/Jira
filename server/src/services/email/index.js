const { EventEmitter } = require('events');
const { sendMail } = require('./transporter');
const templates = require('./templates');

const emailQueue = new EventEmitter();
emailQueue.setMaxListeners(100);

emailQueue.on('send', async (options) => {
  try {
    await sendMail(options);
  } catch (err) {
    console.error('[email] failed to send:', err.message);
  }
});

function enqueue(eventName, payload) {
  const mail = templates[eventName] ? templates[eventName](payload) : null;
  if (!mail) return;
  emailQueue.emit('send', mail);
}

const emailService = {
  welcome: (payload) => enqueue('welcome', payload),
  workspaceInvite: (payload) => enqueue('workspaceInvite', payload),
  ticketAssigned: (payload) => enqueue('ticketAssigned', payload),
  ticketStatusChanged: (payload) => enqueue('ticketStatusChanged', payload),
  newComment: (payload) => enqueue('newComment', payload),
};

module.exports = emailService;
