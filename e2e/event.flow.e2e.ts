import { test, expect } from '@playwright/test';

test('사용자가 캘린더 뷰를 전환하고 날짜를 탐색할 수 있다', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // 1. 초기 상태 확인 - 사용자가 월간 뷰를 보고 있음
  await expect(page.locator('[data-testid="month-view"]')).toBeVisible();

  // 현재 날짜가 표시되는지 확인 (사용자가 오늘 날짜를 볼 수 있음)
  const today = new Date();
  const currentDay = today.getDate().toString();
  await expect(page.locator(`text=${currentDay}`)).toBeVisible();

  // 2. 사용자가 주간 뷰로 전환하고 싶어함
  await page.click('[aria-label="뷰 타입 선택"]');
  await page.click('[aria-label="week-option"]');

  // 주간 뷰로 전환되어 현재 주가 표시됨
  await expect(page.locator('[data-testid="week-view"]')).toBeVisible();
  await expect(page.locator(`text=${currentDay}`)).toBeVisible();

  // 3. 사용자가 다음 주로 이동하고 싶어함
  await page.click('[aria-label="Next"]');
  // 다음 주로 이동했는지 확인 (뷰가 변경되었는지만 확인)
  await expect(page.locator('[data-testid="week-view"]')).toBeVisible();

  // 4. 사용자가 이전 주로 돌아가고 싶어함
  await page.click('[aria-label="Previous"]');
  // 다시 현재 주로 돌아왔으므로 현재 날짜가 보임
  await expect(page.locator(`text=${currentDay}`)).toBeVisible();

  // 5. 사용자가 다시 월간 뷰로 돌아가고 싶어함
  await page.click('[aria-label="뷰 타입 선택"]');
  await page.click('[aria-label="month-option"]');

  // 월간 뷰로 돌아와서 전체 월을 볼 수 있음
  await expect(page.locator('[data-testid="month-view"]')).toBeVisible();
  await expect(page.locator(`text=${currentDay}`)).toBeVisible();

  // 6. 사용자가 다음 달로 이동하고 싶어함
  await page.click('[aria-label="Next"]');
  // 다음 달로 이동했는지 확인 (뷰가 변경되었는지만 확인)
  await expect(page.locator('[data-testid="month-view"]')).toBeVisible();

  // 7. 사용자가 이전 달로 돌아가고 싶어함
  await page.click('[aria-label="Previous"]');
  // 다시 현재 달로 돌아왔으므로 현재 날짜가 보임
  await expect(page.locator(`text=${currentDay}`)).toBeVisible();
});

test('뷰 전환 시 현재 날짜가 올바른 주/월로 이동한다', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // 1. 현재 날짜 정보 가져오기
  const today = new Date();
  const currentDay = today.getDate().toString();

  // 2. 월간 뷰에서 현재 날짜가 표시되는지 확인
  await expect(page.locator('[data-testid="month-view"]')).toBeVisible();
  await expect(page.locator(`text=${currentDay}`)).toBeVisible();

  // 3. 주간 뷰로 전환했을 때 현재 날짜가 속한 주로 이동하는지 확인
  await page.click('[aria-label="뷰 타입 선택"]');
  await page.click('[aria-label="week-option"]');

  // 주간 뷰에서 현재 날짜가 표시되는지 확인 (현재 주로 이동했는지 검증)
  await expect(page.locator('[data-testid="week-view"]')).toBeVisible();
  await expect(page.locator(`text=${currentDay}`)).toBeVisible();

  // 4. 다시 월간 뷰로 전환했을 때 현재 날짜가 속한 월로 이동하는지 확인
  await page.click('[aria-label="뷰 타입 선택"]');
  await page.click('[aria-label="month-option"]');

  // 월간 뷰에서 현재 날짜가 표시되는지 확인 (현재 월로 이동했는지 검증)
  await expect(page.locator('[data-testid="month-view"]')).toBeVisible();
  await expect(page.locator(`text=${currentDay}`)).toBeVisible();
});
