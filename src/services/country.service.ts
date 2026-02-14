import { Holiday } from '../types';
import { getCountryDefaults } from '../data/countryDefaults';

// Import holiday data files
import BD_HOLIDAYS from '../data/holidays/BD.json';
import US_HOLIDAYS from '../data/holidays/US.json';
import IN_HOLIDAYS from '../data/holidays/IN.json';
import GB_HOLIDAYS from '../data/holidays/GB.json';
import AE_HOLIDAYS from '../data/holidays/AE.json';
import SA_HOLIDAYS from '../data/holidays/SA.json';

// Map of country codes to holiday data
const HOLIDAY_DATA_MAP: Record<string, any[]> = {
  BD: BD_HOLIDAYS,
  US: US_HOLIDAYS,
  IN: IN_HOLIDAYS,
  GB: GB_HOLIDAYS,
  AE: AE_HOLIDAYS,
  SA: SA_HOLIDAYS,
};

export const countryService = {
  /**
   * Load holidays for a specific country
   * Returns empty array if country has no predefined holidays
   */
  loadCountryHolidays(countryCode: string): Holiday[] {
    const holidayData = HOLIDAY_DATA_MAP[countryCode] || [];
    return holidayData.map(h => ({
      id: h.id,
      date: h.date,
      name: h.name,
      isGovernment: h.isGovernment,
      type: h.type as 'NATIONAL' | 'FESTIVAL' | 'ISLAMIC'
    }));
  },

  /**
   * Get country-specific defaults (currency, timezone, working days, etc.)
   */
  getCountryDefaults(countryCode: string) {
    return getCountryDefaults(countryCode);
  },

  /**
   * Check if country has predefined holiday data
   */
  hasHolidayData(countryCode: string): boolean {
    return countryCode in HOLIDAY_DATA_MAP;
  },

  /**
   * Get list of countries with predefined holiday data
   */
  getCountriesWithHolidayData(): string[] {
    return Object.keys(HOLIDAY_DATA_MAP);
  },

  /**
   * Merge holidays with existing ones, avoiding date conflicts
   * Returns merged holiday list sorted by date
   */
  mergeHolidays(existingHolidays: Holiday[], newHolidays: Holiday[]): Holiday[] {
    const existingDates = new Set(existingHolidays.map(h => h.date));

    const merged = [
      ...existingHolidays,
      ...newHolidays.filter(h => !existingDates.has(h.date))
    ];

    // Sort by date
    merged.sort((a, b) => a.date.localeCompare(b.date));

    return merged;
  }
};
