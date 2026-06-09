import { stripe } from './stripe.service';
import { normalizeCountryName, toStripeCountryCode } from '../utils/country';

export interface StripeCountryOption {
  code: string;
  name: string;
}

const COUNTRY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let countriesCache: {
  expiresAt: number;
  countries: StripeCountryOption[];
} | null = null;

const uniqueAndSorted = (countries: StripeCountryOption[]): StripeCountryOption[] => {
  const byCode = new Map<string, StripeCountryOption>();
  for (const country of countries) {
    const code = country.code.toUpperCase();
    if (!code || code.length !== 2) continue;
    if (!byCode.has(code)) {
      byCode.set(code, { code, name: country.name || code });
    }
  }

  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const listStripeSupportedCountries = async (): Promise<StripeCountryOption[]> => {
  const now = Date.now();
  if (countriesCache && countriesCache.expiresAt > now) {
    return countriesCache.countries;
  }

  if (!stripe) {
    return [];
  }

  const collected: StripeCountryOption[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const page = await stripe.countrySpecs.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const spec of page.data) {
      collected.push({
        code: spec.id.toUpperCase(),
        name: (spec as any).name || spec.id.toUpperCase(),
      });
    }

    hasMore = page.has_more;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  const countries = uniqueAndSorted(collected);
  countriesCache = {
    countries,
    expiresAt: now + COUNTRY_CACHE_TTL_MS,
  };

  return countries;
};

export const resolveStripeCountryCode = async (
  country?: string | null
): Promise<string | undefined> => {
  if (!country || !country.trim()) {
    return undefined;
  }

  const raw = country.trim();
  const fromAliasMap = toStripeCountryCode(raw);
  const supportedCountries = await listStripeSupportedCountries();

  // If Stripe countries are unavailable (API key missing/outage), fall back to best-effort mapping.
  if (supportedCountries.length === 0) {
    return fromAliasMap;
  }

  const normalizedInput = normalizeCountryName(raw);
  const byName = supportedCountries.find(
    (entry) => normalizeCountryName(entry.name) === normalizedInput
  );

  const resolvedCode = byName?.code ?? fromAliasMap;
  if (!resolvedCode) {
    return undefined;
  }

  const isSupported = supportedCountries.some((entry) => entry.code === resolvedCode);
  return isSupported ? resolvedCode : undefined;
};
