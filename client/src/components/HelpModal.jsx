import Modal from './Modal';

const SECTIONS = [
  {
    title: 'Workspaces',
    body: 'Top-level containers that group your boards and members. Each workspace has its own boards, columns, tickets, and team. You can belong to multiple workspaces with different roles in each.',
  },
  {
    title: 'Boards & Columns',
    body: 'A board is where your work is organised into columns (To Do, In Progress, In Review, Done by default). Columns can be renamed, recoloured, reordered, and re-ordered by dragging their headers.',
  },
  {
    title: 'Tickets',
    body: 'Tickets are the work items on a board. Each has a title, description, priority, labels, due date, assignee(s), comments, and optional attachments. Click any ticket card to open it.',
  },
  {
    title: 'Drag & Drop',
    body: 'Drag a ticket card to reorder it within a column or move it to another column. Movement is saved automatically with no page refresh. Columns reorder by dragging the column header.',
  },
  {
    title: 'Adding Tickets',
    body: 'Click the "Add ticket" button at the bottom of the To Do column. Fill in the details, attach images/media if you like, and create it. You can also attach a priority, labels, due date, and assignees.',
  },
  {
    title: 'Attachments',
    body: 'While creating or editing a ticket you can attach PNGs, images, video, or audio (up to 5 MB each). They are stored with the ticket and shown in the ticket view.',
  },
  {
    title: 'Comments & Notifications',
    body: 'Team members can comment on any ticket. You will get an email when someone comments on a ticket you are involved in, and when a ticket moves to the Done column.',
  },
  {
    title: 'Roles',
    body: 'Each workspace has Owner, Reviewer, and Member roles. Owners manage everything; Reviewers can review and move tickets; Members work on their own tickets.',
  },
];

export default function HelpModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="How to use Jira" width="640px">
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        Here is a quick tour of the app and what each feature does.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {SECTIONS.map((s) => (
          <div
            key={s.title}
            style={{
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              background: '#fff',
            }}
          >
            <strong style={{ display: 'block', marginBottom: 4, color: 'var(--primary)' }}>
              {s.title}
            </strong>
            <span style={{ fontSize: 14, lineHeight: 1.55, color: '#374151' }}>{s.body}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
