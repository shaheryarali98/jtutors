const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  'u s a': 'US',
  canada: 'CA',
  mexico: 'MX',
  brazil: 'BR',
  argentina: 'AR',
  chile: 'CL',
  colombia: 'CO',
  peru: 'PE',
  uruguay: 'UY',
  paraguay: 'PY',
  bolivia: 'BO',
  ecuador: 'EC',
  panama: 'PA',
  'costa rica': 'CR',
  'dominican republic': 'DO',
  jamaica: 'JM',

  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  britain: 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  ireland: 'IE',
  france: 'FR',
  germany: 'DE',
  italy: 'IT',
  spain: 'ES',
  portugal: 'PT',
  netherlands: 'NL',
  belgium: 'BE',
  switzerland: 'CH',
  austria: 'AT',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  finland: 'FI',
  poland: 'PL',
  czechia: 'CZ',
  'czech republic': 'CZ',
  slovakia: 'SK',
  hungary: 'HU',
  romania: 'RO',
  bulgaria: 'BG',
  greece: 'GR',
  croatia: 'HR',
  slovenia: 'SI',
  estonia: 'EE',
  latvia: 'LV',
  lithuania: 'LT',
  luxembourg: 'LU',
  iceland: 'IS',
  malta: 'MT',
  cyprus: 'CY',
  ukraine: 'UA',
  serbia: 'RS',
  bosnia: 'BA',
  montenegro: 'ME',
  albania: 'AL',
  moldova: 'MD',
  georgia: 'GE',

  israel: 'IL',
  turkey: 'TR',
  egypt: 'EG',
  morocco: 'MA',
  tunisia: 'TN',
  algeria: 'DZ',
  nigeria: 'NG',
  ghana: 'GH',
  kenya: 'KE',
  uganda: 'UG',
  tanzania: 'TZ',
  ethiopia: 'ET',
  'south africa': 'ZA',
  namibia: 'NA',
  botswana: 'BW',
  zimbabwe: 'ZW',

  india: 'IN',
  pakistan: 'PK',
  bangladesh: 'BD',
  'sri lanka': 'LK',
  nepal: 'NP',
  singapore: 'SG',
  malaysia: 'MY',
  indonesia: 'ID',
  philippines: 'PH',
  thailand: 'TH',
  vietnam: 'VN',
  cambodia: 'KH',
  laos: 'LA',
  myanmar: 'MM',
  china: 'CN',
  hongkong: 'HK',
  'hong kong': 'HK',
  macao: 'MO',
  macau: 'MO',
  taiwan: 'TW',
  japan: 'JP',
  'south korea': 'KR',
  korea: 'KR',
  'north korea': 'KP',

  australia: 'AU',
  'new zealand': 'NZ',
  fiji: 'FJ',

  'united arab emirates': 'AE',
  uae: 'AE',
  qatar: 'QA',
  bahrain: 'BH',
  kuwait: 'KW',
  oman: 'OM',
  jordan: 'JO',
  lebanon: 'LB',
  'saudi arabia': 'SA',
};

export const normalizeCountryName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const toStripeCountryCode = (country?: string | null): string | undefined => {
  if (!country) return undefined;

  const normalized = country.trim();
  if (!normalized) return undefined;

  if (/^[A-Za-z]{2}$/.test(normalized)) {
    return normalized.toUpperCase();
  }

  const lowered = normalizeCountryName(normalized);
  return COUNTRY_NAME_TO_CODE[lowered];
};
