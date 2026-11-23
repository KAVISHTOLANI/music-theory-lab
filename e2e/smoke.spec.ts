import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('explore scales, chords, intervals and drill', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('See it, hear it');
  await expect(page.locator('.hero .piano')).toBeVisible();
  await page.waitForTimeout(900);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');

  await page.getByRole('link', { name: 'Explore scales' }).click();
  await page.getByLabel('Root').selectOption('Eb');
  await expect(page.getByTestId('spelling')).toContainText('A♭');
  await page.getByRole('button', { name: 'Play scale ▶' }).click();
  await snap(page, 'scales');
  await checkMobile(page);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Chords' }).click();
  await page.getByLabel('Quality').selectOption('dom7');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('C7');
  await snap(page, 'chords');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Intervals' }).click();
  await page.getByRole('button', { name: /^D4/ }).click();
  await page.getByRole('button', { name: /^A4/ }).click();
  await expect(page.getByTestId('interval')).toContainText('Perfect 5th');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Practice' }).click();
  await page.locator('.option').first().click();
  await expect(page.getByRole('status')).toBeVisible();
  await snap(page, 'practice');
  await checkMobile(page, 'practice-mobile');
  await page.reload();
  await expect(page.getByText(/1 answered/)).toBeVisible();
});
