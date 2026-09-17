import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mergeExceptions,
  mergePatterns,
  mergeShiftTypes,
  restoreCloudDataToLocal,
  smartSync,
  markLocalModified,
  getLocalLastModified,
  getIsRestoring,
  type CloudUserData,
} from '../syncService';
import { db, ensureDefaultShiftTypes, type ShiftException, type ShiftPattern, type ShiftType } from '../../db/db';
import { useAppStore } from '../../store/useAppStore';

// Mock firebase
const mockDocSnap = {
  exists: vi.fn(),
  data: vi.fn(),
};

const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn().mockImplementation(() => Promise.resolve(mockDocSnap));
const mockDoc = vi.fn().mockReturnValue({ id: 'test-user' });

vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
}));

vi.mock('../firebase', () => ({
  firestore: { type: 'mock-firestore' },
  auth: { currentUser: { uid: 'user-123', email: 'test@example.com' } },
}));

describe('syncService - Bulletproof Cloud Synchronization', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.shiftTypes.clear();
    await db.patterns.clear();
    await db.activePatterns.clear();
    await db.exceptions.clear();
    await ensureDefaultShiftTypes();

    mockDocSnap.exists.mockReset();
    mockDocSnap.data.mockReset();
    mockSetDoc.mockReset();
    mockGetDoc.mockClear();

    useAppStore.setState({
      theme: 'system',
      calendarTheme: 'seamless',
      shiftDisplayMode: 'both',
      employmentStartDate: null,
      annualLeaveEntitlement: 14,
      hasCompletedSetup: false,
    });
  });

  describe('Merge Helper Functions', () => {
    it('should merge distinct exceptions without losing dates', () => {
      const local: ShiftException[] = [
        { id: 'e1', date: '2026-06-01', type: 'VACATION', name: 'Yıllık İzin', color: '#f59e0b' },
      ];
      const cloud: ShiftException[] = [
        { id: 'e2', date: '2026-07-15', type: 'SICK', name: 'Rapor', color: '#ef4444' },
      ];

      const merged = mergeExceptions(local, cloud);
      expect(merged.length).toBe(2);
      const dates = merged.map((m) => m.date).sort();
      expect(dates).toEqual(['2026-06-01', '2026-07-15']);
    });

    it('should deduplicate exceptions on the same date preferring the most recent local edit', () => {
      const local: ShiftException[] = [
        { id: 'e1-updated', date: '2026-06-01', type: 'VACATION', name: 'Güncellenmiş İzin', color: '#f59e0b' },
      ];
      const cloud: ShiftException[] = [
        { id: 'e1-old', date: '2026-06-01', type: 'OTHER', name: 'Eski Not', color: '#888' },
      ];

      const merged = mergeExceptions(local, cloud);
      expect(merged.length).toBe(1);
      expect(merged[0].name).toBe('Güncellenmiş İzin');
    });

    it('should merge custom shift patterns', () => {
      const local: ShiftPattern[] = [
        { id: 'p-custom-1', name: 'Özel 1', cycleLength: 4, days: [] },
      ];
      const cloud: ShiftPattern[] = [
        { id: 'p-custom-2', name: 'Özel 2', cycleLength: 8, days: [] },
      ];

      const merged = mergePatterns(local, cloud);
      expect(merged.length).toBe(2);
      expect(merged.map((p) => p.id)).toContain('p-custom-1');
      expect(merged.map((p) => p.id)).toContain('p-custom-2');
    });

    it('should merge custom shift types', () => {
      const local: ShiftType[] = [
        { id: 'st-custom-1', name: 'Ara Vardiya', startTime: '10:00', endTime: '18:00', type: 'WORK', color: '#333' },
      ];
      const cloud: ShiftType[] = [
        { id: 'st-custom-2', name: 'Saha Nöbeti', startTime: '12:00', endTime: '20:00', type: 'WORK', color: '#666' },
      ];

      const merged = mergeShiftTypes(local, cloud);
      expect(merged.length).toBe(2);
      expect(merged.map((t) => t.id)).toContain('st-custom-1');
      expect(merged.map((t) => t.id)).toContain('st-custom-2');
    });
  });

  describe('Restore & Re-sync Protection', () => {
    it('should restore cloud data into local Dexie and store', async () => {
      const mockCloudData: CloudUserData = {
        version: 1,
        lastModified: '2026-09-10T12:00:00Z',
        updatedAt: '2026-09-10T12:00:00Z',
        shiftTypes: await db.shiftTypes.toArray(),
        patterns: await db.patterns.toArray(),
        activePatterns: [{ id: 'ap-1', patternId: 'pattern-b2', startDate: '2026-01-12' }],
        exceptions: [
          { id: 'ex-1', date: '2026-08-01', type: 'VACATION', name: 'Yıllık İzin', color: '#f59e0b' },
        ],
        appSettings: {
          theme: 'dark',
          calendarTheme: 'modern-rounded',
          shiftDisplayMode: 'text',
          employmentStartDate: '2022-05-01',
          annualLeaveEntitlement: 20,
          hasCompletedSetup: true,
        },
      };

      await restoreCloudDataToLocal(mockCloudData);

      // Verify Dexie
      const active = await db.activePatterns.toArray();
      expect(active[0]?.patternId).toBe('pattern-b2');

      const exceptions = await db.exceptions.toArray();
      expect(exceptions.length).toBe(1);
      expect(exceptions[0]?.date).toBe('2026-08-01');

      // Verify Zustand store
      const store = useAppStore.getState();
      expect(store.theme).toBe('dark');
      expect(store.calendarTheme).toBe('modern-rounded');
      expect(store.shiftDisplayMode).toBe('text');
      expect(store.employmentStartDate).toBe('2022-05-01');
      expect(store.annualLeaveEntitlement).toBe(20);
      expect(store.hasCompletedSetup).toBe(true);

      // Verify timestamp preserved
      expect(getLocalLastModified()).toBe('2026-09-10T12:00:00Z');
      expect(getIsRestoring()).toBe(false);
    });
  });

  describe('Smart Guard (Fresh Device Protection)', () => {
    it('should NEVER overwrite rich cloud data when logging in on a fresh device even if local timestamp is newer', async () => {
      // Scenario: User touched the screen on a fresh device 1 second ago
      markLocalModified('2026-09-17T03:30:00Z'); // Today
      expect(await db.exceptions.count()).toBe(0); // Fresh device: 0 exceptions

      // Cloud data has 3 vacations saved last week
      const cloudData: CloudUserData = {
        version: 1,
        lastModified: '2026-09-10T10:00:00Z', // Older timestamp
        updatedAt: '2026-09-10T10:00:00Z',
        shiftTypes: await db.shiftTypes.toArray(),
        patterns: await db.patterns.toArray(),
        activePatterns: [{ id: 'ap-1', patternId: 'pattern-c3', startDate: '2026-01-12' }],
        exceptions: [
          { id: 'ex-1', date: '2026-07-01', type: 'VACATION', name: 'Yıllık İzin', color: '#f59e0b' },
          { id: 'ex-2', date: '2026-07-02', type: 'VACATION', name: 'Yıllık İzin', color: '#f59e0b' },
          { id: 'ex-3', date: '2026-07-03', type: 'VACATION', name: 'Yıllık İzin', color: '#f59e0b' },
        ],
        appSettings: {
          theme: 'dark',
          calendarTheme: 'minimal-capsule',
          shiftDisplayMode: 'icon',
          employmentStartDate: '2020-01-01',
          annualLeaveEntitlement: 18,
          hasCompletedSetup: true,
        },
      };

      mockDocSnap.exists.mockReturnValue(true);
      mockDocSnap.data.mockReturnValue(cloudData);

      const res = await smartSync('user-123');

      // Smart Guard MUST trigger and restore cloud data
      expect(res.status).toBe('restored');
      expect(mockSetDoc).not.toHaveBeenCalled(); // Cloud was NOT overwritten!

      // Dexie should now have the 3 exceptions from cloud
      const count = await db.exceptions.count();
      expect(count).toBe(3);

      // Active pattern should be restored to C3
      const active = await db.activePatterns.toArray();
      expect(active[0]?.patternId).toBe('pattern-c3');

      // Onboarding should be completed automatically
      expect(useAppStore.getState().hasCompletedSetup).toBe(true);
    });
  });

  describe('Smart Merge (Multi-Device Two-Way Sync)', () => {
    it('should merge exceptions when both local device and cloud have records', async () => {
      // Local device has vacation on 2026-06-10
      await db.exceptions.add({
        id: 'local-ex-1',
        date: '2026-06-10',
        type: 'VACATION',
        name: 'Yerel İzin',
        color: '#f59e0b',
      });

      // Cloud has vacation on 2026-08-20
      const cloudData: CloudUserData = {
        version: 1,
        lastModified: '2026-09-12T10:00:00Z',
        updatedAt: '2026-09-12T10:00:00Z',
        shiftTypes: await db.shiftTypes.toArray(),
        patterns: await db.patterns.toArray(),
        activePatterns: [{ id: 'ap-1', patternId: 'pattern-a1', startDate: '2026-01-12' }],
        exceptions: [
          { id: 'cloud-ex-1', date: '2026-08-20', type: 'VACATION', name: 'Bulut İzin', color: '#f59e0b' },
        ],
        appSettings: {
          theme: 'light',
          calendarTheme: 'seamless',
          shiftDisplayMode: 'both',
          employmentStartDate: null,
          annualLeaveEntitlement: 14,
          hasCompletedSetup: true,
        },
      };

      mockDocSnap.exists.mockReturnValue(true);
      mockDocSnap.data.mockReturnValue(cloudData);

      const res = await smartSync('user-123');

      expect(res.status).toBe('synced');
      // Both exceptions should now exist in Dexie
      const exceptions = await db.exceptions.toArray();
      expect(exceptions.length).toBe(2);
      const dates = exceptions.map((e) => e.date).sort();
      expect(dates).toEqual(['2026-06-10', '2026-08-20']);

      // setDoc should be called to sync merged data back to Firestore
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const savedPayload = mockSetDoc.mock.calls[0][1] as CloudUserData;
      expect(savedPayload.exceptions.length).toBe(2);
    });
  });
});
