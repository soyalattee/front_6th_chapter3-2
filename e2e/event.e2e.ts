import { test, expect } from '@playwright/test';

test.describe('E2E: 일정 등록 시나리오', () => {
  test.beforeEach(async ({ page }) => {
    // 로컬 스토리지 초기화
    await page.goto('/');
    // 기본 렌더 확인 (리스트가 보이는지)
    await expect(page.getByTestId('event-list')).toBeVisible();
  });

  test.describe('일정 등록 시나리오', () => {
    test('일정 등록 테스트', async ({ page }) => {
      const currentYear = new Date().getFullYear();
      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const currentDay = new Date().getDate().toString().padStart(2, '0');
      await page.getByRole('textbox', { name: '제목' }).click();
      await page.getByRole('textbox', { name: '제목' }).fill('2팀 회식');
      await page
        .getByRole('textbox', { name: '날짜' })
        .fill(`${currentYear}-${currentMonth}-${currentDay}`);
      await page.getByRole('textbox', { name: '시작 시간' }).click();
      await page.getByRole('textbox', { name: '시작 시간' }).press('ArrowDown');
      await page.getByRole('textbox', { name: '시작 시간' }).press('ArrowRight');
      await page.getByRole('textbox', { name: '시작 시간' }).fill('23:11');
      await page.getByRole('textbox', { name: '종료 시간' }).click();
      await page.getByRole('textbox', { name: '종료 시간' }).press('ArrowDown');
      await page.getByRole('textbox', { name: '종료 시간' }).press('Tab');
      await page.getByRole('textbox', { name: '종료 시간' }).fill('23:20');
      await page.getByRole('combobox', { name: '업무' }).click();
      await page.getByRole('option', { name: '개인-option' }).click();
      await page.getByTestId('event-submit-button').click();

      // 5) 리스트에 제목 노출 확인
      const list = page.getByTestId('event-list');
      await expect(list.getByText('점심 약속')).toBeVisible();
    });
    test('일정 수정 테스트', async ({ page }) => {
      const list = page.getByTestId('event-list');
      // 1) 수정 버튼 클릭
      await page.getByRole('button', { name: 'Edit event' }).last().click();
      await page.getByRole('textbox', { name: '설명' }).click();
      await page.getByRole('textbox', { name: '설명' }).fill('2팀 점심 모임');
      await page.getByTestId('event-submit-button').click();

      // 2) 리스트에 설명 노출 확인
      await expect(list.getByText('2팀 점심 모임')).toBeVisible();
    });
    test('일정 삭제 테스트', async ({ page }) => {
      // 1) 리스트에 제목 노출 확인
      const list = page.getByTestId('event-list');
      await expect(list.getByText('2팀 회식')).toBeVisible();

      // 2) 마지막 이벤트 삭제 버튼 클릭
      await page.getByRole('button', { name: 'Delete event' }).last().click();

      // 7) 리스트에 제목 사라짐 확인
      await expect(list.getByText('2팀 회식')).not.toBeVisible();
    });
  });
});
