import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { Settings as SettingsIcon, Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import useTicketStore from '../store/ticketStore';
import TicketCard from './TicketCard';

function hexToRgba(hex, alpha) {
  const h = String(hex || '#6366f1').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(99, 102, 241, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Column({
  column,
  tickets,
  onOpenTicket,
  onEditColumn,
  onDeleteColumn,
  canEdit = true,
  showAdd = true,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `column:${column._id}`,
    data: { type: 'column' },
  });

  const { openNewTicket } = useTicketStore();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const overLimit = column.wipLimit && tickets.length > column.wipLimit;
  const tintBg = hexToRgba(column.color, 0.09);
  const accent = column.color || '#6366f1';

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: tintBg }}
      className="w-[300px] flex-shrink-0 flex flex-col h-full min-h-0 rounded-lg overflow-hidden border border-black/5"
    >
      <div
        style={{ background: accent }}
        className="h-1 w-full flex-shrink-0"
      />
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between px-3 pt-2.5 pb-2 cursor-grab select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: column.color || '#4f46e5' }}
          />
          <span className="text-[13px] font-semibold text-gray-800 truncate">{column.name}</span>
          <span
            className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${
              overLimit ? 'bg-red-200 text-red-700' : 'bg-black/5 text-gray-500'
            }`}
          >
            {tickets.length}
            {column.wipLimit ? ` / ${column.wipLimit}` : ''}
          </span>
        </div>

        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip title="Edit column">
              <IconButton
                size="small"
                sx={{ width: 26, height: 26 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditColumn(column);
                }}
              >
                <SettingsIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete column">
              <IconButton
                size="small"
                sx={{ width: 26, height: 26 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteColumn(column);
                }}
              >
                <CloseIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          </div>
        )}
      </div>

      <SortableContext
        items={tickets.map((t) => `ticket:${t._id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto px-1.5 py-1.5 flex flex-col gap-2.5 min-h-0">
          {tickets.length === 0 && (
            <div className="text-center text-[12px] text-gray-400 py-6">No tickets</div>
          )}
          {tickets.map((t) => (
            <TicketCard key={t._id} ticket={t} onClick={onOpenTicket} />
          ))}
        </div>
      </SortableContext>

      {showAdd && (
        <div className="p-1.5 mt-auto flex-shrink-0">
          <button
            className="w-full h-8 flex items-center justify-center gap-1.5 rounded-md bg-transparent text-gray-500 text-[13px] font-medium hover:bg-black/5 hover:text-gray-800 transition-colors"
            onClick={() => openNewTicket({ column: column._id, board: column.board })}
          >
            <AddIcon sx={{ fontSize: 16 }} />
            Add ticket
          </button>
        </div>
      )}
    </div>
  );
}
