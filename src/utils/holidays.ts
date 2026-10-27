export type HolidayType =
  | 'national'
  | 'religious'
  | 'eve'
  | 'commemoration'
  | 'special'
  | 'school';

export interface HolidayDetail {
  name: string;
  shortName: string;
  type: HolidayType;
  isHalfDay?: boolean;
  isOfficial?: boolean;
  description?: string;
}

export interface Holiday {
  date: string; // MM-dd for fixed, or yyyy-MM-dd for dynamic
  name: string;
  shortName: string;
  type: HolidayType;
  isHalfDay?: boolean;
  isOfficial?: boolean;
  description?: string;
}

// Fixed Turkish National & Special Days (Applies to every year)
const fixedHolidays: Holiday[] = [
  {
    date: '01-01',
    name: 'Yılbaşı',
    shortName: 'Yılbaşı',
    type: 'national',
    isOfficial: true,
    description: 'Yeni Yılın İlk Günü • Resmi Tatil',
  },
  {
    date: '03-08',
    name: 'Dünya Kadınlar Günü',
    shortName: '8 Mart',
    type: 'special',
    isOfficial: false,
    description: 'Dünya Kadınlar Günü',
  },
  {
    date: '03-14',
    name: 'Tıp Bayramı',
    shortName: '14 Mart',
    type: 'special',
    isOfficial: false,
    description: 'Sağlık Çalışanları Tıp Bayramı',
  },
  {
    date: '03-18',
    name: 'Çanakkale Zaferi ve Şehitleri Anma Günü',
    shortName: '18 Mart',
    type: 'commemoration',
    isOfficial: false,
    description: '18 Mart Çanakkale Zaferi',
  },
  {
    date: '04-23',
    name: 'Ulusal Egemenlik ve Çocuk Bayramı',
    shortName: '23 Nisan',
    type: 'national',
    isOfficial: true,
    description: 'TBMM Kuruluşu ve Çocuk Bayramı • Resmi Tatil',
  },
  {
    date: '05-01',
    name: 'Emek ve Dayanışma Günü',
    shortName: '1 Mayıs',
    type: 'national',
    isOfficial: true,
    description: 'İşçi ve Emekçi Bayramı • Resmi Tatil',
  },
  {
    date: '05-19',
    name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
    shortName: '19 Mayıs',
    type: 'national',
    isOfficial: true,
    description: 'Milli Mücadele Başlangıcı ve Gençlik Bayramı • Resmi Tatil',
  },
  {
    date: '07-15',
    name: 'Demokrasi ve Milli Birlik Günü',
    shortName: '15 Temmuz',
    type: 'national',
    isOfficial: true,
    description: 'Demokrasi ve Milli Birlik Günü • Resmi Tatil',
  },
  {
    date: '08-30',
    name: 'Zafer Bayramı',
    shortName: '30 Ağustos',
    type: 'national',
    isOfficial: true,
    description: 'Büyük Taarruz Zafer Bayramı • Resmi Tatil',
  },
  {
    date: '10-28',
    name: 'Cumhuriyet Bayramı Arifesi',
    shortName: '28 Ekim Arife',
    type: 'eve',
    isHalfDay: true,
    isOfficial: true,
    description: 'Cumhuriyet Bayramı Arifesi • Yarım Gün Tatil (13:00 sonrası)',
  },
  {
    date: '10-29',
    name: 'Cumhuriyet Bayramı',
    shortName: '29 Ekim',
    type: 'national',
    isOfficial: true,
    description: 'Cumhuriyetin İlanı 100+ Yıl • Resmi Tatil',
  },
  {
    date: '11-10',
    name: "10 Kasım Atatürk'ü Anma Günü",
    shortName: '10 Kasım',
    type: 'commemoration',
    isOfficial: false,
    description: "Gazi Mustafa Kemal Atatürk'ün Ebediyete İntikali",
  },
  {
    date: '11-24',
    name: 'Öğretmenler Günü',
    shortName: '24 Kasım',
    type: 'special',
    isOfficial: false,
    description: '24 Kasım Öğretmenler Günü',
  },
  {
    date: '12-31',
    name: 'Yılbaşı Gecesi',
    shortName: '31 Aralık',
    type: 'special',
    isOfficial: false,
    description: 'Yılın Son Günü / Yılbaşı Gecesi',
  },
];

// Turkish Religious Holidays & Islamic Calendar (2024 - 2030)
const dynamicHolidays: Holiday[] = [
  // 2024
  { date: '2024-04-09', name: 'Ramazan Bayramı Arifesi', shortName: 'Ramazan Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2024-04-10', name: 'Ramazan Bayramı 1. Gün', shortName: 'Ramazan B. 1', type: 'religious', isOfficial: true },
  { date: '2024-04-11', name: 'Ramazan Bayramı 2. Gün', shortName: 'Ramazan B. 2', type: 'religious', isOfficial: true },
  { date: '2024-04-12', name: 'Ramazan Bayramı 3. Gün', shortName: 'Ramazan B. 3', type: 'religious', isOfficial: true },
  { date: '2024-06-15', name: 'Kurban Bayramı Arifesi', shortName: 'Kurban Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2024-06-16', name: 'Kurban Bayramı 1. Gün', shortName: 'Kurban B. 1', type: 'religious', isOfficial: true },
  { date: '2024-06-17', name: 'Kurban Bayramı 2. Gün', shortName: 'Kurban B. 2', type: 'religious', isOfficial: true },
  { date: '2024-06-18', name: 'Kurban Bayramı 3. Gün', shortName: 'Kurban B. 3', type: 'religious', isOfficial: true },
  { date: '2024-06-19', name: 'Kurban Bayramı 4. Gün', shortName: 'Kurban B. 4', type: 'religious', isOfficial: true },

  // 2025
  { date: '2025-03-29', name: 'Ramazan Bayramı Arifesi', shortName: 'Ramazan Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2025-03-30', name: 'Ramazan Bayramı 1. Gün', shortName: 'Ramazan B. 1', type: 'religious', isOfficial: true },
  { date: '2025-03-31', name: 'Ramazan Bayramı 2. Gün', shortName: 'Ramazan B. 2', type: 'religious', isOfficial: true },
  { date: '2025-04-01', name: 'Ramazan Bayramı 3. Gün', shortName: 'Ramazan B. 3', type: 'religious', isOfficial: true },
  { date: '2025-06-05', name: 'Kurban Bayramı Arifesi', shortName: 'Kurban Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2025-06-06', name: 'Kurban Bayramı 1. Gün', shortName: 'Kurban B. 1', type: 'religious', isOfficial: true },
  { date: '2025-06-07', name: 'Kurban Bayramı 2. Gün', shortName: 'Kurban B. 2', type: 'religious', isOfficial: true },
  { date: '2025-06-08', name: 'Kurban Bayramı 3. Gün', shortName: 'Kurban B. 3', type: 'religious', isOfficial: true },
  { date: '2025-06-09', name: 'Kurban Bayramı 4. Gün', shortName: 'Kurban B. 4', type: 'religious', isOfficial: true },

  // 2026
  { date: '2026-03-19', name: 'Ramazan Bayramı Arifesi', shortName: 'Ramazan Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2026-03-20', name: 'Ramazan Bayramı 1. Gün', shortName: 'Ramazan B. 1', type: 'religious', isOfficial: true },
  { date: '2026-03-21', name: 'Ramazan Bayramı 2. Gün', shortName: 'Ramazan B. 2', type: 'religious', isOfficial: true },
  { date: '2026-03-22', name: 'Ramazan Bayramı 3. Gün', shortName: 'Ramazan B. 3', type: 'religious', isOfficial: true },
  { date: '2026-05-26', name: 'Kurban Bayramı Arifesi', shortName: 'Kurban Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2026-05-27', name: 'Kurban Bayramı 1. Gün', shortName: 'Kurban B. 1', type: 'religious', isOfficial: true },
  { date: '2026-05-28', name: 'Kurban Bayramı 2. Gün', shortName: 'Kurban B. 2', type: 'religious', isOfficial: true },
  { date: '2026-05-29', name: 'Kurban Bayramı 3. Gün', shortName: 'Kurban B. 3', type: 'religious', isOfficial: true },
  { date: '2026-05-30', name: 'Kurban Bayramı 4. Gün', shortName: 'Kurban B. 4', type: 'religious', isOfficial: true },

  // 2027
  { date: '2027-03-09', name: 'Ramazan Bayramı Arifesi', shortName: 'Ramazan Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2027-03-10', name: 'Ramazan Bayramı 1. Gün', shortName: 'Ramazan B. 1', type: 'religious', isOfficial: true },
  { date: '2027-03-11', name: 'Ramazan Bayramı 2. Gün', shortName: 'Ramazan B. 2', type: 'religious', isOfficial: true },
  { date: '2027-03-12', name: 'Ramazan Bayramı 3. Gün', shortName: 'Ramazan B. 3', type: 'religious', isOfficial: true },
  { date: '2027-05-16', name: 'Kurban Bayramı Arifesi', shortName: 'Kurban Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2027-05-17', name: 'Kurban Bayramı 1. Gün', shortName: 'Kurban B. 1', type: 'religious', isOfficial: true },
  { date: '2027-05-18', name: 'Kurban Bayramı 2. Gün', shortName: 'Kurban B. 2', type: 'religious', isOfficial: true },
  { date: '2027-05-19', name: 'Kurban Bayramı 3. Gün', shortName: 'Kurban B. 3', type: 'religious', isOfficial: true },
  { date: '2027-05-20', name: 'Kurban Bayramı 4. Gün', shortName: 'Kurban B. 4', type: 'religious', isOfficial: true },

  // 2028
  { date: '2028-02-26', name: 'Ramazan Bayramı Arifesi', shortName: 'Ramazan Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2028-02-27', name: 'Ramazan Bayramı 1. Gün', shortName: 'Ramazan B. 1', type: 'religious', isOfficial: true },
  { date: '2028-02-28', name: 'Ramazan Bayramı 2. Gün', shortName: 'Ramazan B. 2', type: 'religious', isOfficial: true },
  { date: '2028-02-29', name: 'Ramazan Bayramı 3. Gün', shortName: 'Ramazan B. 3', type: 'religious', isOfficial: true },
  { date: '2028-05-04', name: 'Kurban Bayramı Arifesi', shortName: 'Kurban Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2028-05-05', name: 'Kurban Bayramı 1. Gün', shortName: 'Kurban B. 1', type: 'religious', isOfficial: true },
  { date: '2028-05-06', name: 'Kurban Bayramı 2. Gün', shortName: 'Kurban B. 2', type: 'religious', isOfficial: true },
  { date: '2028-05-07', name: 'Kurban Bayramı 3. Gün', shortName: 'Kurban B. 3', type: 'religious', isOfficial: true },
  { date: '2028-05-08', name: 'Kurban Bayramı 4. Gün', shortName: 'Kurban B. 4', type: 'religious', isOfficial: true },

  // 2029
  { date: '2029-02-14', name: 'Ramazan Bayramı Arifesi', shortName: 'Ramazan Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2029-02-15', name: 'Ramazan Bayramı 1. Gün', shortName: 'Ramazan B. 1', type: 'religious', isOfficial: true },
  { date: '2029-02-16', name: 'Ramazan Bayramı 2. Gün', shortName: 'Ramazan B. 2', type: 'religious', isOfficial: true },
  { date: '2029-02-17', name: 'Ramazan Bayramı 3. Gün', shortName: 'Ramazan B. 3', type: 'religious', isOfficial: true },
  { date: '2029-04-23', name: 'Kurban Bayramı Arifesi', shortName: 'Kurban Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2029-04-24', name: 'Kurban Bayramı 1. Gün', shortName: 'Kurban B. 1', type: 'religious', isOfficial: true },
  { date: '2029-04-25', name: 'Kurban Bayramı 2. Gün', shortName: 'Kurban B. 2', type: 'religious', isOfficial: true },
  { date: '2029-04-26', name: 'Kurban Bayramı 3. Gün', shortName: 'Kurban B. 3', type: 'religious', isOfficial: true },
  { date: '2029-04-27', name: 'Kurban Bayramı 4. Gün', shortName: 'Kurban B. 4', type: 'religious', isOfficial: true },

  // 2030
  { date: '2030-02-03', name: 'Ramazan Bayramı Arifesi', shortName: 'Ramazan Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2030-02-04', name: 'Ramazan Bayramı 1. Gün', shortName: 'Ramazan B. 1', type: 'religious', isOfficial: true },
  { date: '2030-02-05', name: 'Ramazan Bayramı 2. Gün', shortName: 'Ramazan B. 2', type: 'religious', isOfficial: true },
  { date: '2030-02-06', name: 'Ramazan Bayramı 3. Gün', shortName: 'Ramazan B. 3', type: 'religious', isOfficial: true },
  { date: '2030-04-12', name: 'Kurban Bayramı Arifesi', shortName: 'Kurban Arifesi', type: 'eve', isHalfDay: true, isOfficial: true },
  { date: '2030-04-13', name: 'Kurban Bayramı 1. Gün', shortName: 'Kurban B. 1', type: 'religious', isOfficial: true },
  { date: '2030-04-14', name: 'Kurban Bayramı 2. Gün', shortName: 'Kurban B. 2', type: 'religious', isOfficial: true },
  { date: '2030-04-15', name: 'Kurban Bayramı 3. Gün', shortName: 'Kurban B. 3', type: 'religious', isOfficial: true },
  { date: '2030-04-16', name: 'Kurban Bayramı 4. Gün', shortName: 'Kurban B. 4', type: 'religious', isOfficial: true },
];

// Pre-calculated constant badge colors to guarantee referential equality and single unified special day representation
const UNIFIED_HOLIDAY_BADGE_COLORS: HolidayBadgeColors = {
  badgeBg: 'bg-rose-600 dark:bg-rose-500',
  badgeText: 'text-white',
  border: 'border-rose-300 dark:border-rose-800',
  softBg: 'bg-rose-50 dark:bg-rose-950/40',
  textColor: 'text-rose-600 dark:text-rose-400',
  accentColor: '#e11d48',
  tagBg: 'bg-rose-100 dark:bg-rose-900/60',
  tagText: 'text-rose-800 dark:text-rose-200',
};

const SCHOOL_HOLIDAY_BADGE_COLORS: HolidayBadgeColors = {
  badgeBg: 'bg-sky-600 dark:bg-sky-500',
  badgeText: 'text-white',
  border: 'border-sky-300 dark:border-sky-800',
  softBg: 'bg-sky-50 dark:bg-sky-950/40',
  textColor: 'text-sky-600 dark:text-sky-400',
  accentColor: '#0284c7',
  tagBg: 'bg-sky-100 dark:bg-sky-900/60',
  tagText: 'text-sky-800 dark:text-sky-200',
};

// O(1) Pre-indexed Hash Maps for instantaneous holiday lookup
const dynamicHolidaysMap = new Map<string, HolidayDetail>();
for (const h of dynamicHolidays) {
  dynamicHolidaysMap.set(h.date, {
    name: h.name,
    shortName: h.shortName,
    type: h.type,
    isHalfDay: h.isHalfDay,
    isOfficial: h.isOfficial ?? true,
    description:
      h.description ||
      (h.isHalfDay
        ? 'Arife Günü • Yarım Gün Tatil (13:00 Sonrası)'
        : `${h.name} • Resmi Tatil`),
  });
}

const fixedHolidaysMap = new Map<string, HolidayDetail>();
for (const h of fixedHolidays) {
  fixedHolidaysMap.set(h.date, {
    name: h.name,
    shortName: h.shortName,
    type: h.type,
    isHalfDay: h.isHalfDay,
    isOfficial: h.isOfficial ?? (h.type === 'national' || h.type === 'eve'),
    description: h.description || `${h.name}`,
  });
}

// Fast string formatting helpers (10x faster than date-fns format tokens)
export function formatToMonthDayFast(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}-${d}`;
}

export function formatToFullDateFast(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getHolidayDetail(date: Date): HolidayDetail | null {
  const fullDate = formatToFullDateFast(date);
  // Dynamic (religious / exact date) takes precedence - O(1)
  const dynamic = dynamicHolidaysMap.get(fullDate);
  if (dynamic) return dynamic;

  const monthDay = formatToMonthDayFast(date);
  const fixed = fixedHolidaysMap.get(monthDay);
  if (fixed) return fixed;

  return null;
}

export function getHolidayForDate(date: Date): string | null {
  const detail = getHolidayDetail(date);
  return detail ? detail.name : null;
}

export function isOfficialHoliday(date: Date): boolean {
  const detail = getHolidayDetail(date);
  return Boolean(detail && detail.isOfficial);
}

export type HolidayBadgeColors = {
  badgeBg: string;
  badgeText: string;
  border: string;
  softBg: string;
  textColor: string;
  accentColor: string;
  tagBg: string;
  tagText: string;
};

// Visual helpers for holiday styling with static singleton references
export function getHolidayBadgeColors(type?: HolidayType): HolidayBadgeColors {
  if (type === 'school') return SCHOOL_HOLIDAY_BADGE_COLORS;
  return UNIFIED_HOLIDAY_BADGE_COLORS;
}

export interface YearHolidayItem {
  id: string;
  dateStr: string; // yyyy-MM-dd
  endDateStr?: string; // yyyy-MM-dd for period ranges
  date: Date;
  endDate?: Date;
  daysCount?: number;
  name: string;
  shortName: string;
  type: HolidayType;
  isHalfDay: boolean;
  isOfficial: boolean;
  description: string;
  isRange?: boolean;
}

export interface SchoolHolidayPeriod {
  id: string;
  name: string;
  shortName: string;
  startDateStr: string; // yyyy-MM-dd
  endDateStr: string;   // yyyy-MM-dd
  startDate: Date;
  endDate: Date;
  daysCount: number;
  description: string;
  type: 'school';
  termType: 'semester' | 'midterm1' | 'midterm2' | 'summer';
  academicYear: string;
}

interface RawSchoolPeriod {
  name: string;
  shortName: string;
  startDateStr: string;
  endDateStr: string;
  termType: 'semester' | 'midterm1' | 'midterm2' | 'summer';
  academicYear: string;
  description: string;
}

// Turkish Ministry of National Education (MEB) Academic Break Calendars (2024 - 2030)
const schoolHolidaysData: RawSchoolPeriod[] = [
  // 2024
  {
    name: 'Yarıyıl Tatili (Sömestr)',
    shortName: 'Sömestr',
    startDateStr: '2024-01-20',
    endDateStr: '2024-02-04',
    termType: 'semester',
    academicYear: '2023-2024',
    description: 'MEB 2023-2024 Yarıyıl (Sömestr) Tatili • 16 Gün',
  },
  {
    name: '2. Dönem Ara Tatili',
    shortName: '2. Ara Tatil',
    startDateStr: '2024-04-06',
    endDateStr: '2024-04-14',
    termType: 'midterm2',
    academicYear: '2023-2024',
    description: 'MEB 2023-2024 2. Dönem Ara Tatili • 9 Gün',
  },
  {
    name: 'Yaz Tatili',
    shortName: 'Yaz Tatili',
    startDateStr: '2024-06-14',
    endDateStr: '2024-09-08',
    termType: 'summer',
    academicYear: '2023-2024',
    description: 'MEB 2023-2024 Yaz Tatili • 87 Gün',
  },
  {
    name: '1. Dönem Ara Tatili',
    shortName: '1. Ara Tatil',
    startDateStr: '2024-11-09',
    endDateStr: '2024-11-17',
    termType: 'midterm1',
    academicYear: '2024-2025',
    description: 'MEB 2024-2025 1. Dönem Ara Tatili • 9 Gün',
  },

  // 2025
  {
    name: 'Yarıyıl Tatili (Sömestr)',
    shortName: 'Sömestr',
    startDateStr: '2025-01-18',
    endDateStr: '2025-02-02',
    termType: 'semester',
    academicYear: '2024-2025',
    description: 'MEB 2024-2025 Yarıyıl (Sömestr) Tatili • 16 Gün',
  },
  {
    name: '2. Dönem Ara Tatili',
    shortName: '2. Ara Tatil',
    startDateStr: '2025-03-29',
    endDateStr: '2025-04-06',
    termType: 'midterm2',
    academicYear: '2024-2025',
    description: 'MEB 2024-2025 2. Dönem Ara Tatili • 9 Gün',
  },
  {
    name: 'Yaz Tatili',
    shortName: 'Yaz Tatili',
    startDateStr: '2025-06-20',
    endDateStr: '2025-09-07',
    termType: 'summer',
    academicYear: '2024-2025',
    description: 'MEB 2024-2025 Yaz Tatili • 80 Gün',
  },
  {
    name: '1. Dönem Ara Tatili',
    shortName: '1. Ara Tatil',
    startDateStr: '2025-11-08',
    endDateStr: '2025-11-16',
    termType: 'midterm1',
    academicYear: '2025-2026',
    description: 'MEB 2025-2026 1. Dönem Ara Tatili • 9 Gün',
  },

  // 2026
  {
    name: 'Yarıyıl Tatili (Sömestr)',
    shortName: 'Sömestr',
    startDateStr: '2026-01-17',
    endDateStr: '2026-02-01',
    termType: 'semester',
    academicYear: '2025-2026',
    description: 'MEB 2025-2026 Yarıyıl (Sömestr) Tatili • 16 Gün',
  },
  {
    name: '2. Dönem Ara Tatili',
    shortName: '2. Ara Tatil',
    startDateStr: '2026-04-04',
    endDateStr: '2026-04-12',
    termType: 'midterm2',
    academicYear: '2025-2026',
    description: 'MEB 2025-2026 2. Dönem Ara Tatili • 9 Gün',
  },
  {
    name: 'Yaz Tatili',
    shortName: 'Yaz Tatili',
    startDateStr: '2026-06-19',
    endDateStr: '2026-09-06',
    termType: 'summer',
    academicYear: '2025-2026',
    description: 'MEB 2025-2026 Yaz Tatili • 80 Gün',
  },
  {
    name: '1. Dönem Ara Tatili',
    shortName: '1. Ara Tatil',
    startDateStr: '2026-11-14',
    endDateStr: '2026-11-22',
    termType: 'midterm1',
    academicYear: '2026-2027',
    description: 'MEB 2026-2027 1. Dönem Ara Tatili • 9 Gün',
  },

  // 2027
  {
    name: 'Yarıyıl Tatili (Sömestr)',
    shortName: 'Sömestr',
    startDateStr: '2027-01-23',
    endDateStr: '2027-02-07',
    termType: 'semester',
    academicYear: '2026-2027',
    description: 'MEB 2026-2027 Yarıyıl (Sömestr) Tatili • 16 Gün',
  },
  {
    name: '2. Dönem Ara Tatili',
    shortName: '2. Ara Tatil',
    startDateStr: '2027-04-10',
    endDateStr: '2027-04-18',
    termType: 'midterm2',
    academicYear: '2026-2027',
    description: 'MEB 2026-2027 2. Dönem Ara Tatili • 9 Gün',
  },
  {
    name: 'Yaz Tatili',
    shortName: 'Yaz Tatili',
    startDateStr: '2027-06-18',
    endDateStr: '2027-09-05',
    termType: 'summer',
    academicYear: '2026-2027',
    description: 'MEB 2026-2027 Yaz Tatili • 80 Gün',
  },
  {
    name: '1. Dönem Ara Tatili',
    shortName: '1. Ara Tatil',
    startDateStr: '2027-11-13',
    endDateStr: '2027-11-21',
    termType: 'midterm1',
    academicYear: '2027-2028',
    description: 'MEB 2027-2028 1. Dönem Ara Tatili • 9 Gün',
  },

  // 2028
  {
    name: 'Yarıyıl Tatili (Sömestr)',
    shortName: 'Sömestr',
    startDateStr: '2028-01-22',
    endDateStr: '2028-02-06',
    termType: 'semester',
    academicYear: '2027-2028',
    description: 'MEB 2027-2028 Yarıyıl (Sömestr) Tatili • 16 Gün',
  },
  {
    name: '2. Dönem Ara Tatili',
    shortName: '2. Ara Tatil',
    startDateStr: '2028-04-08',
    endDateStr: '2028-04-16',
    termType: 'midterm2',
    academicYear: '2027-2028',
    description: 'MEB 2027-2028 2. Dönem Ara Tatili • 9 Gün',
  },
  {
    name: 'Yaz Tatili',
    shortName: 'Yaz Tatili',
    startDateStr: '2028-06-16',
    endDateStr: '2028-09-10',
    termType: 'summer',
    academicYear: '2027-2028',
    description: 'MEB 2027-2028 Yaz Tatili • 87 Gün',
  },
  {
    name: '1. Dönem Ara Tatili',
    shortName: '1. Ara Tatil',
    startDateStr: '2028-11-11',
    endDateStr: '2028-11-19',
    termType: 'midterm1',
    academicYear: '2028-2029',
    description: 'MEB 2028-2029 1. Dönem Ara Tatili • 9 Gün',
  },

  // 2029
  {
    name: 'Yarıyıl Tatili (Sömestr)',
    shortName: 'Sömestr',
    startDateStr: '2029-01-20',
    endDateStr: '2029-02-04',
    termType: 'semester',
    academicYear: '2028-2029',
    description: 'MEB 2028-2029 Yarıyıl (Sömestr) Tatili • 16 Gün',
  },
  {
    name: '2. Dönem Ara Tatili',
    shortName: '2. Ara Tatil',
    startDateStr: '2029-04-07',
    endDateStr: '2029-04-15',
    termType: 'midterm2',
    academicYear: '2028-2029',
    description: 'MEB 2028-2029 2. Dönem Ara Tatili • 9 Gün',
  },
  {
    name: 'Yaz Tatili',
    shortName: 'Yaz Tatili',
    startDateStr: '2029-06-15',
    endDateStr: '2029-09-09',
    termType: 'summer',
    academicYear: '2028-2029',
    description: 'MEB 2028-2029 Yaz Tatili • 87 Gün',
  },
  {
    name: '1. Dönem Ara Tatili',
    shortName: '1. Ara Tatil',
    startDateStr: '2029-11-10',
    endDateStr: '2029-11-18',
    termType: 'midterm1',
    academicYear: '2029-2030',
    description: 'MEB 2029-2030 1. Dönem Ara Tatili • 9 Gün',
  },

  // 2030
  {
    name: 'Yarıyıl Tatili (Sömestr)',
    shortName: 'Sömestr',
    startDateStr: '2030-01-19',
    endDateStr: '2030-02-03',
    termType: 'semester',
    academicYear: '2029-2030',
    description: 'MEB 2029-2030 Yarıyıl (Sömestr) Tatili • 16 Gün',
  },
  {
    name: '2. Dönem Ara Tatili',
    shortName: '2. Ara Tatil',
    startDateStr: '2030-04-06',
    endDateStr: '2030-04-14',
    termType: 'midterm2',
    academicYear: '2029-2030',
    description: 'MEB 2029-2030 2. Dönem Ara Tatili • 9 Gün',
  },
  {
    name: 'Yaz Tatili',
    shortName: 'Yaz Tatili',
    startDateStr: '2030-06-14',
    endDateStr: '2030-09-08',
    termType: 'summer',
    academicYear: '2029-2030',
    description: 'MEB 2029-2030 Yaz Tatili • 87 Gün',
  },
  {
    name: '1. Dönem Ara Tatili',
    shortName: '1. Ara Tatil',
    startDateStr: '2030-11-09',
    endDateStr: '2030-11-17',
    termType: 'midterm1',
    academicYear: '2030-2031',
    description: 'MEB 2030-2031 1. Dönem Ara Tatili • 9 Gün',
  },
];

function parseDateYMD(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getSchoolHolidaysForYear(year: number): SchoolHolidayPeriod[] {
  const yearPrefix = `${year}-`;
  return schoolHolidaysData
    .filter((p) => p.startDateStr.startsWith(yearPrefix))
    .map((p) => {
      const startDate = parseDateYMD(p.startDateStr);
      const endDate = parseDateYMD(p.endDateStr);
      const diffMs = endDate.getTime() - startDate.getTime();
      const daysCount = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return {
        id: `school-${p.startDateStr}-${p.termType}`,
        name: p.name,
        shortName: p.shortName,
        startDateStr: p.startDateStr,
        endDateStr: p.endDateStr,
        startDate,
        endDate,
        daysCount,
        description: p.description,
        type: 'school' as const,
        termType: p.termType,
        academicYear: p.academicYear,
      };
    })
    .sort((a, b) => a.startDateStr.localeCompare(b.startDateStr));
}

export function schoolPeriodToHolidayItem(period: SchoolHolidayPeriod): YearHolidayItem {
  return {
    id: period.id,
    dateStr: period.startDateStr,
    endDateStr: period.endDateStr,
    date: period.startDate,
    endDate: period.endDate,
    daysCount: period.daysCount,
    name: period.name,
    shortName: period.shortName,
    type: 'school',
    isHalfDay: false,
    isOfficial: false,
    description: period.description,
    isRange: true,
  };
}

export function getSchoolHolidayForDate(date: Date): SchoolHolidayPeriod | null {
  const dateStr = formatToFullDateFast(date);
  const year = date.getFullYear();
  const periods = getSchoolHolidaysForYear(year);
  return periods.find((p) => dateStr >= p.startDateStr && dateStr <= p.endDateStr) || null;
}

export const SUPPORTED_HOLIDAY_YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export function getHolidaysForYear(year: number): YearHolidayItem[] {
  const items: YearHolidayItem[] = [];
  const yearPrefix = `${year}-`;

  // 1. Fixed holidays for the given year
  for (const h of fixedHolidays) {
    const dateStr = `${year}-${h.date}`;
    const [mStr, dStr] = h.date.split('-');
    const dateObj = new Date(year, Number(mStr) - 1, Number(dStr));
    const isOfficial = h.isOfficial ?? (h.type === 'national' || h.type === 'eve');
    items.push({
      id: `fixed-${dateStr}-${h.shortName}`,
      dateStr,
      date: dateObj,
      name: h.name,
      shortName: h.shortName,
      type: h.type,
      isHalfDay: Boolean(h.isHalfDay),
      isOfficial,
      description: h.description || h.name,
    });
  }

  // 2. Dynamic (religious) holidays for the given year
  for (const h of dynamicHolidays) {
    if (h.date.startsWith(yearPrefix)) {
      const [yStr, mStr, dStr] = h.date.split('-');
      const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
      const isOfficial = h.isOfficial ?? true;
      items.push({
        id: `dynamic-${h.date}-${h.shortName}`,
        dateStr: h.date,
        date: dateObj,
        name: h.name,
        shortName: h.shortName,
        type: h.type,
        isHalfDay: Boolean(h.isHalfDay),
        isOfficial,
        description:
          h.description ||
          (h.isHalfDay
            ? 'Arife Günü • Yarım Gün Tatil (13:00 Sonrası)'
            : `${h.name} • Resmi Tatil`),
      });
    }
  }

  items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  return items;
}

/**
 * Returns all related dates (as YYYY-MM-DD strings) for a clicked holiday item.
 * - For school holidays (ranges), returns every day in the interval.
 * - For multi-day religious festivals (Ramazan, Kurban), returns all days including Arife.
 * - For multi-day national holidays (29 Ekim), returns both 28 Oct (Arife) and 29 Oct.
 * - For single-day holidays, returns just that day.
 */
export function getRelatedHolidayDates(item: YearHolidayItem, year?: number): string[] {
  // 1. School holiday or custom range
  if (item.isRange && item.endDateStr) {
    const dates: string[] = [];
    const [sy, sm, sd] = item.dateStr.split('-').map(Number);
    const [ey, em, ed] = item.endDateStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(formatToFullDateFast(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }

  // 2. Multi-day religious or national bayrams
  const targetYear = year || item.date?.getFullYear() || Number(item.dateStr.split('-')[0]) || 2026;
  const allYearHolidays = getHolidaysForYear(targetYear);
  const lowerName = (item.name || '').toLowerCase();

  if (lowerName.includes('ramazan bayramı') || lowerName.includes('ramazan arifesi')) {
    return allYearHolidays
      .filter((h) => {
        const n = h.name.toLowerCase();
        return n.includes('ramazan bayramı') || n.includes('ramazan arifesi');
      })
      .map((h) => h.dateStr)
      .sort();
  }

  if (lowerName.includes('kurban bayramı') || lowerName.includes('kurban arifesi')) {
    return allYearHolidays
      .filter((h) => {
        const n = h.name.toLowerCase();
        return n.includes('kurban bayramı') || n.includes('kurban arifesi');
      })
      .map((h) => h.dateStr)
      .sort();
  }

  if (lowerName.includes('cumhuriyet bayramı') || item.dateStr.endsWith('10-28') || item.dateStr.endsWith('10-29')) {
    return allYearHolidays
      .filter((h) => h.dateStr.endsWith('10-28') || h.dateStr.endsWith('10-29'))
      .map((h) => h.dateStr)
      .sort();
  }

  // 3. Single day holiday
  return [item.dateStr];
}


