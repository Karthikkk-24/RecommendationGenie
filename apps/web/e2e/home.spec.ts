import { expect, test } from '@playwright/test';

test('homepage communicates the product', async ({ page }) => {
  await page.setContent(
    '<h1>Your next obsession is waiting.</h1><p>Recommendation Genie learns what you love</p>',
  );
  await expect(page.getByText('Your next obsession is waiting.')).toBeVisible();
});
