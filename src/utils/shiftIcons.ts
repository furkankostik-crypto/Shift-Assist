import {
  Sun,
  Sunrise,
  Sunset,
  Moon,
  MoonStar,
  Clock,
  Timer,
  Sparkles,
  Briefcase,
  HardHat,
  Stethoscope,
  HeartPulse,
  Shield,
  Wrench,
  Truck,
  Car,
  Factory,
  Store,
  Headphones,
  Laptop,
  Building2,
  Flame,
  Zap,
  Coffee,
  Palmtree,
  Home,
  Bed,
  Armchair,
  Smile,
  BatteryCharging,
  Umbrella,
  Bike,
  Gamepad2,
  CalendarCheck,
  CalendarHeart,
  Plane,
  PartyPopper,
  Flag,
  Gift,
  Tent,
  Luggage,
  type LucideIcon,
} from 'lucide-react';

export type ShiftIconCategory = 'all' | 'time' | 'work' | 'rest' | 'holiday';

export interface ShiftIconDefinition {
  id: string;
  name: string;
  nameEn: string;
  icon: LucideIcon;
  category: 'time' | 'work' | 'rest' | 'holiday';
  tags: string[];
}

export const SHIFT_ICONS: ShiftIconDefinition[] = [
  // Zaman & Vakit (Time)
  { id: 'Sun', name: 'Sabah / Gündüz', nameEn: 'Morning / Day', icon: Sun, category: 'time', tags: ['sabah', 'gündüz', 'morning', 'day', 'güneş'] },
  { id: 'Sunrise', name: 'Şafak / Erken', nameEn: 'Sunrise / Early', icon: Sunrise, category: 'time', tags: ['şafak', 'erken', 'gündoğumu', 'sunrise', 'early'] },
  { id: 'Sunset', name: 'Akşam / Öğle', nameEn: 'Evening / Sunset', icon: Sunset, category: 'time', tags: ['akşam', 'öğle', 'sunset', 'evening', 'ikindi'] },
  { id: 'Moon', name: 'Gece', nameEn: 'Night', icon: Moon, category: 'time', tags: ['gece', 'night', 'ay', 'gececi'] },
  { id: 'MoonStar', name: 'Gece Nöbeti', nameEn: 'Night Shift', icon: MoonStar, category: 'time', tags: ['gece', 'nöbet', 'yıldız', 'moonstar'] },
  { id: 'Clock', name: 'Saat / Nöbet', nameEn: 'Clock / Shift', icon: Clock, category: 'time', tags: ['saat', 'nöbet', '12', '24', 'clock', 'vardiya'] },
  { id: 'Timer', name: 'Sayaç / Süre', nameEn: 'Timer / Duration', icon: Timer, category: 'time', tags: ['sayaç', 'timer', 'süre', 'kronometre'] },
  { id: 'Sparkles', name: 'Özel Zaman', nameEn: 'Special Shift', icon: Sparkles, category: 'time', tags: ['özel', 'parıltı', 'esnek', 'sparkles'] },

  // Çalışma & Meslekler (Work)
  { id: 'Briefcase', name: 'Ofis / Genel Çalışma', nameEn: 'Office / General Work', icon: Briefcase, category: 'work', tags: ['çalışma', 'ofis', 'iş', 'çanta', 'briefcase'] },
  { id: 'HardHat', name: 'Saha / Fabrika / Şantiye', nameEn: 'Field / Factory / Site', icon: HardHat, category: 'work', tags: ['fabrika', 'şantiye', 'baret', 'üretim', 'saha', 'inşaat'] },
  { id: 'Stethoscope', name: 'Doktor / Sağlık', nameEn: 'Doctor / Healthcare', icon: Stethoscope, category: 'work', tags: ['sağlık', 'doktor', 'hastane', 'tıp', 'steteskop'] },
  { id: 'HeartPulse', name: 'Hemşire / Medikal', nameEn: 'Nurse / Medical', icon: HeartPulse, category: 'work', tags: ['hemşire', 'medikal', 'nabız', 'sağlık', 'acil'] },
  { id: 'Shield', name: 'Güvenlik / Koruma', nameEn: 'Security / Shield', icon: Shield, category: 'work', tags: ['güvenlik', 'bekçi', 'koruma', 'kalkan', 'police', 'asayiş'] },
  { id: 'Wrench', name: 'Teknik / Bakım', nameEn: 'Technical / Maintenance', icon: Wrench, category: 'work', tags: ['teknik', 'bakım', 'onarım', 'servis', 'anahtar'] },
  { id: 'Truck', name: 'Lojistik / Sevkiyat', nameEn: 'Logistics / Transport', icon: Truck, category: 'work', tags: ['lojistik', 'kargo', 'sevkiyat', 'kamyon', 'nakliye'] },
  { id: 'Car', name: 'Sürücü / Transfer', nameEn: 'Driver / Transfer', icon: Car, category: 'work', tags: ['sürücü', 'şoför', 'transfer', 'araba', 'ulaşım'] },
  { id: 'Factory', name: 'Sanayi / Tesis', nameEn: 'Industry / Plant', icon: Factory, category: 'work', tags: ['fabrika', 'sanayi', 'üretim', 'tesis', 'santral'] },
  { id: 'Store', name: 'Mağaza / Satış', nameEn: 'Store / Retail', icon: Store, category: 'work', tags: ['mağaza', 'market', 'kasiyer', 'satış', 'avm'] },
  { id: 'Headphones', name: 'Çağrı Merkezi / Destek', nameEn: 'Call Center / Support', icon: Headphones, category: 'work', tags: ['çağrı', 'destek', 'müşteri', 'kulaklık', 'callcenter'] },
  { id: 'Laptop', name: 'Masaüstü / Uzaktan', nameEn: 'Desk / Remote Work', icon: Laptop, category: 'work', tags: ['laptop', 'uzaktan', 'yazılım', 'bilgisayar', 'homeoffice'] },
  { id: 'Building2', name: 'Kurumsal / Şirket', nameEn: 'Corporate / Company', icon: Building2, category: 'work', tags: ['bina', 'şirket', 'kurumsal', 'holding'] },
  { id: 'Flame', name: 'İtfaiye / Acil', nameEn: 'Firefighter / Emergency', icon: Flame, category: 'work', tags: ['itfaiye', 'acil', 'yangın', 'alev', 'yoğun'] },
  { id: 'Zap', name: 'Enerji / Hızlı Ekip', nameEn: 'Energy / Rapid Team', icon: Zap, category: 'work', tags: ['enerji', 'elektrik', 'hızlı', 'şimşek', 'ekip'] },

  // İstirahat & İzin (Rest)
  { id: 'Coffee', name: 'Kahve / Mola / Off', nameEn: 'Coffee / Break / Off', icon: Coffee, category: 'rest', tags: ['kahve', 'mola', 'off', 'istirahat', 'dinlenme'] },
  { id: 'Palmtree', name: 'Yıllık İzin / Tatil', nameEn: 'Vacation / Holiday', icon: Palmtree, category: 'rest', tags: ['izin', 'tatil', 'palmiye', 'yıllık izin', 'seyahat'] },
  { id: 'Home', name: 'Evde Dinlenme', nameEn: 'Rest at Home', icon: Home, category: 'rest', tags: ['ev', 'evde', 'dinlenme', 'home'] },
  { id: 'Bed', name: 'Uyku / İstirahat', nameEn: 'Sleep / Full Rest', icon: Bed, category: 'rest', tags: ['uyku', 'yatak', 'tam gün', 'bed'] },
  { id: 'Armchair', name: 'Konfor / Dinlenme', nameEn: 'Relax / Armchair', icon: Armchair, category: 'rest', tags: ['koltuk', 'rahatlama', 'dinlenme'] },
  { id: 'Smile', name: 'Serbest Gün', nameEn: 'Free Day', icon: Smile, category: 'rest', tags: ['gülümseme', 'serbest', 'keyif', 'smile'] },
  { id: 'BatteryCharging', name: 'Şarj / Yenilenme', nameEn: 'Recharge / Rest', icon: BatteryCharging, category: 'rest', tags: ['şarj', 'enerji', 'yenilenme', 'batarya'] },
  { id: 'Umbrella', name: 'Tatil / Deniz', nameEn: 'Beach / Holiday', icon: Umbrella, category: 'rest', tags: ['şemsiye', 'deniz', 'yaz', 'tatil'] },
  { id: 'Bike', name: 'Aktivite / Spor', nameEn: 'Activity / Sport', icon: Bike, category: 'rest', tags: ['bisiklet', 'spor', 'aktivite', 'açıkhava'] },
  { id: 'Gamepad2', name: 'Hobi / Eğlence', nameEn: 'Hobby / Gaming', icon: Gamepad2, category: 'rest', tags: ['oyun', 'hobi', 'eğlence', 'game'] },
  { id: 'CalendarCheck', name: 'Planlı İzin', nameEn: 'Scheduled Leave', icon: CalendarCheck, category: 'rest', tags: ['planlı', 'takvim', 'izin', 'onay'] },
  { id: 'Plane', name: 'Seyahat / Uçuş', nameEn: 'Travel / Flight', icon: Plane, category: 'rest', tags: ['seyahat', 'uçak', 'uçuş', 'tatil', 'yolculuk', 'travel'] },
  { id: 'Luggage', name: 'Bavul / Yolculuk', nameEn: 'Luggage / Trip', icon: Luggage, category: 'rest', tags: ['bavul', 'valiz', 'seyahat', 'tatil', 'gezi'] },
  { id: 'Tent', name: 'Kamp / Doğa', nameEn: 'Camping / Nature', icon: Tent, category: 'rest', tags: ['kamp', 'çadır', 'doğa', 'tatil'] },

  // Özel Gün & Resmi Tatil (Holiday / Special)
  { id: 'CalendarHeart', name: 'Resmi Tatil / Bayram', nameEn: 'Holiday / Special Day', icon: CalendarHeart, category: 'holiday', tags: ['resmi', 'tatil', 'bayram', 'özel gün', 'holiday'] },
  { id: 'PartyPopper', name: 'Kutlama / Yılbaşı', nameEn: 'Celebration / Party', icon: PartyPopper, category: 'holiday', tags: ['kutlama', 'parti', 'yılbaşı', 'bayram', 'festival'] },
  { id: 'Flag', name: 'Milli Bayram / Tören', nameEn: 'National Holiday / Flag', icon: Flag, category: 'holiday', tags: ['bayrak', 'milli', 'tören', 'cumhuriyet', 'zafer'] },
  { id: 'Gift', name: 'Hediye / Anma Günü', nameEn: 'Gift / Memorial Day', icon: Gift, category: 'holiday', tags: ['hediye', 'anma', 'özel gün', 'yıldönümü'] },
];

export const SHIFT_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  SHIFT_ICONS.map((item) => [item.id, item.icon])
);

/**
 * Resolves the best matching icon name if no explicit icon is stored.
 * Intelligently maps shift name and shift type to a sensible icon.
 */
export function resolveShiftIconName(
  iconName?: string,
  shiftType?: 'WORK' | 'REST',
  shiftName?: string
): string {
  if (iconName && SHIFT_ICON_MAP[iconName]) {
    return iconName;
  }

  const lower = (shiftName || '').toLowerCase();

  if (shiftType === 'REST') {
    if (lower.includes('tatil') || lower.includes('izin') || lower.includes('vacation')) {
      return 'Palmtree';
    }
    if (lower.includes('rapor') || lower.includes('sick') || lower.includes('hastalık') || lower.includes('doktor')) {
      return 'HeartPulse';
    }
    if (lower.includes('mazeret') || lower.includes('excuse')) {
      return 'CalendarCheck';
    }
    if (lower.includes('ev') || lower.includes('home')) {
      return 'Home';
    }
    if (lower.includes('uyku') || lower.includes('yatak')) {
      return 'Bed';
    }
    return 'Coffee';
  }

  // Work type mapping by name
  if (
    lower.includes('sabah') ||
    lower.includes('gündüz') ||
    lower.includes('morning') ||
    lower.includes('day')
  ) {
    return 'Sun';
  }
  if (
    lower.includes('akşam') ||
    lower.includes('öğle') ||
    lower.includes('afternoon') ||
    lower.includes('evening')
  ) {
    return 'Sunset';
  }
  if (lower.includes('gece') || lower.includes('night')) {
    return 'Moon';
  }
  if (lower.includes('24') || lower.includes('12') || lower.includes('nöbet')) {
    return 'Clock';
  }
  if (lower.includes('sağlık') || lower.includes('doktor')) {
    return 'Stethoscope';
  }
  if (lower.includes('güvenlik') || lower.includes('bekçi')) {
    return 'Shield';
  }
  if (lower.includes('fabrika') || lower.includes('üretim') || lower.includes('baret')) {
    return 'HardHat';
  }

  return 'Briefcase';
}

/**
 * Returns the Lucide icon component based on icon name, or fallback by type and name.
 */
export function getShiftIconComponent(
  iconName?: string,
  shiftType?: 'WORK' | 'REST',
  shiftName?: string
): LucideIcon {
  const resolved = resolveShiftIconName(iconName, shiftType, shiftName);
  return SHIFT_ICON_MAP[resolved] || (shiftType === 'REST' ? Coffee : Briefcase);
}

// Re-export ShiftIcon component and its props for backwards compatibility
export { ShiftIcon, type ShiftIconProps } from '../components/ShiftIcon';
