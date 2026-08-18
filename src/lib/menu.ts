import jamixMenus from '../../public/jamix_menus.json';
import { SCHOOLS, SchoolConfig } from './schools';

type Macros = {
  kcal: number;
  p: number;
  h: number;
  r: number;
};

type JamixCachedMeal = {
  dishes: Array<{ name: string }>;
  macros: Macros;
};

type JamixCachedDay = {
  date: string;
  meals: JamixCachedMeal[];
};

type JamixApiResponse = Array<{
  menuTypes?: Array<{
    menuTypeId: number;
    menus?: Array<{
      days?: Array<{
        date: number;
        mealoptions?: Array<{
          menuItems?: Array<{ name: string }>;
        }>;
      }>;
    }>;
  }>;
}>;

const JAMIX_MENU_CACHE = jamixMenus as Record<string, JamixCachedDay[]>;
const EMPTY_MACROS: Macros = { kcal: 0, p: 0, h: 0, r: 0 };

const getHelsinkiDate = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;

  return `${y}-${m}-${d}`;
};

const getJamixDate = (date: number) => {
  const value = String(date);
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
};

async function getJamixMenu(school: SchoolConfig, dates: string[]) {
  const url = `https://fi.jamix.cloud/apps/menuservice/rest/haku/menu/${school.customer}/${school.kitchen}?lang=fi`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Jamix API returned ${response.status}`);
  }

  const json = (await response.json()) as JamixApiResponse;
  const menuType = json[0]?.menuTypes?.find(
    (candidate) => String(candidate.menuTypeId) === school.menu,
  );

  if (!menuType) {
    throw new Error(`Jamix menu type ${school.menu} was not found`);
  }

  const cachedDays = JAMIX_MENU_CACHE[school.id] ?? [];
  const daysByDate = new Map<string, JamixCachedMeal[]>();

  for (const day of menuType.menus?.flatMap((menu) => menu.days ?? []) ?? []) {
    const date = getJamixDate(day.date);
    if (!dates.includes(date)) continue;

    const cachedMeals = cachedDays.find((cachedDay) => cachedDay.date === date)?.meals ?? [];
    const mealsByName = new Map<string, JamixCachedMeal>();

    for (const item of day.mealoptions?.flatMap((option) => option.menuItems ?? []) ?? []) {
      if (mealsByName.has(item.name)) continue;

      const cachedMeal = cachedMeals.find((meal) =>
        meal.dishes.some((dish) => dish.name === item.name),
      );
      mealsByName.set(item.name, {
        dishes: [{ name: item.name }],
        macros: cachedMeal?.macros ?? { ...EMPTY_MACROS },
      });
    }

    daysByDate.set(date, [...mealsByName.values()]);
  }

  return [...daysByDate.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, meals]) => ({ date, meals }));
}

export async function getMenuForSchool(schoolId: string) {
  const school = SCHOOLS.find(s => s.id === schoolId);
  if (!school) {
    throw new Error('School not found');
  }

  const now = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    return getHelsinkiDate(d);
  });

  let data;
  if (school.provider === 'aromi') {
    const url = `https://script.google.com/macros/s/AKfycbyOMMz61-S8AKAZlSwK1C2gxP0WP1BDdoWkbzUWHVfhyOBXy1dyulaZfsHeWSyJBR77/exec?restaurantId=${school.id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Aromi API returned ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error('Aromi API returned invalid data');
    data = json.data.filter((day: { date: string }) => dates.includes(day.date));
  } else if (school.provider === 'jamix') {
    data = await getJamixMenu(school, dates);
  } else {
    const datesCsv = dates.join(',');
    const url = `https://api.fi.poweresta.com/publicmenu/dates/${school.customer}/${school.kitchen}/?menu=${school.menu}&dates=${datesCsv}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Poweresta API returned ${res.status}`);
    data = await res.json();
  }
  return data;
}
