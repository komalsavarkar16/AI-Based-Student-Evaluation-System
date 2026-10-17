import {test, expect} from '@playwright/test';

test('Login page should have correct title', async ({page}) => {
  await page.goto('/login');
  await expect(page).toHaveTitle("SkillBridge AI");
});

test('Login with valid credentials should redirect to dashboard', async ({page}) =>{
    await page.goto('/login');
    await page.getByRole('button', { 'name': 'Admin'}).click()
    await page.getByRole('textbox', { 'name': 'Email Address'}).fill('admin@test.com');
    await page.getByRole('textbox', { 'name': 'Password'}).fill('test123');
    await page.getByRole('button', { 'name': 'Sign In'}).click();
    await expect(page).toHaveURL(/\/admin/);
})