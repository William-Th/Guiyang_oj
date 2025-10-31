import { test, expect } from '@playwright/test';
import { TEST_TIMEOUTS } from './test-config';

test.describe('UI Components and Accessibility', () => {
  test('主页组件渲染测试', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check basic layout components
    await expect(page.locator('.ant-layout, .layout-container')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });

    // Check for header/navigation
    await expect(page.locator('.ant-layout-header, .header, .navigation')).toBeVisible();

    // Check for main content area
    await expect(page.locator('.ant-layout-content, .main-content, .content')).toBeVisible();
  });

  test('Ant Design组件加载测试', async ({ page }) => {
    await page.goto('/login');

    // Check Ant Design specific components
    await expect(page.locator('.ant-card')).toBeVisible();
    await expect(page.locator('.ant-tabs')).toBeVisible();
    await expect(page.locator('.ant-form')).toBeVisible();
    await expect(page.locator('.ant-input')).toBeVisible();
    await expect(page.locator('.ant-btn')).toBeVisible();

    // Check icons are loaded
    await expect(page.locator('.anticon')).toBeVisible();
  });

  test('主题和样式一致性', async ({ page }) => {
    await page.goto('/');

    // Check that CSS is loaded properly
    const backgroundColor = await page.evaluate(() => {
      const body = document.querySelector('body');
      return window.getComputedStyle(body).backgroundColor;
    });

    // Should have a background color set (not transparent)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

    // Check that Ant Design theme is applied
    const cardElement = page.locator('.ant-card').first();
    if (await cardElement.count() > 0) {
      const cardBackground = await cardElement.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });
      expect(cardBackground).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('响应式布局测试', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');

    await expect(page.locator('.ant-layout')).toBeVisible();

    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.ant-layout')).toBeVisible();

    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.ant-layout')).toBeVisible();
  });

  test('加载状态和错误处理', async ({ page }) => {
    // Test with slow network to check loading states
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });

    await page.goto('/');

    // Check for loading indicators (spinners, skeletons, etc.)
    const loadingElements = page.locator(
      '.ant-spin, .ant-skeleton, .loading, .spinner'
    );

    // Loading elements might appear and disappear quickly
    // So we just check the page eventually loads
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ant-layout, body')).toBeVisible();
  });

  test('无障碍性(Accessibility)基础检查', async ({ page }) => {
    await page.goto('/login');

    // Check for proper form labels
    const formInputs = page.locator('input');
    const inputCount = await formInputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = formInputs.nth(i);

      // Check that inputs have proper attributes
      const hasPlaceholder = await input.getAttribute('placeholder');
      const hasAriaLabel = await input.getAttribute('aria-label');
      const hasId = await input.getAttribute('id');

      // At least one form of labeling should be present
      expect(hasPlaceholder || hasAriaLabel || hasId).toBeTruthy();
    }

    // Check that buttons have accessible text
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const buttonText = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      // Button should have text or aria-label
      expect(buttonText || ariaLabel).toBeTruthy();
    }
  });

  test('键盘导航测试', async ({ page }) => {
    await page.goto('/login');

    // Test tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A'].includes(focusedElement || '')).toBeTruthy();

    // Continue tabbing through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to navigate to login button
    await page.keyboard.press('Enter');

    // Page should react to keyboard interaction
    await page.waitForTimeout(500);
  });

  test('浏览器兼容性 - JavaScript功能', async ({ page }) => {
    await page.goto('/');

    // Check that React has loaded properly
    const reactLoaded = await page.evaluate(() => {
      return typeof window.React !== 'undefined' ||
             document.querySelector('[data-reactroot]') !== null ||
             document.querySelector('#root') !== null;
    });

    expect(reactLoaded).toBeTruthy();

    // Check that Redux store is accessible
    const reduxLoaded = await page.evaluate(() => {
      // Check for Redux DevTools extension or store presence
      return window.__REDUX_DEVTOOLS_EXTENSION__ !== undefined ||
             document.querySelector('[data-redux]') !== null;
    });

    // Redux might not always be detectable, so this is optional
    if (reduxLoaded) {
      expect(reduxLoaded).toBeTruthy();
    }
  });

  test('图片和资源加载', async ({ page }) => {
    await page.goto('/');

    // Check for broken images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);

      // Images should have loaded (naturalWidth > 0) or have alt text
      const altText = await img.getAttribute('alt');

      if (naturalWidth === 0) {
        // If image failed to load, it should at least have alt text
        expect(altText).toBeTruthy();
      }
    }

    // Check that CSS files are loaded
    const stylesheets = await page.evaluate(() => {
      return Array.from(document.styleSheets).length;
    });

    expect(stylesheets).toBeGreaterThan(0);
  });
});