import { create } from 'zustand';

const useTicketStore = create((set) => ({
  newTicket: null,
  editingTicket: null,
  openNewTicket: (defaults = {}) => set({ newTicket: defaults }),
  closeNewTicket: () => set({ newTicket: null }),
  openEditTicket: (ticket) => set({ editingTicket: ticket }),
  closeEditTicket: () => set({ editingTicket: null }),
}));

export default useTicketStore;
