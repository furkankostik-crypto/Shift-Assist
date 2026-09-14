import Dexie, { type EntityTable } from 'dexie';
import { resolveShiftIconName } from '../utils/shiftIcons';

export interface ShiftType {
  id: string;
  name: string; // e.g., "Sabah", "Öğle", "Gece", "Off", "Yıllık İzin", "Resmi Tatil"
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "16:00"
  type: 'WORK' | 'REST';
  color: string; // e.g., "#3b82f6"
  icon?: string; // e.g., "Sun", "Moon", "Coffee", "Palmtree", "CalendarHeart"
  isDefault?: boolean;
  isSystem?: boolean; // System types cannot be deleted
  isFixed?: boolean; // Fixed default types (Sabah, Öğle, Gece, Off, Rapor)
  systemCategory?: 'VACATION' | 'HOLIDAY';
  order?: number;
}

export interface ShiftDay {
  id?: string; // unique identifier for reordering
  dayIndex: number; // 1-based index in the cycle
  shiftTypeId?: string;
  type: 'WORK' | 'REST';
  name: string; // e.g., "Sabah", "İstirahat"
  startTime?: string;
  endTime?: string;
  color: string; // e.g., "#3b82f6"
  icon?: string;
}

export interface ShiftPattern {
  id: string;
  name: string;
  cycleLength: number;
  days: ShiftDay[];
  columns?: number;
  createdAt?: string;
}

export interface ActivePattern {
  id: string;
  patternId: string;
  startDate: string; // YYYY-MM-DD
}

export interface ShiftException {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'VACATION' | 'SICK' | 'DUTY' | 'EXCUSE' | 'HOLIDAY' | 'OTHER';
  name: string; // e.g., "Yıllık İzin", "Görev"
  color: string;
  weight?: number; // 1, 0.5, 0.25
  shiftTypeId?: string;
}

export interface UserSettings {
  id: string;
  theme: 'light' | 'dark' | 'system';
  language: 'tr' | 'en';
  calendarTheme?: string;
  employmentStartDate?: string; // YYYY-MM-DD
  annualLeaveEntitlement?: number; // User's total annual leave days for current year
}

export const FIXED_SHIFT_IDS = [
  'st-morning',
  'st-afternoon',
  'st-night',
  'st-off',
  'st-sick',
] as const;

export type FixedShiftId = typeof FIXED_SHIFT_IDS[number];

export interface FixedShiftInfo {
  isFixed: boolean;
  fixedType: 'WORK' | 'REST';
  fixedHours?: { startTime: string; endTime: string };
  defaultName: string;
}

export function getFixedShiftInfo(
  st?: { id?: string; name?: string; isDefault?: boolean; isFixed?: boolean } | null
): FixedShiftInfo | null {
  if (!st) return null;
  const id = st.id || '';
  const lower = st.name?.trim().toLowerCase() || '';

  if (id === 'st-morning' || (st.isDefault && lower === 'sabah')) {
    return {
      isFixed: true,
      fixedType: 'WORK',
      fixedHours: { startTime: '06:30', endTime: '15:00' },
      defaultName: 'Sabah',
    };
  }
  if (id === 'st-afternoon' || (st.isDefault && (lower === 'öğle' || lower === 'ogle'))) {
    return {
      isFixed: true,
      fixedType: 'WORK',
      fixedHours: { startTime: '14:30', endTime: '23:00' },
      defaultName: 'Öğle',
    };
  }
  if (id === 'st-night' || (st.isDefault && lower === 'gece')) {
    return {
      isFixed: true,
      fixedType: 'WORK',
      fixedHours: { startTime: '22:30', endTime: '07:00' },
      defaultName: 'Gece',
    };
  }
  if (id === 'st-off' || (st.isDefault && lower === 'off')) {
    return {
      isFixed: true,
      fixedType: 'REST',
      fixedHours: { startTime: '', endTime: '' },
      defaultName: 'Off',
    };
  }
  if (id === 'st-sick' || (st.isDefault && lower === 'rapor')) {
    return {
      isFixed: true,
      fixedType: 'REST',
      fixedHours: { startTime: '', endTime: '' },
      defaultName: 'Rapor',
    };
  }

  return null;
}

export function isFixedShiftType(
  st?: { id?: string; name?: string; isDefault?: boolean; isFixed?: boolean; isSystem?: boolean } | null
): boolean {
  if (!st) return false;
  if (st.isSystem) return true;
  return getFixedShiftInfo(st) !== null;
}

export const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  {
    id: 'st-morning',
    name: 'Sabah',
    startTime: '06:30',
    endTime: '15:00',
    type: 'WORK',
    color: '#3b82f6',
    icon: 'Sun',
    isDefault: true,
    isFixed: true,
    order: 0,
  },
  {
    id: 'st-afternoon',
    name: 'Öğle',
    startTime: '14:30',
    endTime: '23:00',
    type: 'WORK',
    color: '#f97316',
    icon: 'Sunset',
    isDefault: true,
    isFixed: true,
    order: 1,
  },
  {
    id: 'st-night',
    name: 'Gece',
    startTime: '22:30',
    endTime: '07:00',
    type: 'WORK',
    color: '#8b5cf6',
    icon: 'Moon',
    isDefault: true,
    isFixed: true,
    order: 2,
  },
  {
    id: 'st-off',
    name: 'Off',
    startTime: '',
    endTime: '',
    type: 'REST',
    color: '#10b981',
    icon: 'Coffee',
    isDefault: true,
    isFixed: true,
    order: 3,
  },
  {
    id: 'st-vacation',
    name: 'Senelik İzin',
    startTime: '',
    endTime: '',
    type: 'REST',
    color: '#f59e0b',
    icon: 'Palmtree',
    isDefault: true,
    isSystem: true,
    systemCategory: 'VACATION',
    order: 4,
  },
  {
    id: 'st-sick',
    name: 'Rapor',
    startTime: '',
    endTime: '',
    type: 'REST',
    color: '#ef4444',
    icon: 'HeartPulse',
    isDefault: true,
    isFixed: true,
    order: 5,
  },
  {
    id: 'st-excuse',
    name: 'Mazeret',
    startTime: '',
    endTime: '',
    type: 'REST',
    color: '#06b6d4',
    icon: 'CalendarCheck',
    isDefault: true,
    order: 6,
  },
  {
    id: 'st-holiday',
    name: 'Resmi Tatil / Özel Gün',
    startTime: '',
    endTime: '',
    type: 'REST',
    color: '#e11d48',
    icon: 'CalendarHeart',
    isDefault: true,
    isSystem: true,
    systemCategory: 'HOLIDAY',
    order: 7,
  },
];

export const DEFAULT_PATTERN_START_DATE = '2026-01-12';

const MORNING_SHIFT_DEF = {
  shiftTypeId: 'st-morning',
  type: 'WORK' as const,
  name: 'Sabah',
  startTime: '06:30',
  endTime: '15:00',
  color: '#3b82f6',
  icon: 'Sun',
};

const AFTERNOON_SHIFT_DEF = {
  shiftTypeId: 'st-afternoon',
  type: 'WORK' as const,
  name: 'Öğle',
  startTime: '14:30',
  endTime: '23:00',
  color: '#f97316',
  icon: 'Sunset',
};

const NIGHT_SHIFT_DEF = {
  shiftTypeId: 'st-night',
  type: 'WORK' as const,
  name: 'Gece',
  startTime: '22:30',
  endTime: '07:00',
  color: '#8b5cf6',
  icon: 'Moon',
};

const REST_SHIFT_DEF = {
  shiftTypeId: 'st-off',
  type: 'REST' as const,
  name: 'Off',
  startTime: '',
  endTime: '',
  color: '#10b981',
  icon: 'Coffee',
};

export function createTeamPattern(teamId: string): ShiftPattern {
  const teamGroup = teamId[0].toUpperCase() as 'A' | 'B' | 'C' | 'D';
  const subTeam = parseInt(teamId[1], 10) as 1 | 2 | 3 | 4;

  const groupOffsets: Record<'A' | 'B' | 'C' | 'D', number> = {
    D: 0,
    A: 2,
    B: 4,
    C: 6,
  };
  const offset = groupOffsets[teamGroup];

  const firstMornings: number[] = [];
  const secondNights: number[] = [];

  for (let i = 0; i < 32; i++) {
    const dayInBlock = (i + offset) % 8;
    if (dayInBlock === 2) firstMornings.push(i);
    if (dayInBlock === 7) secondNights.push(i);
  }

  const subTeamMappings: Record<number, number[]> = {
    1: [firstMornings[2], secondNights[3]],
    2: [firstMornings[1], secondNights[2]],
    3: [firstMornings[0], secondNights[1]],
    4: [firstMornings[3], secondNights[0]],
  };

  const extras = new Set(subTeamMappings[subTeam]);
  const days: ShiftDay[] = [];

  for (let i = 0; i < 32; i++) {
    const dayInBlock = (i + offset) % 8;
    let template:
      | typeof REST_SHIFT_DEF
      | typeof MORNING_SHIFT_DEF
      | typeof AFTERNOON_SHIFT_DEF
      | typeof NIGHT_SHIFT_DEF = REST_SHIFT_DEF;

    if (dayInBlock === 0 || dayInBlock === 1) {
      template = REST_SHIFT_DEF;
    } else if (dayInBlock === 2 || dayInBlock === 3) {
      template = MORNING_SHIFT_DEF;
    } else if (dayInBlock === 4 || dayInBlock === 5) {
      template = AFTERNOON_SHIFT_DEF;
    } else if (dayInBlock === 6 || dayInBlock === 7) {
      template = NIGHT_SHIFT_DEF;
    }

    if (extras.has(i)) {
      template = REST_SHIFT_DEF;
    }

    days.push({
      id: `${teamId.toLowerCase()}-day-${i + 1}`,
      dayIndex: i + 1,
      shiftTypeId: template.shiftTypeId,
      type: template.type,
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      color: template.color,
      icon: template.icon,
    });
  }

  return {
    id: `pattern-${teamId.toLowerCase()}`,
    name: `${teamId.toUpperCase()} Ekibi (HAT)`,
    cycleLength: 32,
    columns: 8,
    days,
    createdAt: new Date().toISOString(),
  };
}

export const DEFAULT_PATTERNS: ShiftPattern[] = [
  createTeamPattern('A1'), createTeamPattern('A2'), createTeamPattern('A3'), createTeamPattern('A4'),
  createTeamPattern('B1'), createTeamPattern('B2'), createTeamPattern('B3'), createTeamPattern('B4'),
  createTeamPattern('C1'), createTeamPattern('C2'), createTeamPattern('C3'), createTeamPattern('C4'),
  createTeamPattern('D1'), createTeamPattern('D2'), createTeamPattern('D3'), createTeamPattern('D4'),
];

const db = new Dexie('VardiyaTakipDB') as Dexie & {
  shiftTypes: EntityTable<ShiftType, 'id'>;
  patterns: EntityTable<ShiftPattern, 'id'>;
  activePatterns: EntityTable<ActivePattern, 'id'>;
  exceptions: EntityTable<ShiftException, 'id'>;
  settings: EntityTable<UserSettings, 'id'>;
};

// Schema declaration
db.version(2).stores({
  shiftTypes: 'id, name, type',
  patterns: 'id',
  activePatterns: 'id, patternId, startDate',
  exceptions: 'id, date',
  settings: 'id',
});

db.version(3).stores({
  shiftTypes: 'id, name, type, order',
  patterns: 'id',
  activePatterns: 'id, patternId, startDate',
  exceptions: 'id, date',
  settings: 'id',
});

let seedingPromise: Promise<void> | null = null;

// Auto seed default shift types if empty and ensure system shift types exist
export async function ensureDefaultShiftTypes(): Promise<void> {
  if (seedingPromise) return seedingPromise;
  seedingPromise = (async () => {
    const count = await db.shiftTypes.count();
    if (count === 0) {
      await db.shiftTypes.bulkPut(DEFAULT_SHIFT_TYPES);
    } else {
      const existing = await db.shiftTypes.toArray();

      await db.transaction('rw', db.shiftTypes, db.patterns, async () => {
        // 1. Update standard default shift types to new user-specified hours and names
        for (const item of existing) {
          const updates: Partial<ShiftType> = {};

        if (item.id === 'st-morning' || item.name.toLowerCase() === 'sabah') {
          if (item.startTime !== '06:30' || item.endTime !== '15:00' || item.type !== 'WORK' || !item.isFixed || !item.isDefault) {
            updates.startTime = '06:30';
            updates.endTime = '15:00';
            updates.type = 'WORK';
            updates.isFixed = true;
            updates.isDefault = true;
          }
          if (!item.name) updates.name = 'Sabah';
          if (!item.color) updates.color = '#3b82f6';
          if (!item.icon) updates.icon = 'Sun';
        } else if (item.id === 'st-afternoon' || item.name.toLowerCase() === 'öğle' || item.name.toLowerCase() === 'ogle') {
          if (item.startTime !== '14:30' || item.endTime !== '23:00' || item.type !== 'WORK' || !item.isFixed || !item.isDefault) {
            updates.startTime = '14:30';
            updates.endTime = '23:00';
            updates.type = 'WORK';
            updates.isFixed = true;
            updates.isDefault = true;
          }
          if (!item.name) updates.name = 'Öğle';
          if (!item.color) updates.color = '#f97316';
          if (!item.icon) updates.icon = 'Sunset';
        } else if (item.id === 'st-night' || item.name.toLowerCase() === 'gece') {
          if (item.startTime !== '22:30' || item.endTime !== '07:00' || item.type !== 'WORK' || !item.isFixed || !item.isDefault) {
            updates.startTime = '22:30';
            updates.endTime = '07:00';
            updates.type = 'WORK';
            updates.isFixed = true;
            updates.isDefault = true;
          }
          if (!item.name) updates.name = 'Gece';
          if (!item.color) updates.color = '#8b5cf6';
          if (!item.icon) updates.icon = 'Moon';
        } else if (item.id === 'st-off' || item.name.toLowerCase() === 'off') {
          if (item.type !== 'REST' || item.startTime !== '' || item.endTime !== '' || !item.isFixed || !item.isDefault) {
            updates.type = 'REST';
            updates.startTime = '';
            updates.endTime = '';
            updates.isFixed = true;
            updates.isDefault = true;
          }
          if (!item.name) updates.name = 'Off';
          if (!item.color) updates.color = '#10b981';
          if (!item.icon) updates.icon = 'Coffee';
        } else if (item.id === 'st-sick' || item.name.toLowerCase().includes('rapor')) {
          if (item.type !== 'REST' || item.startTime !== '' || item.endTime !== '' || !item.isFixed || !item.isDefault) {
            updates.type = 'REST';
            updates.startTime = '';
            updates.endTime = '';
            updates.isFixed = true;
            updates.isDefault = true;
          }
          if (!item.name) updates.name = 'Rapor';
          if (!item.color) updates.color = '#ef4444';
          if (!item.icon) updates.icon = 'HeartPulse';
        } else if (item.id === 'st-vacation' || item.id === 'st-leave') {
          if (!item.isSystem) updates.isSystem = true;
          if (!item.systemCategory) updates.systemCategory = 'VACATION';
          if (item.name === 'Yıllık İzin') updates.name = 'Senelik İzin';
          if (!item.color) updates.color = '#f59e0b';
          if (!item.icon) updates.icon = 'Palmtree';
        }

        if (item.order === undefined) {
          updates.order = existing.indexOf(item);
        }
        if (!item.icon) {
          updates.icon = resolveShiftIconName(
            undefined,
            item.type,
            item.name
          );
        }

        if (Object.keys(updates).length > 0) {
          await db.shiftTypes.update(item.id, updates);
        }
      }

      // 2. Remove legacy 12h/24h default types if untouched and unused
      const allPatterns = await db.patterns.toArray();
      const usedShiftTypeIds = new Set(allPatterns.flatMap((p) => (p.days || []).map((d) => d.shiftTypeId)));
      for (const legacyId of ['st-day12', 'st-night12', 'st-24h']) {
        if (!usedShiftTypeIds.has(legacyId)) {
          await db.shiftTypes.delete(legacyId);
        }
      }

      // 3. Ensure Rapor (st-sick) exists
      const hasSick = existing.some(
        (st) => st.id === 'st-sick' || st.name.toLowerCase().includes('rapor')
      );
      if (!hasSick) {
        await db.shiftTypes.put({
          id: 'st-sick',
          name: 'Rapor',
          startTime: '',
          endTime: '',
          type: 'REST',
          color: '#ef4444',
          icon: 'HeartPulse',
          isDefault: true,
          isFixed: true,
          order: 5,
        });
      }

      // 4. Ensure Mazeret (st-excuse) exists
      const hasExcuse = existing.some(
        (st) => st.id === 'st-excuse' || st.name.toLowerCase().includes('mazeret')
      );
      if (!hasExcuse) {
        await db.shiftTypes.put({
          id: 'st-excuse',
          name: 'Mazeret',
          startTime: '',
          endTime: '',
          type: 'REST',
          color: '#06b6d4',
          icon: 'CalendarCheck',
          isDefault: true,
          order: 6,
        });
      }

      // 5. Ensure system Vacation type exists
      const hasVacation = existing.some(
        (st) => st.systemCategory === 'VACATION' || st.id === 'st-vacation' || st.id === 'st-leave'
      );
      if (!hasVacation) {
        await db.shiftTypes.put({
          id: 'st-vacation',
          name: 'Senelik İzin',
          startTime: '',
          endTime: '',
          type: 'REST',
          color: '#f59e0b',
          icon: 'Palmtree',
          isDefault: true,
          isSystem: true,
          systemCategory: 'VACATION',
          order: 4,
        });
      }

      // 6. Ensure system Holiday type exists
      const hasHoliday = existing.some(
        (st) => st.systemCategory === 'HOLIDAY' || st.id === 'st-holiday'
      );
      if (!hasHoliday) {
        await db.shiftTypes.put({
          id: 'st-holiday',
          name: 'Resmi Tatil / Özel Gün',
          startTime: '',
          endTime: '',
          type: 'REST',
          color: '#e11d48',
          icon: 'CalendarHeart',
          isDefault: true,
          isSystem: true,
          systemCategory: 'HOLIDAY',
          order: 7,
        });
      }
    });
  }

  // Ensure default team patterns exist and activate D1 by default
  await ensureDefaultPatterns();
  })().finally(() => {
    seedingPromise = null;
  });
  return seedingPromise;
}

export async function ensureDefaultPatterns() {
  const allPatterns = await db.patterns.toArray();
  const existingIds = new Set(allPatterns.map((p) => p.id));

  for (const defaultPattern of DEFAULT_PATTERNS) {
    if (!existingIds.has(defaultPattern.id)) {
      await db.patterns.put(defaultPattern);
    } else {
      // Sync official 32-day pattern days
      await db.patterns.update(defaultPattern.id, {
        name: defaultPattern.name,
        cycleLength: defaultPattern.cycleLength,
        columns: defaultPattern.columns,
        days: defaultPattern.days,
      });
    }
  }

  // Check active patterns
  const activePatterns = await db.activePatterns.toArray();
  const currentActiveId = activePatterns[0]?.patternId;

  // If no active pattern, or active pattern is invalid or old placeholder, activate D1
  const isDefaultTeamPattern = currentActiveId && currentActiveId.match(/^pattern-[a-d][1-4]$/);
  if (!currentActiveId || !isDefaultTeamPattern) {
    await db.activePatterns.clear();
    await db.activePatterns.put({
      id: 'default-active-pattern',
      patternId: 'pattern-d1',
      startDate: DEFAULT_PATTERN_START_DATE,
    });
  } else if (isDefaultTeamPattern) {
    const currentPattern = activePatterns[0];
    if (currentPattern.startDate !== DEFAULT_PATTERN_START_DATE && !localStorage.getItem('d_team_start_date_fixed')) {
      await db.activePatterns.update(currentPattern.id, {
        startDate: DEFAULT_PATTERN_START_DATE,
      });
      localStorage.setItem('d_team_start_date_fixed', 'true');
    }
  }
}

// Ensure defaults are populated on init
ensureDefaultShiftTypes().catch(console.error);

export { db };
