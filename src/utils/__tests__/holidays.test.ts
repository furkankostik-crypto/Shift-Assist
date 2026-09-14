import { describe, it, expect } from 'vitest';
import {
  formatToMonthDayFast,
  formatToFullDateFast,
  getHolidayDetail,
  getHolidayForDate,
  isOfficialHoliday,
} from '../holidays';

describe('holidays - Official & Religious Holiday Engine', () => {
  it('should format dates fast and correctly', () => {
    const d = new Date(2026, 3, 23); // 23 Nisan 2026
    expect(formatToMonthDayFast(d)).toBe('04-23');
    expect(formatToFullDateFast(d)).toBe('2026-04-23');
  });

  describe('Fixed Turkish National Holidays', () => {
    it('should identify 1 Ocak as official national holiday', () => {
      const d = new Date(2026, 0, 1);
      const detail = getHolidayDetail(d);
      expect(detail).toBeDefined();
      expect(detail?.name).toBe('Yılbaşı');
      expect(detail?.isOfficial).toBe(true);
      expect(isOfficialHoliday(d)).toBe(true);
    });

    it('should identify 23 Nisan as official national holiday', () => {
      const d = new Date(2026, 3, 23);
      expect(getHolidayForDate(d)).toBe('Ulusal Egemenlik ve Çocuk Bayramı');
      expect(isOfficialHoliday(d)).toBe(true);
    });

    it('should identify 1 Mayıs as official national holiday', () => {
      const d = new Date(2026, 4, 1);
      expect(getHolidayForDate(d)).toBe('Emek ve Dayanışma Günü');
      expect(isOfficialHoliday(d)).toBe(true);
    });

    it('should identify 19 Mayıs as official national holiday', () => {
      const d = new Date(2026, 4, 19);
      expect(isOfficialHoliday(d)).toBe(true);
    });

    it('should identify 15 Temmuz as official national holiday', () => {
      const d = new Date(2026, 6, 15);
      expect(isOfficialHoliday(d)).toBe(true);
    });

    it('should identify 30 Ağustos as official national holiday', () => {
      const d = new Date(2026, 7, 30);
      expect(isOfficialHoliday(d)).toBe(true);
    });

    it('should identify 28 Ekim as Arife (half-day official holiday)', () => {
      const d = new Date(2026, 9, 28);
      const detail = getHolidayDetail(d);
      expect(detail?.isHalfDay).toBe(true);
      expect(detail?.isOfficial).toBe(true);
      expect(isOfficialHoliday(d)).toBe(true);
    });

    it('should identify 29 Ekim as official national holiday', () => {
      const d = new Date(2026, 9, 29);
      expect(getHolidayForDate(d)).toBe('Cumhuriyet Bayramı');
      expect(isOfficialHoliday(d)).toBe(true);
    });

    it('should identify commemorative and special non-official days', () => {
      const ataturk = new Date(2026, 10, 10); // 10 Kasım
      const detail = getHolidayDetail(ataturk);
      expect(detail?.name).toContain('10 Kasım');
      expect(detail?.isOfficial).toBe(false);
      expect(isOfficialHoliday(ataturk)).toBe(false); // Anma günü, resmi tatil değil

      const kadinlarGunu = new Date(2026, 2, 8); // 8 Mart
      expect(isOfficialHoliday(kadinlarGunu)).toBe(false);
    });
  });

  describe('Dynamic Religious Holidays (2025 - 2028)', () => {
    it('should identify 2026 Ramazan Bayramı and Arife correctly', () => {
      // 2026-03-19: Ramazan Bayramı Arifesi (half-day, official)
      const arife = new Date(2026, 2, 19);
      const arifeDetail = getHolidayDetail(arife);
      expect(arifeDetail?.isHalfDay).toBe(true);
      expect(arifeDetail?.isOfficial).toBe(true);

      // 2026-03-20: Ramazan Bayramı 1. Gün
      const bayram1 = new Date(2026, 2, 20);
      expect(getHolidayForDate(bayram1)).toBe('Ramazan Bayramı 1. Gün');
      expect(isOfficialHoliday(bayram1)).toBe(true);
    });

    it('should identify 2026 Kurban Bayramı correctly', () => {
      // 2026-05-26: Kurban Bayramı Arifesi
      const arife = new Date(2026, 4, 26);
      expect(isOfficialHoliday(arife)).toBe(true);

      // 2026-05-27 to 2026-05-30: Kurban Bayramı 1-4. Gün
      for (let day = 27; day <= 30; day++) {
        const bayramDay = new Date(2026, 4, day);
        expect(isOfficialHoliday(bayramDay)).toBe(true);
      }
    });

    it('should return null for regular working days', () => {
      const regularDay = new Date(2026, 1, 10); // 10 Şubat 2026
      expect(getHolidayDetail(regularDay)).toBeNull();
      expect(isOfficialHoliday(regularDay)).toBe(false);
    });
  });
});
