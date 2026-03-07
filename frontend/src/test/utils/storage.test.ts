/**
 * Unit tests for the storage utility (localStorage wrappers).
 */
import { storage } from '../../utils/storage';

const KEYS = {
  ACCESS: 'dnd_access_token',
  REFRESH: 'dnd_refresh_token',
  USER: 'dnd_user',
};

beforeEach(() => {
  localStorage.clear();
});

describe('storage.getAccessToken / setAccessToken', () => {
  it('returns null when nothing is stored', () => {
    expect(storage.getAccessToken()).toBeNull();
  });

  it('returns the stored access token', () => {
    localStorage.setItem(KEYS.ACCESS, 'abc123');
    expect(storage.getAccessToken()).toBe('abc123');
  });

  it('persists a token via setAccessToken', () => {
    storage.setAccessToken('my-token');
    expect(localStorage.getItem(KEYS.ACCESS)).toBe('my-token');
  });
});

describe('storage.getRefreshToken / setRefreshToken', () => {
  it('returns null when nothing is stored', () => {
    expect(storage.getRefreshToken()).toBeNull();
  });

  it('returns the stored refresh token', () => {
    storage.setRefreshToken('refresh-xyz');
    expect(storage.getRefreshToken()).toBe('refresh-xyz');
  });
});

describe('storage.clearTokens', () => {
  it('removes both token keys', () => {
    storage.setAccessToken('a');
    storage.setRefreshToken('b');
    storage.clearTokens();
    expect(localStorage.getItem(KEYS.ACCESS)).toBeNull();
    expect(localStorage.getItem(KEYS.REFRESH)).toBeNull();
  });
});

describe('storage.getUser / setUser / clearUser', () => {
  const user = { id: '1', email: 'test@example.com', created_at: '2026-01-01' };

  it('returns null when nothing is stored', () => {
    expect(storage.getUser()).toBeNull();
  });

  it('serialises and stores the user', () => {
    storage.setUser(user);
    expect(localStorage.getItem(KEYS.USER)).toBe(JSON.stringify(user));
  });

  it('deserialises and returns the user', () => {
    storage.setUser(user);
    expect(storage.getUser()).toEqual(user);
  });

  it('clearUser removes the user key', () => {
    storage.setUser(user);
    storage.clearUser();
    expect(localStorage.getItem(KEYS.USER)).toBeNull();
  });
});

describe('storage.clearAll', () => {
  it('removes all storage keys', () => {
    storage.setAccessToken('a');
    storage.setRefreshToken('b');
    storage.setUser({ id: '1' });
    storage.clearAll();
    expect(localStorage.getItem(KEYS.ACCESS)).toBeNull();
    expect(localStorage.getItem(KEYS.REFRESH)).toBeNull();
    expect(localStorage.getItem(KEYS.USER)).toBeNull();
  });
});
