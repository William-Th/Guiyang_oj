/**
 * Activity Helper Functions
 * Reusable functions for activity operations in E2E tests
 */

import { Page } from '@playwright/test';

/**
 * Add questions to an activity via API
 * @param page - Playwright page object (needs to have valid auth token in localStorage)
 * @param activityId - Activity ID
 * @param questionIds - Array of question bank IDs to add
 * @param defaultScore - Default score for each question (optional)
 * @returns Result of the batch add operation
 */
export async function addQuestionsToActivity(
  page: Page,
  activityId: number,
  questionIds: number[],
  defaultScore: number = 5
): Promise<any> {
  // Call the API endpoint using page.evaluate to run in browser context with auth
  const result = await page.evaluate(
    async ({ activityId, questionIds, defaultScore }) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token found in localStorage');
      }

      const questions = questionIds.map(questionId => ({
        questionId,
        score: defaultScore
      }));

      const response = await fetch(`http://localhost:3001/api/activities/${activityId}/questions/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ questions })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to add questions: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    },
    { activityId, questionIds, defaultScore }
  );

  return result;
}

/**
 * Get published questions for a subject and grade
 * @param page - Playwright page object
 * @param subject - Subject name
 * @param grade - Grade name
 * @param limit - Maximum number of questions to retrieve
 * @returns Array of question IDs
 */
export async function getPublishedQuestions(
  page: Page,
  subject: string,
  grade: string,
  limit: number = 5
): Promise<number[]> {
  const result = await page.evaluate(
    async ({ subject, grade, limit }) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token found in localStorage');
      }

      const response = await fetch(
        `http://localhost:3001/api/question-bank/bank?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}&status=published&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get questions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.map((q: any) => q.id);
    },
    { subject, grade, limit }
  );

  return result;
}

/**
 * Create an activity and add questions to it
 * Helper function that combines activity creation and question addition
 * @param page - Playwright page object (must be logged in as teacher/admin)
 * @param activityData - Activity form data
 * @param questionCount - Number of questions to add (default: 5)
 * @returns Object with activityId and questionIds
 */
export async function createActivityWithQuestions(
  page: Page,
  activityData: {
    title: string;
    description?: string;
    subject: string;
    grade: string;
    type?: 'practice' | 'assessment';
    timeLimitType?: 'unlimited' | 'scheduled' | 'timed';
    totalScore?: number;
    passScore?: number;
    abilityLevel?: string;
  },
  questionCount: number = 5
): Promise<{ activityId: number; questionIds: number[] }> {
  // Navigate to create activity page
  const activityType = activityData.type || 'practice';
  await page.goto(`/teacher/activities/create/${activityType}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Fill activity form
  await page.fill('input[placeholder="请输入活动标题"]', activityData.title);

  if (activityData.description) {
    await page.fill('textarea[placeholder*="描述"]', activityData.description);
  }

  // Select subject
  await page.click('#subject');
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: activityData.subject }).click();
  await page.waitForTimeout(300);

  // Select grade
  await page.click('#grade');
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: activityData.grade }).click();
  await page.waitForTimeout(300);

  // Select ability level if provided
  if (activityData.abilityLevel) {
    await page.click('#abilityLevel');
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: new RegExp(activityData.abilityLevel) }).click();
    await page.waitForTimeout(300);
  }

  // Fill scores
  if (activityData.totalScore) {
    await page.fill('input[id="totalScore"]', activityData.totalScore.toString());
  }
  if (activityData.passScore) {
    await page.fill('input[id="passScore"]', activityData.passScore.toString());
  }

  // Submit
  const submitButton = page.locator('button').filter({ hasText: /创\s*建/ });
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  await submitButton.click();

  // Wait for navigation back to activities list
  await page.waitForURL(/\/activities$/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Extract activity ID from URL or find the newly created activity
  // For now, we'll get the activity ID from the API by finding the most recent activity with matching title
  const activityId = await page.evaluate(
    async ({ title }) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch('http://localhost:3001/api/activities', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get activities');
      }

      const data = await response.json();
      const activity = data.activities.find((a: any) => a.title === title);

      if (!activity) {
        throw new Error(`Activity with title "${title}" not found`);
      }

      return activity.id;
    },
    { title: activityData.title }
  );

  // Get published questions for the activity's subject and grade
  const questionIds = await getPublishedQuestions(page, activityData.subject, activityData.grade, questionCount);

  if (questionIds.length === 0) {
    throw new Error(`No published questions found for ${activityData.subject} ${activityData.grade}`);
  }

  // Add questions to the activity
  const result = await addQuestionsToActivity(page, activityId, questionIds);

  console.log(`✓ Created activity ${activityId} with ${questionIds.length} questions`);

  return {
    activityId,
    questionIds
  };
}
