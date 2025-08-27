import type { EventForm } from '../types';

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function addMonths(date: string, months: number): string {
  const d = new Date(date);
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + months);
  // 원본 날짜의 일자와 결과 날짜의 일자가 다르면
  // (즉, 해당 월에 그 날짜가 없어서 자동으로 다음달로 넘어간 경우)
  // 해당 월의 첫날로 설정하여 isValidDate에서 false가 반환되도록 함
  if (d.getDate() !== originalDay) {
    d.setDate(originalDay);
  }
  return d.toISOString().split('T')[0];
}

function addYears(date: string, years: number): string {
  const originalDate = new Date(date);
  const targetYear = originalDate.getFullYear() + years;
  // 새로운 날짜 객체를 만들어서 연도만 변경
  const d = new Date(date);
  d.setFullYear(targetYear);
  // 결과 날짜가 원본과 다른 월이나 일자를 가지면
  // (예: 2024-02-29 -> 2025-03-01)
  // 원본 날짜를 유지한 채로 연도만 변경
  if (d.getMonth() !== originalDate.getMonth() || d.getDate() !== originalDate.getDate()) {
    return `${targetYear}-${String(originalDate.getMonth() + 1).padStart(2, '0')}-${String(
      originalDate.getDate()
    ).padStart(2, '0')}`;
  }
  return d.toISOString().split('T')[0];
}

function isValidDate(date: string): boolean {
  const d = new Date(date);
  return d.toISOString().split('T')[0] === date;
}

export function expandRepeats(form: EventForm): EventForm[] {
  const events: EventForm[] = [];
  const { repeat } = form;
  // 상한일 설정 (2025-10-30)
  const maxEndDate = '2025-10-30';
  const endDate = repeat.endDate || maxEndDate;
  const effectiveEndDate = new Date(endDate) > new Date(maxEndDate) ? maxEndDate : endDate;

  let currentDate = form.date;
  while (currentDate <= effectiveEndDate) {
    // 날짜가 유효한지 확인 (월말일, 윤년 처리)
    if (isValidDate(currentDate)) {
      events.push({
        ...form,
        date: currentDate,
      });
    }

    // 다음 반복 날짜 계산
    switch (repeat.type) {
      case 'daily':
        currentDate = addDays(currentDate, repeat.interval);
        break;
      case 'weekly':
        currentDate = addDays(currentDate, 7 * repeat.interval);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, repeat.interval);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, repeat.interval);
        break;
      default:
        return [form];
    }
  }

  return events;
}
