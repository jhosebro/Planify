import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth/authService';

const mockClearAuth = jest.fn();
jest.mock('@/store/authStore', () => ({
  useAuthStore: { getState: () => ({ userId: 'u1', clearAuth: mockClearAuth }) },
}));

const mockStorage = { list: jest.fn(), remove: jest.fn() };
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: { signOut: jest.fn() },
    storage: { from: () => mockStorage },
  },
}));

const rpc = supabase.rpc as jest.Mock;
const signOut = supabase.auth.signOut as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.list.mockResolvedValue({ data: [{ name: 'avatar-1.jpg' }] });
  mockStorage.remove.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
});

describe('authService.deleteAccount', () => {
  it('borra avatares, llama la RPC y cierra la sesión local', async () => {
    await authService.deleteAccount();
    expect(mockStorage.remove).toHaveBeenCalledWith(['u1/avatar-1.jpg']);
    expect(rpc).toHaveBeenCalledWith('delete_my_account');
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockClearAuth).toHaveBeenCalled();
  });

  it('si falla el storage igual elimina la cuenta', async () => {
    mockStorage.list.mockRejectedValue(new Error('red'));
    await authService.deleteAccount();
    expect(rpc).toHaveBeenCalledWith('delete_my_account');
  });

  it('si la RPC falla lanza y no cierra sesión', async () => {
    rpc.mockResolvedValue({ error: { message: 'boom' } });
    await expect(authService.deleteAccount()).rejects.toThrow('boom');
    expect(signOut).not.toHaveBeenCalled();
    expect(mockClearAuth).not.toHaveBeenCalled();
  });
});
