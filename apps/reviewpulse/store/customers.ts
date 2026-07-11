// ReviewPulse — Customers Store (Zustand + Supabase)
// Central store for customer database: CRUD, search, review request tracking

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  opted_out: boolean;
  request_count: number;
  last_request_at: string | null;
  created_at: string;
};

export type CustomerStats = {
  totalCount: number;
  activeCount: number;
  optedOutCount: number;
  totalRequestsSent: number;
};

type CustomersState = {
  customers: Customer[];
  loading: boolean;
  refreshing: boolean;
  searchQuery: string;

  // Actions
  setSearchQuery: (query: string) => void;
  fetchCustomers: (userId: string) => Promise<void>;
  refreshCustomers: (userId: string) => Promise<void>;
  addCustomer: (userId: string, data: { name: string; phone?: string; email?: string }) => Promise<Customer | null>;
  updateCustomer: (customerId: string, data: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'opted_out'>>) => Promise<boolean>;
  deleteCustomer: (customerId: string) => Promise<boolean>;
  incrementRequestCount: (customerId: string) => void;

  // Selectors
  getFilteredCustomers: () => Customer[];
  getStats: () => CustomerStats;
  getCustomerById: (id: string) => Customer | undefined;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits || digits.length < 7) return null;
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCustomersStore = create<CustomersState>()((set, get) => ({
  customers: [],
  loading: true,
  refreshing: false,
  searchQuery: '',

  setSearchQuery: (query) => set({ searchQuery: query }),

  fetchCustomers: async (userId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, opted_out, request_count, last_request_at, created_at')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (!error) {
        set({ customers: (data ?? []) as Customer[] });
      }
    } catch {
      // Silent — stale data shown
    } finally {
      set({ loading: false });
    }
  },

  refreshCustomers: async (userId) => {
    set({ refreshing: true });
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, opted_out, request_count, last_request_at, created_at')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (!error) {
        set({ customers: (data ?? []) as Customer[] });
      }
    } catch {
      // Silent
    } finally {
      set({ refreshing: false });
    }
  },

  addCustomer: async (userId, data) => {
    try {
      const phone = data.phone ? normalizePhone(data.phone) : null;
      const { data: inserted, error } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          name: data.name.trim(),
          phone,
          email: data.email?.trim() || null,
        })
        .select('id, name, email, phone, opted_out, request_count, last_request_at, created_at')
        .single();

      if (error) {
        console.warn('Add customer failed:', error.message);
        return null;
      }

      const customer = inserted as Customer;
      set((state) => ({
        customers: [...state.customers, customer].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
      return customer;
    } catch {
      return null;
    }
  },

  updateCustomer: async (customerId, data) => {
    try {
      const updatePayload: Record<string, unknown> = {};
      if (data.name !== undefined) updatePayload.name = data.name.trim();
      if (data.phone !== undefined) updatePayload.phone = data.phone ? normalizePhone(data.phone) : null;
      if (data.email !== undefined) updatePayload.email = data.email?.trim() || null;
      if (data.opted_out !== undefined) updatePayload.opted_out = data.opted_out;

      const { error } = await supabase
        .from('customers')
        .update(updatePayload)
        .eq('id', customerId);

      if (error) {
        console.warn('Update customer failed:', error.message);
        return false;
      }

      set((state) => ({
        customers: state.customers.map((c) =>
          c.id === customerId ? { ...c, ...updatePayload } as Customer : c
        ),
      }));
      return true;
    } catch {
      return false;
    }
  },

  deleteCustomer: async (customerId) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        console.warn('Delete customer failed:', error.message);
        return false;
      }

      set((state) => ({
        customers: state.customers.filter((c) => c.id !== customerId),
      }));
      return true;
    } catch {
      return false;
    }
  },

  incrementRequestCount: (customerId) => {
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId
          ? { ...c, request_count: c.request_count + 1, last_request_at: new Date().toISOString() }
          : c
      ),
    }));

    // Fire-and-forget DB update
    supabase.rpc('increment_request_count', { customer_id: customerId }).then(({ error }) => {
      if (error) console.warn('Increment request count failed:', error.message);
    });
  },

  getFilteredCustomers: () => {
    const { customers, searchQuery } = get();
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
    );
  },

  getStats: () => {
    const { customers } = get();
    const totalCount = customers.length;
    const optedOutCount = customers.filter((c) => c.opted_out).length;
    const activeCount = totalCount - optedOutCount;
    const totalRequestsSent = customers.reduce((sum, c) => sum + c.request_count, 0);

    return { totalCount, activeCount, optedOutCount, totalRequestsSent };
  },

  getCustomerById: (id) => {
    return get().customers.find((c) => c.id === id);
  },
}));
