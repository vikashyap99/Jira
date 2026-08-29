import { create } from 'zustand';
import api from '../api/client';

const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/workspaces');
      set({ workspaces: res.data.data.workspaces, loading: false });
      return res.data.data.workspaces;
    } catch (err) {
      set({ error: err.response?.data?.error?.message || 'Failed to load workspaces', loading: false });
      return [];
    }
  },

  fetchWorkspace: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/workspaces/${id}`);
      set({ currentWorkspace: res.data.data.workspace, loading: false });
      return res.data.data.workspace;
    } catch (err) {
      set({ error: err.response?.data?.error?.message || 'Failed to load workspace', loading: false });
      return null;
    }
  },

  createWorkspace: async (payload) => {
    const res = await api.post('/workspaces', payload);
    const { workspace } = res.data.data;
    set((s) => ({ workspaces: [...s.workspaces, { ...workspace, role: 'owner' }] }));
    return workspace;
  },

  joinByCode: async (inviteCode) => {
    const res = await api.post('/workspaces/join', { inviteCode });
    return res.data.data;
  },

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  clear: () => set({ workspaces: [], currentWorkspace: null, error: null }),
}));

export default useWorkspaceStore;
