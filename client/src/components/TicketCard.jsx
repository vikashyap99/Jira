import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Chip from '@mui/material/Chip';
import { Event as EventIcon } from '@mui/icons-material';
import { PRIORITY_LABELS, formatDate } from '../utils/helpers';

const PRIORITY_COLORS = {
  low: { bg: '#f4f5f7', color: '#42526e' },
  medium: { bg: '#fffae6', color: '#974f0c' },
  high: { bg: '#ffebe6', color: '#de350b' },
  urgent: { bg: '#ffebe6', color: '#ff5630' },
};

function initials(user) {
  if (!user) return '?';
  return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?';
}

export function TicketCardContent({ ticket, dragging = false }) {
  const overdue = ticket.dueDate && new Date(ticket.dueDate) < new Date();
  const assignees = ticket.assignees || [];
  const pc = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium;

  return (
    <div
      className={`bg-white rounded-lg border px-3 py-2.5 shadow-sm ${
        dragging ? 'border-indigo-500 shadow-xl' : 'border-gray-200'
      }`}
      style={dragging ? { boxShadow: '0 12px 32px rgba(9,30,66,0.25)' } : undefined}
    >
      <div className="text-sm font-medium text-gray-800 leading-snug mb-2 break-words">
        {ticket.title}
      </div>

      {ticket.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {ticket.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="inline-flex items-center h-4 px-1.5 rounded-sm bg-gray-100 text-gray-600 text-[11px] font-medium leading-none"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Chip
            size="small"
            label={PRIORITY_LABELS[ticket.priority]}
            sx={{
              height: 20,
              fontSize: 11,
              backgroundColor: pc.bg,
              color: pc.color,
              '& .MuiChip-label': { px: 1, fontWeight: 500 },
            }}
          />
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          {ticket.dueDate && (
            <span
              className={`flex items-center gap-1 text-xs whitespace-nowrap ${
                overdue ? 'text-red-700 font-semibold' : 'text-gray-500'
              }`}
            >
              <EventIcon sx={{ fontSize: 13 }} />
              {formatDate(ticket.dueDate)}
            </span>
          )}

          {assignees.length > 0 && (
            <AvatarGroup
              max={3}
              spacing="small"
              sx={{
                '& .MuiAvatarGroup-avatar': {
                  width: 22,
                  height: 22,
                  fontSize: 10,
                  bgcolor: '#6b778c',
                },
              }}
            >
              {assignees.slice(0, 3).map((a) => (
                <Avatar key={a._id} sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#4f46e5' }}>
                  {initials(a)}
                </Avatar>
              ))}
            </AvatarGroup>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TicketCard({ ticket, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `ticket:${ticket._id}`,
    data: { type: 'ticket' },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onClick(ticket)}
      style={style}
      className="cursor-grab active:cursor-grabbing"
    >
      {/* When a DragOverlay is used, hide the source card during drag and show a placeholder */}
      <div
        style={isDragging ? { opacity: 0.35 } : undefined}
        className="transition-opacity duration-150"
      >
        <TicketCardContent ticket={ticket} />
      </div>
    </div>
  );
}
