import { Page, expect } from '@playwright/test';
import { TEST_CONFIG, TEST_TIMEOUTS } from '../test-config';

/**
 * Helper function to login as a student
 */
export async function loginAsStudent(page: Page) {
  await page.goto('/login');
  await page.click('text=学生入口');
  await page.fill('input[placeholder="身份证号"]', TEST_CONFIG.STUDENT.idCard);
  await page.fill('input[placeholder="密码"]', TEST_CONFIG.STUDENT.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });
}

/**
 * Helper function to login as a teacher
 */
export async function loginAsTeacher(page: Page) {
  await page.goto('/login');
  await page.click('text=教师入口');
  await page.fill('input[placeholder="用户名"]', TEST_CONFIG.TEACHER.username);
  await page.fill('input[placeholder="密码"]', TEST_CONFIG.TEACHER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });
}

/**
 * Helper function to logout
 */
export async function logout(page: Page) {
  const logoutSelectors = [
    'text=退出登录',
    'text=注销',
    'text=登出',
    '.logout-btn'
  ];

  for (const selector of logoutSelectors) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        await page.waitForURL('/login', { timeout: TEST_TIMEOUTS.NAVIGATION });
        return;
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  // Try user menu dropdown
  const userMenuTriggers = ['.ant-dropdown-trigger', '.user-menu', '.ant-avatar'];
  for (const trigger of userMenuTriggers) {
    try {
      const element = page.locator(trigger);
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        await page.waitForTimeout(500);
        const logoutInDropdown = page.locator('text=退出登录, text=注销, text=登出');
        if (await logoutInDropdown.isVisible({ timeout: 2000 })) {
          await logoutInDropdown.click();
          await page.waitForURL('/login', { timeout: TEST_TIMEOUTS.NAVIGATION });
          return;
        }
      }
    } catch (e) {
      // Continue
    }
  }

  throw new Error('无法找到退出登录功能');
}

/**
 * Helper function to wait for API response
 */
export async function waitForApiResponse(page: Page, url: string, timeout = TEST_TIMEOUTS.API_RESPONSE) {
  return page.waitForResponse(
    response => response.url().includes(url) && response.status() === 200,
    { timeout }
  );
}

/**
 * Helper function to check if an element exists without failing
 */
export async function elementExists(page: Page, selector: string, timeout = 2000): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ timeout });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Helper function to fill Ant Design form fields
 */
export async function fillAntdForm(page: Page, formData: Record<string, string>) {
  for (const [fieldName, value] of Object.entries(formData)) {
    // Try multiple selector patterns for Ant Design forms
    const selectors = [
      `[data-testid="${fieldName}"]`,
      `input[placeholder*="${fieldName}"]`,
      `input[name="${fieldName}"]`,
      `#${fieldName}`,
      `.ant-form-item:has-text("${fieldName}") input`,
    ];

    let filled = false;
    for (const selector of selectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 1000 })) {
          await element.fill(value);
          filled = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!filled) {
      console.warn(`Could not find form field: ${fieldName}`);
    }
  }
}

/**
 * Helper function to click Ant Design buttons
 */
export async function clickAntdButton(page: Page, buttonText: string) {
  const selectors = [
    `button:has-text("${buttonText}")`,
    `.ant-btn:has-text("${buttonText}")`,
    `[data-testid="${buttonText}"]`,
    `[aria-label="${buttonText}"]`
  ];

  for (const selector of selectors) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        return;
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  throw new Error(`Could not find button: ${buttonText}`);
}

/**
 * Helper function to wait for Ant Design table to load
 */
export async function waitForAntdTable(page: Page, timeout = TEST_TIMEOUTS.ELEMENT_WAIT) {
  await page.locator('.ant-table-tbody, .ant-table-placeholder').waitFor({ timeout });
}

/**
 * Helper function to take a screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `screenshots/${name}-${timestamp}.png` });
}

/**
 * Helper function to check for console errors
 */
export async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  return errors;
}

/**
 * Helper function to verify page accessibility basics
 */
export async function checkBasicAccessibility(page: Page) {
  // Check for page title
  const title = await page.title();
  expect(title).toBeTruthy();
  expect(title.length).toBeGreaterThan(0);

  // Check for main landmark
  const main = page.locator('main, [role="main"], .main-content');
  if (await main.count() > 0) {
    await expect(main.first()).toBeVisible();
  }

  // Check that all images have alt text
  const images = page.locator('img');
  const imageCount = await images.count();

  for (let i = 0; i < imageCount; i++) {
    const img = images.nth(i);
    const alt = await img.getAttribute('alt');
    expect(alt).toBeTruthy();
  }
}

/**
 * Helper function to generate test data
 */
export const generateTestData = {
  studentId: () => `520102${Date.now().toString().slice(-12)}`,
  email: () => `test${Date.now()}@example.com`,
  phone: () => `138${Date.now().toString().slice(-8)}`,
  certificateNumber: () => `GY-2025-${Math.random().toString(36).toUpperCase().slice(2, 10)}`,
  examTitle: () => `测试考试-${Date.now()}`,
  questionTitle: () => `测试题目-${Date.now()}`
};

/**
 * Helper function to simulate slow network
 */
export async function simulateSlowNetwork(page: Page, delay = 1000) {
  await page.route('**/*', route => {
    setTimeout(() => route.continue(), delay);
  });
}

/**
 * Helper function to clear all routes
 */
export async function clearRoutes(page: Page) {
  await page.unroute('**/*');
}