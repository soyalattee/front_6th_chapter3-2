import { test, expect } from '@playwright/test';

test('검색어가 있는 경우 해당 검색어를 필터링 한다.', async ({ page }) => {
  await page.goto('/');

  // 검색용 일정 생성
  await page.getByRole('textbox', { name: '제목' }).fill('검색용');
  await page.getByRole('textbox', { name: '날짜' }).fill('2025-08-26');
  await page.getByRole('textbox', { name: '시작 시간' }).fill('09:00');
  await page.getByRole('textbox', { name: '종료 시간' }).fill('10:00');
  await page.getByRole('textbox', { name: '설명' }).fill('검색하려고 만든 이벤트');
  await page.getByTestId('event-submit-button').click();

  // 해당 일정이 추가되었는지 확인
  await expect(page.getByTestId('event-list').getByText('검색용')).toBeVisible();

  // 검색 후 해당 키워드가 표시되는지 확인
  await page.getByRole('textbox', { name: '일정 검색' }).fill('검색용');
  await expect(page.getByTestId('event-list').getByText('검색용')).toBeVisible();

  // 검색 초기화 후 일정이 다시 표시되는지 확인
  await page.getByRole('textbox', { name: '일정 검색' }).fill('');
  await expect(page.getByTestId('event-list').getByText('검색용')).toBeVisible();

  // 존재하지 않는 검색어 검색
  await page.getByRole('textbox', { name: '일정 검색' }).fill('없는 검색어');
  await expect(page.getByText('검색 결과가 없습니다')).toBeVisible();

  // 검색 초기화 후 원래 일정이 표시되는지 확인
  await page.getByRole('textbox', { name: '일정 검색' }).fill('');
  await expect(page.getByTestId('event-list').getByText('검색용')).toBeVisible();

  //추가된 일정 삭제
  const searchEventCard = page
    .locator('[data-testid="event-list"] .MuiBox-root')
    .filter({ hasText: '검색용' });
  await searchEventCard.getByRole('button', { name: 'Delete event' }).click();

  await expect(page.getByTestId('event-list').getByText('검색용')).not.toBeVisible();
});
