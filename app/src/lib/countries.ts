import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

export interface Country {
  iso2: string;
  name: string;
  dialCode: string;
  flag: string;
}

/** App default country for new phone inputs. */
export const DEFAULT_ISO2 = 'IN';
export const DEFAULT_DIAL_CODE = '+91';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** Turn an ISO-3166 alpha-2 code into its flag emoji via regional indicators. */
function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

/** All dialable countries, sorted by English name. */
export const COUNTRIES: Country[] = getCountries()
  .map((iso2) => ({
    iso2,
    name: regionNames.of(iso2) ?? iso2,
    dialCode: `+${getCountryCallingCode(iso2)}`,
    flag: flagEmoji(iso2),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Quick-access list shown above the full country list. */
export const TOP_PICKS: Country[] = ['IN', 'US', 'GB', 'AE', 'SG']
  .map((iso) => COUNTRIES.find((c) => c.iso2 === iso))
  .filter((c): c is Country => Boolean(c));

const byIso = new Map(COUNTRIES.map((c) => [c.iso2, c]));
export function findCountry(iso2: string): Country | undefined {
  return byIso.get(iso2);
}
