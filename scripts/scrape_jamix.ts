import { chromium, type Locator, type Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

type JamixSchool = {
  id: string;
  name: string;
  customer: string;
  kitchen: string;
  menuType: string;
};

type JamixMenuItem = {
  name: string;
};

type JamixMealOption = {
  name: string;
  menuItems?: JamixMenuItem[];
};

type JamixDay = {
  date: number;
  mealoptions?: JamixMealOption[];
};

type JamixApiResponse = Array<{
  menuTypes?: Array<{
    menuTypeId: number;
    menus?: Array<{ days?: JamixDay[] }>;
  }>;
}>;

type Macros = {
  kcal: number;
  p: number;
  h: number;
  r: number;
};

type CachedMeal = {
  dishes: Array<{ name: string }>;
  macros: Macros;
};

type CachedDay = {
  date: string;
  meals: CachedMeal[];
};

const JAMIX_SCHOOLS: JamixSchool[] = [
  {
    id: 'osao-kaukovainio',
    name: 'OSAO Kaukovainio',
    customer: '93077',
    kitchen: '74',
    menuType: '127',
  },
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function jamixDateToDate(value: number): Date {
  const date = String(value);
  return new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
  );
}

function parseUiDate(value: string): Date | null {
  const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function parseMacros(value: string): Macros {
  const getValue = (label: string) => {
    const match = value.match(new RegExp(`${label}\\s+([0-9,.]+)`, 'i'));
    return match ? Number(match[1].replace(',', '.')) : 0;
  };

  const energy = value.match(/Energia\s+([0-9,.]+)\s*kcal/i);

  return {
    kcal: energy ? Number(energy[1].replace(',', '.')) : 0,
    p: getValue('Proteiini'),
    h: getValue('Hiilihydraatit'),
    r: getValue('Rasva'),
  };
}

async function clickAndWaitForUidl(page: Page, locator: Locator) {
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/UIDL/')),
    locator.click(),
  ]);
}

async function goBack(page: Page) {
  await clickAndWaitForUidl(
    page,
    page.locator('.button-navigation--previous .v-button:not(.v-disabled)'),
  );
}

async function navigateToDate(page: Page, target: Date) {
  for (let attempt = 0; attempt < 31; attempt += 1) {
    const label = page.locator('.label-sub-caption');
    await label.waitFor();

    const current = parseUiDate(await label.innerText());
    if (!current) throw new Error('Jamix date label could not be parsed');

    const difference = target.getTime() - current.getTime();
    if (difference === 0) return;

    const direction = difference > 0 ? 'next' : 'previous';
    const previousLabel = await label.innerText();
    await clickAndWaitForUidl(
      page,
      page.locator(`.button-date-selection--${direction} .v-button`),
    );
    await label.waitFor();
    await page.waitForFunction(
      (oldValue) => document.querySelector('.label-sub-caption')?.textContent !== oldValue,
      previousLabel,
    );
  }

  throw new Error(`Could not navigate to ${formatDate(target)}`);
}

async function openDay(page: Page, school: JamixSchool, target: Date) {
  const url = `https://fi.jamix.cloud/apps/menu/?anro=${school.customer}&k=${school.kitchen}&mt=${school.menuType}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await navigateToDate(page, target);
}

async function scrapeOption(
  page: Page,
  option: JamixMealOption,
  optionIndex: number,
): Promise<CachedMeal[]> {
  const optionButtons = page.locator(
    '.menu-sub-view .v-button-multiline:has(.multiline-button-caption-text)',
  );
  const optionButton = optionButtons.nth(optionIndex);
  await optionButton.waitFor();
  await clickAndWaitForUidl(page, optionButton);

  const nutritionButton = page
    .locator('.v-button-multiline')
    .filter({ hasText: 'Ravintoarvot' })
    .first();
  await nutritionButton.waitFor();
  await clickAndWaitForUidl(page, nutritionButton);

  const meals: CachedMeal[] = [];
  for (const item of option.menuItems ?? []) {
    let itemOpened = false;
    try {
      const itemButton = page
        .locator('.v-button-multiline.v-button-nutrition')
        .filter({ hasText: item.name })
        .first();
      await itemButton.waitFor();
      await clickAndWaitForUidl(page, itemButton);
      itemOpened = true;

      const nutrition = page.locator('.nv-list:visible').last();
      await nutrition.waitFor({ timeout: 5_000 });
      const macros = parseMacros(await nutrition.innerText());
      meals.push({ dishes: [{ name: item.name }], macros });
      console.log(`    ${item.name}: ${macros.kcal} kcal / 100 g`);

      await goBack(page);
      itemOpened = false;
    } catch (error) {
      console.warn(`    Ravintoarvojen haku epäonnistui: ${item.name}`, error);
      if (itemOpened) {
        await goBack(page).catch(() => undefined);
      }
      meals.push({
        dishes: [{ name: item.name }],
        macros: { kcal: 0, p: 0, h: 0, r: 0 },
      });
    }
  }

  await goBack(page);
  await goBack(page);
  return meals;
}

async function scrapeJamix() {
  console.log('Starting Jamix scraper...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'fi-FI',
    timezoneId: 'Europe/Helsinki',
  });
  const page = await context.newPage();
  const allMenus: Record<string, CachedDay[]> = {};

  try {
    for (const school of JAMIX_SCHOOLS) {
      console.log(`Scraping school: ${school.name}`);
      const response = await fetch(
        `https://fi.jamix.cloud/apps/menuservice/rest/haku/menu/${school.customer}/${school.kitchen}?lang=fi`,
      );
      if (!response.ok) {
        throw new Error(`Jamix API returned ${response.status} for ${school.name}`);
      }

      const apiData = (await response.json()) as JamixApiResponse;
      const menuType = apiData[0]?.menuTypes?.find(
        (candidate) => String(candidate.menuTypeId) === school.menuType,
      );
      const days = menuType?.menus?.flatMap((menu) => menu.days ?? []) ?? [];
      const schoolData: CachedDay[] = [];

      for (const day of days) {
        const date = jamixDateToDate(day.date);
        console.log(`  ${formatDate(date)}`);
        await openDay(page, school, date);

        const meals: CachedMeal[] = [];
        for (const [optionIndex, option] of (day.mealoptions ?? []).entries()) {
          try {
            meals.push(...(await scrapeOption(page, option, optionIndex)));
          } catch (error) {
            console.warn(`  Ateriaryhmän haku epäonnistui: ${option.name}`, error);
            await openDay(page, school, date);
          }
        }

        schoolData.push({ date: formatDate(date), meals });
      }

      allMenus[school.id] = schoolData;
    }
  } finally {
    await browser.close();
  }

  const outputPath = path.join(process.cwd(), 'public', 'jamix_menus.json');
  await fs.writeFile(outputPath, `${JSON.stringify(allMenus, null, 2)}\n`, 'utf-8');
  console.log(`Saved Jamix menus to ${outputPath}`);
}

scrapeJamix().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
