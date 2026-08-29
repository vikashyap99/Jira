import { create } from 'zustand';
import api from '../api/client';

const useBoardStore = create((set, get) => ({
  boards: [],
  currentBoard: null,
  columns: [],
  tickets: [],
  members: [],
  myRole: null,
  loading: false,
  error: null,

  fetchBoards: async (workspaceId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/boards?workspace=${workspaceId}`);
      set({ boards: res.data.data.boards, loading: false });
      return res.data.data.boards;
    } catch (err) {
      set({ error: err.response?.data?.error?.message || 'Failed to load boards', loading: false });
      return [];
    }
  },

  fetchBoard: async (boardId) => {
    set({ loading: true, error: null, currentBoard: null, columns: [], tickets: [], members: [], myRole: null });
    try {
      const res = await api.get(`/boards/${boardId}`);
      const data = res.data.data;
      set({
        currentBoard: data.board,
        columns: data.columns,
        tickets: data.tickets,
        members: data.members || [],
        myRole: data.myRole || null,
        loading: false,
      });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error?.message || 'Failed to load board', loading: false });
      return null;
    }
  },

  createBoard: async (payload) => {
    const res = await api.post('/boards', payload);
    set((s) => ({ boards: [...s.boards, res.data.data.board] }));
    return res.data.data.board;
  },

  addTicket: (ticket) => set((s) => ({ tickets: [...s.tickets, ticket] })),

  updateTicket: (ticket) =>
    set((s) => ({
      tickets: s.tickets.map((t) => (t._id === ticket._id ? ticket : t)),
    })),

  removeTicket: (id) => set((s) => ({ tickets: s.tickets.filter((t) => t._id !== id) })),

  moveTicket: (ticketId, columnId, order) =>
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t._id === ticketId ? { ...t, column: columnId, order } : t
      ),
    })),

  insertTicketAt: (ticketId, columnId, index) =>
    set((s) => {
      const moving = s.tickets.find((t) => t._id === ticketId);
      if (!moving) return s;
      const currentColSorted = s.tickets
        .filter((t) => String(t.column) === String(columnId))
        .sort((a, b) => a.order - b.order);
      const targetSize = currentColSorted.filter((t) => t._id !== ticketId).length;
      const idx = Math.max(0, Math.min(Math.round(index), targetSize));

      // If the ticket is already at this column & at this index in the current
      // ordering, return the same state so zustand skips re-rendering
      // (prevents infinite onDragOver loops).
      const currentPos = currentColSorted.findIndex((t) => t._id === ticketId);
      if (String(moving.column) === String(columnId) && currentPos === idx) return s;

      const others = s.tickets.filter((t) => t._id !== ticketId);
      const inCol = others
        .filter((t) => String(t.column) === String(columnId))
        .sort((a, b) => a.order - b.order);
      const notInCol = others.filter((t) => String(t.column) !== String(columnId));
      inCol.splice(idx, 0, moving);
      const reordered = inCol.map((t, i) => ({ ...t, column: columnId, order: i }));
      return { tickets: [...notInCol, ...reordered] };
    }),

  reorderColumns: (activeColumnId, overColumnId) =>
    set((s) => {
      const from = s.columns.findIndex((c) => String(c._id) === String(activeColumnId));
      const to = s.columns.findIndex((c) => String(c._id) === String(overColumnId));
      if (from < 0 || to < 0 || from === to) return s;
      const next = [...s.columns];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { columns: next.map((c, i) => ({ ...c, order: i })) };
    }),

  addColumn: (column) => set((s) => ({ columns: [...s.columns, column] })),
  updateColumn: (column) =>
    set((s) => ({ columns: s.columns.map((c) => (c._id === column._id ? column : c)) })),
  removeColumn: (id) =>
    set((s) => ({
      columns: s.columns.filter((c) => c._id !== id),
      tickets: s.tickets.map((t) => (t.column === id ? { ...t, column: null } : t)),
    })),

  clear: () => set({ boards: [], currentBoard: null, columns: [], tickets: [], members: [], myRole: null, error: null }),
}));

export default useBoardStore;
