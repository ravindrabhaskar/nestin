import { useEffect, useState } from 'react';
import { ApiClient, type PublicStats } from './apiClient';
import { INDIAN_CITIES_DATA } from '../data/citiesData';
import type { CityItem } from '../types';

/**
 * Live platform numbers for marketing surfaces. The static seed files carry editorial content
 * (images, landmarks, copy) but every count shown to a visitor comes from the API, so the site
 * never claims inventory it does not have.
 */

type Listener = () => void;

function createStore<T>(initial: T, load: () => Promise<T>) {
  let value = initial;
  let loaded = false;
  let inflight: Promise<void> | null = null;
  const listeners = new Set<Listener>();
  const ensure = () => {
    if (loaded || inflight) return;
    inflight = load()
      .then((next) => {
        value = next;
        loaded = true;
        listeners.forEach((l) => l());
      })
      .catch(() => {
        // Keep the honest fallback; try again on the next mount.
      })
      .finally(() => {
        inflight = null;
      });
  };
  return {
    use(): { value: T; loaded: boolean } {
      const [, force] = useState(0);
      useEffect(() => {
        const l = () => force((n) => n + 1);
        listeners.add(l);
        ensure();
        return () => {
          listeners.delete(l);
        };
      }, []);
      return { value, loaded };
    },
  };
}

const EMPTY_STATS: PublicStats = {
  publishedListings: 0,
  verifiedListings: 0,
  cities: 0,
  bedsListed: 0,
  residentsHoused: 0,
  ownersOnboarded: 0,
  citiesBreakdown: [],
  generatedAt: '',
};

/** Static city content with the seed file's fabricated counts stripped until live numbers arrive. */
export const HONEST_CITIES: CityItem[] = INDIAN_CITIES_DATA.map((c) => ({
  ...c,
  stays: 'Loading…',
  verifiedCount: undefined,
  startingRent: undefined,
  avgRentNum: undefined,
  lowestRent: undefined,
  highestRent: undefined,
  availableBeds: undefined,
  occupancyRate: undefined,
  avgPrice: undefined,
}));

const statsStore = createStore<PublicStats>(EMPTY_STATS, () => ApiClient.public.stats());
const citiesStore = createStore<CityItem[]>(HONEST_CITIES, async () => {
  const live = (await ApiClient.properties.cities()) as CityItem[];
  return live.length ? live : HONEST_CITIES.map((c) => ({ ...c, stays: 'Launching soon' }));
});

export const usePlatformStats = () => statsStore.use();
export const useCities = () => citiesStore.use();

/** "12 stays" / "Launching soon" — never an invented number. */
export function cityStaysLabel(city: CityItem, noun = 'stays'): string {
  const n = (city as CityItem & { liveListings?: number }).liveListings;
  if (n === undefined) return city.stays && city.stays !== 'Loading…' ? city.stays : 'Loading…';
  if (n === 0) return 'Launching soon';
  return `${n.toLocaleString('en-IN')} ${n === 1 ? noun.replace(/s$/, '') : noun}`;
}
