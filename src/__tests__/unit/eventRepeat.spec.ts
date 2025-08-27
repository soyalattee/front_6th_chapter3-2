import { EventForm, RepeatType } from '../../types';
import { expandRepeats } from '../../utils/expandRepeats';

/** 테스트 헬퍼 */
const makeForm = (overrides: Partial<EventForm> = {}): EventForm => ({
  title: '테스트 일정',
  date: '2025-10-01',
  startTime: '14:00',
  endTime: '15:00',
  description: '',
  location: '',
  category: '업무',
  notificationTime: 10,
  repeat: { type: 'daily' as RepeatType, interval: 1, endDate: '2025-10-30' },
  ...overrides,
});

const toKeys = (events: Pick<EventForm, 'date' | 'startTime'>[]) =>
  events.map((e) => `${e.date} ${e.startTime}`);

describe('EventRepeat 유닛 테스트', () => {
  it('매일 반복 이벤트 생성한다.', () => {
    // Given 시작: 2025-10-01 14:00, 반복: 매일, 종료: 2025-10-30
    const form = makeForm({
      date: '2025-10-01',
      startTime: '14:00',
      repeat: { type: 'daily' as RepeatType, interval: 1, endDate: '2025-10-30' },
    });

    // When 반복 인스턴스를 전개
    const events = expandRepeats(form);

    // Then 10/01~10/30까지 매일 14:00에 생성되고, 10/31 이후는 생성되지 않는다.
    expect(events.length).toBe(30);
    expect(toKeys(events)[0]).toBe('2025-10-01 14:00');
    expect(toKeys(events)[events.length - 1]).toBe('2025-10-30 14:00');
    expect(toKeys(events)).not.toContain('2025-10-31 14:00');
  });

  it('매주 반복 이벤트 생성한다.', () => {
    // Given 시작: 2025-10-01(수) 14:00, 반복: 매주, 종료: 2025-10-30
    const form = makeForm({
      date: '2025-10-01',
      startTime: '14:00',
      repeat: { type: 'weekly' as RepeatType, interval: 1, endDate: '2025-10-30' },
    });

    // When 전개
    const events = expandRepeats(form);

    // Then 요일 동일(매주 수)로 10/01, 10/08, 10/15, 10/22, 10/29만 생성된다.
    expect(toKeys(events)).toEqual([
      '2025-10-01 14:00',
      '2025-10-08 14:00',
      '2025-10-15 14:00',
      '2025-10-22 14:00',
      '2025-10-29 14:00',
    ]);
  });

  it('매월 반복 이벤트 생성한다.', () => {
    // Given 시작: 2025-08-15 09:00, 반복: 매월, 종료: 2025-10-15
    const form = makeForm({
      title: '매월 15일',
      date: '2025-08-15',
      startTime: '09:00',
      endTime: '10:00',
      repeat: { type: 'monthly' as RepeatType, interval: 1, endDate: '2025-10-15' },
    });

    // When 전개
    const events = expandRepeats(form);

    // Then 8/15, 9/15, 10/15 만 생성된다.
    expect(toKeys(events)).toEqual(['2025-08-15 09:00', '2025-09-15 09:00', '2025-10-15 09:00']);
  });
  it('매월 반복 이벤트 생성 시 31일로 생성할 경우 31일이 없는날은 생성하지 않는다.', () => {
    // Given 시작: 2025-08-31 09:00, 반복: 매월, 종료: 2025-10-30
    const form = makeForm({
      date: '2025-08-31',
      startTime: '09:00',
      endTime: '10:00',
      repeat: { type: 'monthly' as RepeatType, interval: 1, endDate: '2025-10-30' },
    });

    // When 전개
    const events = expandRepeats(form);

    // Then 8/31, 9월(31일 없음 → 생성 안 함), 10/31(종료일 초과로 제외) → 결과는 8/31 한 건만.
    expect(toKeys(events)).toEqual(['2025-08-31 09:00']);
    // 말일 보정 금지 확인 (금지: 9/30 대체 생성)
    expect(toKeys(events)).not.toContain('2025-09-30 09:00');
  });

  it('매년 반복 이벤트 생성한다', () => {
    // Given 시작: 2024-02-15 10:00, 반복: 매년, 종료: 2025-02-15
    const form = makeForm({
      date: '2024-02-15',
      startTime: '10:00',
      endTime: '11:00',
      repeat: { type: 'yearly' as RepeatType, interval: 1, endDate: '2025-02-15' },
    });

    // When 전개
    const events = expandRepeats(form);

    // Then 2024-02-15, 2025-02-15 만 생성된다.
    expect(toKeys(events)).toEqual(['2024-02-15 10:00', '2025-02-15 10:00']);
  });

  it('매년 반복 이벤트 생성 시 윤년 2/29으로 생성할 경우 29일이 없는날은 생성하지 않는다.', () => {
    // Given 시작: 2024-02-29 10:00 (윤년), 반복: 매년, 종료: 2025-10-30
    const form = makeForm({
      date: '2024-02-29',
      startTime: '10:00',
      endTime: '11:00',
      repeat: { type: 'yearly' as RepeatType, interval: 1, endDate: '2025-10-30' },
    });

    // When 전개
    const events = expandRepeats(form);

    // Then 2024-02-29만 생성되고, 2025-02-29(비윤년)은 생성되지 않는다.
    expect(toKeys(events)).toEqual(['2024-02-29 10:00']);
    expect(toKeys(events)).not.toContain('2025-02-28 10:00'); // 2/28 대체 생성 금지
  });

  it('종료일 경계 처리한다.', () => {
    // Given 시작: 2025-10-30 07:00, 반복: 매일, 종료: 2025-10-30
    const form = makeForm({
      date: '2025-10-30',
      startTime: '07:00',
      endTime: '08:00',
      repeat: { type: 'daily' as RepeatType, interval: 1, endDate: '2025-10-30' },
    });

    // When 전개
    const events = expandRepeats(form);

    // Then 종료일 포함하여 10/30만 생성되고 10/31은 생성 안 된다.
    expect(toKeys(events)).toEqual(['2025-10-30 07:00']);
    expect(toKeys(events)).not.toContain('2025-10-31 07:00');
  });

  it('상한일(최대 2025-10-30) 강제한다.', () => {
    // Given 종료일을 2025-12-31로 요청 (비즈니스 룰: 최대 2025-10-30까지만)
    const form = makeForm({
      date: '2025-10-25',
      startTime: '09:00',
      endTime: '10:00',
      repeat: { type: 'daily' as RepeatType, interval: 1, endDate: '2025-12-31' },
    });

    // When 전개
    const events = expandRepeats(form);

    // Then 최대 상한 2025-10-30까지만 생성된다.
    expect(toKeys(events)).toEqual([
      '2025-10-25 09:00',
      '2025-10-26 09:00',
      '2025-10-27 09:00',
      '2025-10-28 09:00',
      '2025-10-29 09:00',
      '2025-10-30 09:00',
    ]);
    expect(toKeys(events)).not.toContain('2025-10-31 09:00');
  });
});
