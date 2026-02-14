export interface CountryDefaults {
  currency: string;
  timezone: string;
  workingDays: string[];
  dateFormat: string;
}

export const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  BD: { currency: 'BDT', timezone: 'Asia/Dhaka', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
  IN: { currency: 'INR', timezone: 'Asia/Kolkata', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], dateFormat: 'DD/MM/YYYY' },
  US: { currency: 'USD', timezone: 'America/New_York', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'MM/DD/YYYY' },
  GB: { currency: 'GBP', timezone: 'Europe/London', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
  AE: { currency: 'AED', timezone: 'Asia/Dubai', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
  SA: { currency: 'SAR', timezone: 'Asia/Riyadh', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
  PK: { currency: 'PKR', timezone: 'Asia/Karachi', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], dateFormat: 'DD/MM/YYYY' },
  MY: { currency: 'MYR', timezone: 'Asia/Kuala_Lumpur', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
  SG: { currency: 'SGD', timezone: 'Asia/Singapore', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
  PH: { currency: 'PHP', timezone: 'Asia/Manila', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'MM/DD/YYYY' },
  NG: { currency: 'NGN', timezone: 'Africa/Lagos', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
  EG: { currency: 'EGP', timezone: 'Africa/Cairo', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
  AU: { currency: 'AUD', timezone: 'Australia/Sydney', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
  CA: { currency: 'CAD', timezone: 'America/Toronto', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'MM/DD/YYYY' },
  DE: { currency: 'EUR', timezone: 'Europe/Berlin', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD.MM.YYYY' },
  FR: { currency: 'EUR', timezone: 'Europe/Paris', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
  JP: { currency: 'JPY', timezone: 'Asia/Tokyo', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'YYYY/MM/DD' },
  KR: { currency: 'KRW', timezone: 'Asia/Seoul', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'YYYY/MM/DD' },
  BR: { currency: 'BRL', timezone: 'America/Sao_Paulo', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'], dateFormat: 'DD/MM/YYYY' },
  QA: { currency: 'QAR', timezone: 'Asia/Qatar', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
  KW: { currency: 'KWD', timezone: 'Asia/Kuwait', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
  BH: { currency: 'BHD', timezone: 'Asia/Bahrain', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
  OM: { currency: 'OMR', timezone: 'Asia/Muscat', workingDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], dateFormat: 'DD/MM/YYYY' },
};

// Fallback for countries not in the mapping
export const DEFAULT_COUNTRY_DEFAULTS: CountryDefaults = {
  currency: 'USD',
  timezone: 'UTC',
  workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'],
  dateFormat: 'DD/MM/YYYY'
};

export const getCountryDefaults = (code: string): CountryDefaults => {
  return COUNTRY_DEFAULTS[code] || DEFAULT_COUNTRY_DEFAULTS;
};
