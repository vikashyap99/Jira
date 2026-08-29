function layout(content, title) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
      <div style="font-size:22px;font-weight:700;margin-bottom:16px">Jira</div>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px">
        <h2 style="margin-top:0;color:#111827">${title}</h2>
        ${content}
      </div>
      <p style="font-size:12px;color:#6b7280;margin-top:20px">You are receiving this email because you have an account with Jira.</p>
    </div>
  `;
}

const welcome = (payload) => {
  const user = payload.user || {};
  const to = payload.to || user.email;
  if (!to) return null;
  return {
    to,
    subject: 'Welcome to Jira 👋',
    html: layout(
      `<p>Hi ${user.firstName || 'there'},</p>
       <p>Welcome to <strong>Jira</strong>! Your account has been created successfully.</p>
       <p>You can now sign in and start managing your workspaces, boards, and tickets.</p>`,
      'Welcome aboard 👋'
    ),
  };
};

const workspaceInvite = (payload) => {
  const to = payload.to;
  if (!to) return null;
  const { workspaceName, invitedByName, inviteCode } = payload;
  return {
    to,
    subject: `Invitation to join ${workspaceName}`,
    html: layout(
      `<p>${invitedByName || 'A workspace owner'} has invited you to join the workspace <strong>${workspaceName}</strong>.</p>
       <p>Use the invite code below (or accept through the app) to join:</p>
       <div style="background:#111827;color:#fff;padding:10px 16px;border-radius:6px;display:inline-block;font-weight:700">${inviteCode}</div>`,
      'You have been invited'
    ),
  };
};

const ticketAssigned = (payload) => {
  const to = payload.to;
  if (!to) return null;
  const { ticketTitle, boardName, workspaceName } = payload;
  return {
    to,
    subject: `[Ticket] Assigned: ${ticketTitle}`,
    html: layout(
      `<p>A ticket has been <strong>assigned to you</strong>:</p>
       <p style="font-size:18px;font-weight:600">${ticketTitle}</p>
       <p>Board: <strong>${boardName}</strong> · Workspace: <strong>${workspaceName}</strong></p>`,
      'New ticket assigned'
    ),
  };
};

const ticketStatusChanged = (payload) => {
  const to = payload.to;
  if (!to) return null;
  const { ticketTitle, from, to: toStatus, changedByName } = payload;
  return {
    to,
    subject: `[Ticket] Status changed: ${ticketTitle}`,
    html: layout(
      `<p>${changedByName || 'Someone'} moved ticket <strong>${ticketTitle}</strong>:</p>
       <p>Status: ${from} → <strong>${toStatus}</strong></p>`,
      'Ticket status changed'
    ),
  };
};

const newComment = (payload) => {
  const to = payload.to;
  if (!to) return null;
  const { ticketTitle, authorName, comment } = payload;
  return {
    to,
    subject: `[Ticket] New comment: ${ticketTitle}`,
    html: layout(
      `<p>${authorName || 'A teammate'} commented on ticket <strong>${ticketTitle}</strong>:</p>
       <div style="background:#fff;border-left:3px solid #3b82f6;padding:10px 14px;margin:8px 0;color:#374151">${comment}</div>`,
      'New comment on a ticket'
    ),
  };
};

module.exports = {
  welcome,
  workspaceInvite,
  ticketAssigned,
  ticketStatusChanged,
  newComment,
};
