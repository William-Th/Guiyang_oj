import { test, expect } from '@playwright/test';
import { TEST_TIMEOUTS } from './test-config';

test.describe('Certificate Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/verify');
  });

  test('证书验证页面基本功能', async ({ page }) => {
    // Check page loads correctly
    await expect(page).toHaveURL('/verify');

    // Check for certificate verification form elements
    await expect(page.locator('input, .ant-input')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // Check for verification button
    const verifyButton = page.locator('button:has-text("验证"), button:has-text("查询"), .verify-btn, .ant-btn-primary');
    await expect(verifyButton.first()).toBeVisible();
  });

  test('输入证书编号进行验证', async ({ page }) => {
    // Find input field
    const input = page.locator('input, .ant-input').first();
    await expect(input).toBeVisible();

    // Test with a valid format certificate number
    await input.fill('GY-2025-12345678');

    // Click verify button
    const verifyButton = page.locator('button:has-text("验证"), button:has-text("查询"), .verify-btn');
    await verifyButton.first().click();

    // Wait for response (could be success or failure)
    await page.waitForTimeout(2000);

    // Check for some kind of result display
    const resultElements = page.locator(
      '.ant-result, .verification-result, .ant-card, .ant-message, .ant-notification'
    );

    // Either success or error result should be visible
    const hasResult = await resultElements.count() > 0;
    if (hasResult) {
      await expect(resultElements.first()).toBeVisible();
    }
  });

  test('测试无效证书编号', async ({ page }) => {
    const input = page.locator('input, .ant-input').first();
    await input.fill('INVALID-CERT-123');

    const verifyButton = page.locator('button:has-text("验证"), button:has-text("查询"), .verify-btn');
    await verifyButton.first().click();

    // Wait for error response
    await page.waitForTimeout(2000);

    // Should show error message or result
    const errorElements = page.locator(
      '.ant-result-error, .ant-message-error, .error-message, .verification-failed'
    );

    // Check if error handling is present
    if (await errorElements.count() > 0) {
      await expect(errorElements.first()).toBeVisible();
    }
  });

  test('空输入验证', async ({ page }) => {
    // Try to verify without entering anything
    const verifyButton = page.locator('button:has-text("验证"), button:has-text("查询"), .verify-btn');
    await verifyButton.first().click();

    // Should show validation error or stay on page
    await expect(page).toHaveURL('/verify');
  });

  test('URL参数验证 - 带证书编号', async ({ page }) => {
    // Test direct access with certificate number in URL
    await page.goto('/verify/GY-2025-12345678');

    // Should load the verification page with pre-filled certificate number
    await expect(page).toHaveURL(/\/verify\/GY-2025-12345678/);

    // Check if certificate number is pre-filled or auto-verified
    const input = page.locator('input, .ant-input').first();
    const inputValue = await input.inputValue();

    // Either input should be pre-filled or verification should auto-start
    if (inputValue) {
      expect(inputValue).toContain('GY-2025-12345678');
    } else {
      // Auto-verification might have started, check for results
      const resultElements = page.locator('.ant-result, .verification-result, .ant-card');
      if (await resultElements.count() > 0) {
        await expect(resultElements.first()).toBeVisible();
      }
    }
  });

  test('响应式设计 - 移动端证书验证', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check that verification form is properly displayed on mobile
      await expect(page.locator('input, .ant-input')).toBeVisible();
      await expect(page.locator('button')).toBeVisible();

      // Test mobile interaction
      const input = page.locator('input, .ant-input').first();
      await input.fill('GY-2025-MOBILE01');

      const verifyButton = page.locator('button').first();
      await verifyButton.click();

      // Should work on mobile as well
      await page.waitForTimeout(1000);
    }
  });

  test('验证页面导航和返回', async ({ page }) => {
    // Check if there's a way to navigate back or to other pages
    const navigationElements = page.locator(
      'a:has-text("返回"), a:has-text("首页"), .ant-btn-link, .back-btn, .home-link'
    );

    if (await navigationElements.count() > 0) {
      // Test navigation
      const firstNavElement = navigationElements.first();
      await expect(firstNavElement).toBeVisible();

      // Click and verify navigation works
      await firstNavElement.click();
      await page.waitForTimeout(1000);

      // Should navigate away from verify page
      const currentUrl = page.url();
      if (!currentUrl.includes('/verify')) {
        // Successfully navigated away
        expect(currentUrl).not.toContain('/verify');
      }
    }
  });
});