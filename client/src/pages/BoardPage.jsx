import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  KeyboardArrowLeft as ArrowLeftIcon,
} from '@mui/icons-material';
import api from '../api/client';
import useBoardStore from '../store/boardStore';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import Column from '../components/Column';
import TicketDetail from '../components/TicketDetail';
import NewTicketModal from '../components/NewTicketModal';
import { TicketCardContent } from '../components/TicketCard';
import { useAuth } from '../context/AuthContext';
import { PRIORITY_LABELS, getErrorMessage } from '../utils/helpers';

export default function BoardPage() {
  const { boardId } = useParams();
  const { user } = useAuth();
  const { currentBoard, columns, tickets, members, myRole, fetchBoard, addColumn, updateColumn, removeColumn, insertTicketAt, reorderColumns } =
    useBoardStore();

  const canManage = myRole !== 'member';

  const [error, setError] = useState('');
  const [columnModal, setColumnModal] = useState(false);
  const [columnForm, setColumnForm] = useState({ name: '', color: '#4f46e5', wipLimit: '' });
  const [editingColumn, setEditingColumn] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [myTicketsOnly, setMyTicketsOnly] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetchBoard(boardId).catch(() => setError(getErrorMessage('Failed to load board')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const handleRefresh = useCallback(() => {
    fetchBoard(boardId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const onSubmitColumn = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingColumn) {
        const res = await api.put(`/columns/${editingColumn._id}`, {
          ...columnForm,
          wipLimit: columnForm.wipLimit ? Number(columnForm.wipLimit) : 0,
        });
        updateColumn(res.data.data.column);
      } else {
        const res = await api.post(`/boards/${boardId}/columns`, {
          ...columnForm,
          wipLimit: columnForm.wipLimit ? Number(columnForm.wipLimit) : 0,
          board: boardId,
        });
        addColumn(res.data.data.column);
      }
      setColumnModal(false);
      setColumnForm({ name: '', color: '#4f46e5', wipLimit: '' });
      setEditingColumn(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save column'));
    }
  };

  const openEditColumn = (col) => {
    setEditingColumn(col);
    setColumnForm({
      name: col.name,
      color: col.color || '#4f46e5',
      wipLimit: col.wipLimit || '',
    });
    setColumnModal(true);
  };

  const onDeleteColumn = async (col) => {
    if (!window.confirm(`Delete column "${col.name}"? Tickets move to the first column.`)) return;
    try {
      await api.delete(`/columns/${col._id}`);
      removeColumn(col._id);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete column'));
    }
  };

  const resolveDropTarget = (overId, movingTicketId) => {
    let targetColumnId = null;
    let insertIndex = 0;

    if (String(overId).startsWith('column:')) {
      targetColumnId = String(overId).replace('column:', '');
      insertIndex = tickets.filter((t) => String(t.column) === targetColumnId && t._id !== movingTicketId).length;
    } else if (String(overId).startsWith('ticket:')) {
      const overTicketId = String(overId).replace('ticket:', '');
      const overTicket = tickets.find((t) => t._id === overTicketId);
      targetColumnId = String(overTicket?.column || '');
      if (!targetColumnId || targetColumnId === 'undefined') return { targetColumnId: null, insertIndex: 0 };
      const colTickets = tickets
        .filter((t) => String(t.column) === targetColumnId && t._id !== movingTicketId)
        .sort((a, b) => a.order - b.order);
      insertIndex = colTickets.findIndex((t) => t._id === overTicketId);
      if (insertIndex < 0) insertIndex = colTickets.length;
    }

    return { targetColumnId, insertIndex };
  };

  const onDragStart = (event) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith('ticket:')) {
      setActiveTicketId(activeId.replace('ticket:', ''));
    }
  };

  // Called continuously while dragging, so a ticket visually follows the cursor
  // into whichever column it is hovering over. Updates are fully local and instant.
  // Called continuously while dragging. Only reacts to CROSS-COLUMN moves so the
  // ticket visually follows into the hovered column; within-column reordering is
  // handled automatically by the sortable strategy. This avoids state oscillation
  // that would cause an infinite re-render loop.
  const onDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    if (!activeId.startsWith('ticket:')) return;
    const ticketId = activeId.replace('ticket:', '');

    let overColumnId = null;
    if (String(over.id).startsWith('column:')) {
      overColumnId = String(over.id).replace('column:', '');
    } else if (String(over.id).startsWith('ticket:')) {
      const overTicket = tickets.find((t) => t._id === String(over.id).replace('ticket:', ''));
      overColumnId = overTicket ? String(overTicket.column) : null;
    }
    if (!overColumnId) return;

    const moving = tickets.find((t) => t._id === ticketId);
    if (!moving) return;
    if (String(moving.column) === String(overColumnId)) return;

    const targetCount = tickets.filter((t) => String(t.column) === String(overColumnId) && t._id !== ticketId).length;
    insertTicketAt(ticketId, overColumnId, targetCount);
  };

  const onDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTicketId(null);

    if (!over) return;
    const activeId = String(active.id);
    const ticketId = activeId.startsWith('ticket:') ? activeId.replace('ticket:', '') : null;
    const columnId = activeId.startsWith('column:') ? activeId.replace('column:', '') : null;

    try {
      if (ticketId) {
        const { targetColumnId, insertIndex } = resolveDropTarget(String(over.id), ticketId);
        if (!targetColumnId) return;
        const moved = tickets.find((t) => t._id === ticketId);
        const samePosition =
          moved &&
          String(moved.column) === String(targetColumnId) &&
          tickets
            .filter((t) => String(t.column) === String(targetColumnId) && t._id !== ticketId)
            .sort((a, b) => a.order - b.order)
            .findIndex((t) => t.order >= (moved.order || 0)) === insertIndex;
        if (samePosition && String(moved.column) === String(targetColumnId)) return;

        await api.put(`/tickets/${ticketId}/move`, {
          column: targetColumnId,
          order: insertIndex,
        });
      } else if (columnId && String(over.id).startsWith('column:')) {
        const overColumnId = String(over.id).replace('column:', '');
        if (columnId !== overColumnId) {
          reorderColumns(columnId, overColumnId);
          const orderedIds = columns
            .slice()
            .sort((a, b) => (a._id === columnId) - (b._id === columnId) || (a._id === overColumnId ? 1 : a.order - b.order))
            .map((c) => c._id);
          await api.put(`/boards/${boardId}/columns/reorder`, { orderedIds });
        }
      }
    } catch (err) {
      // Roll back to server state on failure (the only recovery refresh).
      setError(getErrorMessage(err, 'Failed to update order'));
      fetchBoard(boardId);
    }
  };

  const onDragCancel = () => setActiveTicketId(null);

  const activeTicket = activeTicketId ? tickets.find((t) => t._id === activeTicketId) : null;

  if (!currentBoard) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 48px)' }}>
        <Spinner size={32} />
      </div>
    );
  }

  const filteredTickets = tickets.filter((t) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const title = (t.title || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const labels = (t.labels || []).join(' ').toLowerCase();
      const match = `${title} ${desc} ${labels}`;
      if (!match.includes(q)) return false;
    }
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (assigneeFilter && !(t.assignees || []).some((a) => String(a._id) === assigneeFilter)) return false;
    if (myTicketsOnly && !(t.assignees || []).some((a) => String(a._id) === String(user?._id))) return false;
    return true;
  });

  const hasActiveFilters = search || priorityFilter || assigneeFilter || myTicketsOnly;

  return (
    <div className="board-page">
      {/* Board Header */}
      <header className="board-header">
        <div className="board-header-left">
          <div className="board-breadcrumb flex items-center gap-1">
            <Link to={`/w/${currentBoard.workspace?._id}`}>Workspace</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">{currentBoard.name}</span>
          </div>
          <h1 className="board-title">{currentBoard.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} sx={{ width: 32, height: 32 }}>
              <RefreshIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          {canManage && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingColumn(null);
                setColumnForm({ name: '', color: '#4f46e5', wipLimit: '' });
                setColumnModal(true);
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
              Add column
            </button>
          )}
        </div>
      </header>

      {/* Filter bar */}
      <div className="filter-bar" style={{ height: 'auto', minHeight: 48, padding: '8px 24px', flexWrap: 'wrap' }}>
        <div className="filter-search">
          <span className="search-icon">
            <SearchIcon sx={{ fontSize: 16 }} />
          </span>
          <input
            placeholder="Search by title, description, label…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          displayEmpty
          size="small"
          sx={{
            height: 34,
            fontSize: 13,
            minWidth: 150,
            bgcolor: '#fafbfc',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#dfe1e6' },
          }}
          renderValue={(v) => (v ? PRIORITY_LABELS[v] : 'All priorities')}
        >
          <MenuItem value="">All priorities</MenuItem>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </Select>

        <Select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          displayEmpty
          size="small"
          sx={{
            height: 34,
            fontSize: 13,
            minWidth: 170,
            bgcolor: '#fafbfc',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#dfe1e6' },
          }}
          renderValue={(v) => {
            if (!v) return 'All assignees';
            const m = members.find((x) => String(x.user.id) === v);
            return m?.user.firstName || m?.user.email || 'All assignees';
          }}
        >
          <MenuItem value="">All assignees</MenuItem>
          {members.map((m) => (
            <MenuItem key={m.user.id} value={m.user.id}>
              {m.user.firstName || m.user.email}
            </MenuItem>
          ))}
        </Select>

        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={myTicketsOnly}
            onChange={(e) => setMyTicketsOnly(e.target.checked)}
          />
          My tickets
        </label>

        <div className="filter-spacer" />

        {hasActiveFilters && (
          <button
            className="btn btn-sm"
            onClick={() => {
              setSearch('');
              setPriorityFilter('');
              setAssigneeFilter('');
              setMyTicketsOnly(false);
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="px-6 pt-3">
          <div className="alert alert-error">{error}</div>
        </div>
      )}

      {/* Board body */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="board-body">
          {columns.map((col) => (
            <div key={col._id} className="group flex flex-col h-full min-h-0 rounded-lg">
              <Column
                column={col}
                tickets={filteredTickets.filter((t) => String(t.column) === String(col._id))}
                onOpenTicket={setSelectedTicket}
                onEditColumn={openEditColumn}
                onDeleteColumn={onDeleteColumn}
                canEdit={canManage}
                showAdd={String(col.name).trim().toLowerCase() === 'to do'}
              />
            </div>
          ))}

          {columns.length === 0 && (
            <div
              className="empty-state flex-1 flex items-center justify-center h-40 rounded-lg bg-white border border-dashed border-gray-300 text-gray-400"
            >
              <p>No columns yet. Add one to get started.</p>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTicket ? (
            <div className="w-[272px] rotate-0 cursor-grabbing">
              <TicketCardContent ticket={activeTicket} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal open={columnModal} onClose={() => setColumnModal(false)} title={editingColumn ? 'Edit Column' : 'Add Column'}>
          <form onSubmit={onSubmitColumn}>
            <div className="form-group">
              <label>Name</label>
              <input
                value={columnForm.name}
                onChange={(e) => setColumnForm({ ...columnForm, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={columnForm.color}
                  onChange={(e) => setColumnForm({ ...columnForm, color: e.target.value })}
                  style={{ width: 60, height: 40, padding: 2, border: '1px solid var(--border-strong)', borderRadius: 6, cursor: 'pointer' }}
                />
                <span className="text-sm text-gray-500" style={{ height: 40, width: 40, borderRadius: '50%', background: columnForm.color, display: 'inline-block', border: '1px solid var(--border)' }} />
              </div>
            </div>
            <div className="form-group">
              <label>WIP limit (0 = unlimited)</label>
              <input
                type="number"
                min="0"
                value={columnForm.wipLimit}
                onChange={(e) => setColumnForm({ ...columnForm, wipLimit: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn" onClick={() => setColumnModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit">
                {editingColumn ? 'Save' : 'Add'}
              </button>
            </div>
          </form>
      </Modal>

      {selectedTicket && (
        <TicketDetail
          ticketId={selectedTicket._id}
          boardId={boardId}
          onClose={() => setSelectedTicket(null)}
          onRefresh={handleRefresh}
          members={members}
        />
      )}

      <NewTicketModal onCreated={handleRefresh} />
    </div>
  );
}
