export type HolidayType = 'national' | 'religious' | 'eve' | 'commemoration' | 'special';

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
export function getHolidayBadgeColors(_type?: HolidayType): HolidayBadgeColors {
  return UNIFIED_HOLIDAY_BADGE_COLORS;
}
