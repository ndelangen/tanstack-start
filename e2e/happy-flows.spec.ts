import { expect, test } from '@playwright/test';

test('owner can create and delete a ruleset in a two-user flow', async ({
  page,
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'userA',
    'This scenario orchestrates both users from the userA project.'
  );

  const uniqueSuffix = Date.now();
  const uniqueName = `E2ERuleset${uniqueSuffix}`;
  const expectedSlug = uniqueName.toLowerCase();
  await page.goto('/rulesets/create');
  await page.getByRole('textbox', { name: 'Name' }).fill(uniqueName);
  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page).toHaveURL(new RegExp(`/rulesets/${expectedSlug}$`));

  const createdUrl = page.url();
  await expect(page.getByLabel('Edit ruleset')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 30_000 });

  const userBContext = await browser.newContext({ storageState: '.playwright/user-b.json' });
  const userBPage = await userBContext.newPage();
  await userBPage.goto(createdUrl);
  await expect(userBPage.getByText(uniqueName).first()).toBeVisible({ timeout: 30_000 });
  await expect(userBPage.getByLabel('Edit ruleset')).toHaveCount(0);
  await userBContext.close();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Delete ruleset').click();
  await expect(page).toHaveURL(/\/rulesets\/?$/);
  await expect(page.getByRole('link', { name: uniqueName })).toHaveCount(0);
});

test('owner can discover a newly created faction through the catalogue', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'userA', 'One signed-in browser covers this happy flow.');

  await page.goto('/factions/create');
  await page.getByRole('textbox', { name: 'Faction name' }).fill('Test Faction');
  await page.getByRole('button', { name: 'Save faction' }).click();
  await expect(page).toHaveURL(/\/factions\/test-faction\/edit$/);

  await page.goto('/factions');
  const testFaction = page.getByRole('link', { name: 'Test Faction', exact: true });
  await expect(testFaction).toBeVisible({ timeout: 30_000 });

  const search = page.getByRole('textbox', { name: 'Search factions' });
  await search.fill('test');
  await expect(testFaction).toBeVisible();

  await search.fill('qwerty');
  await expect(page.getByRole('heading', { name: 'No factions found' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset filters & search' })).toBeVisible();

  await search.fill('');
  await expect(testFaction).toBeVisible();
  await testFaction.click();
  await expect(page).toHaveURL(/\/factions\/test-faction\/?$/);
  await expect(page.getByRole('heading', { name: 'Test Faction' })).toBeVisible();
});
