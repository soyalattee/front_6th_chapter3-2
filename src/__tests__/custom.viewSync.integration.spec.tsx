import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import { setupMockHandlerCreation } from '../__mocks__/handlersUtils';
import App from '../App';
import { server } from '../setupTests';
import { Event } from '../types';

const theme = createTheme();

// 통합 테스트용 설정 함수
const setup = (element: ReactElement) => {
  const user = userEvent.setup();

  return {
    ...render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>{element}</SnackbarProvider>
      </ThemeProvider>
    ),
    user,
  };
};

// 기본 일정 생성 헬퍼 함수
const saveSchedule = async (
  user: UserEvent,
  form: Omit<Event, 'id' | 'notificationTime' | 'repeat'>
) => {
  const { title, date, startTime, endTime, location, description, category } = form;

  await user.click(screen.getAllByText('일정 추가')[0]);

  await user.type(screen.getByLabelText('제목'), title);
  await user.type(screen.getByLabelText('날짜'), date);
  await user.type(screen.getByLabelText('시작 시간'), startTime);
  await user.type(screen.getByLabelText('종료 시간'), endTime);
  await user.type(screen.getByLabelText('설명'), description);
  await user.type(screen.getByLabelText('위치'), location);
  await user.click(screen.getByLabelText('카테고리'));
  await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: `${category}-option` }));

  await user.click(screen.getByTestId('event-submit-button'));
};

describe('뷰 간 데이터 동기화 통합 테스트', () => {
  beforeEach(() => {
    // 기본 이벤트 목록 설정
    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({ events: [] });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('시나리오 1: 뷰 간 데이터 동기화', () => {
    it('일정을 생성한 후 월간 뷰에서 해당 일정이 표시되는지 확인합니다', async () => {
      setupMockHandlerCreation();
      const { user } = setup(<App />);

      // 1. 일정 생성
      await saveSchedule(user, {
        title: '테스트 일정',
        date: '2025-10-02',
        startTime: '09:00',
        endTime: '10:00',
        description: '테스트 일정 설명',
        location: '테스트 위치',
        category: '업무',
      });

      // 2. 일정 생성 성공 확인
      expect(screen.getByText('일정이 추가되었습니다.')).toBeInTheDocument();

      // 3. 월간 뷰에서 일정 확인
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'month-option' }));

      expect(screen.getByText('테스트 일정 설명')).toBeInTheDocument();
    });

    it('일정을 생성한 후 주간 뷰에서 해당 일정이 표시되는지 확인합니다', async () => {
      setupMockHandlerCreation();
      const { user } = setup(<App />);

      // 1. 일정 생성
      await saveSchedule(user, {
        title: '테스트 일정',
        date: '2025-10-02',
        startTime: '09:00',
        endTime: '10:00',
        description: '테스트 일정 설명',
        location: '테스트 위치',
        category: '업무',
      });

      // 2. 주간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'week-option' }));

      // 3. 주간 뷰에서 일정 확인
      expect(screen.getByTestId('week-view')).toBeInTheDocument();
      const weekView = screen.getByTestId('week-view');
      expect(within(weekView).getByText('테스트 일정')).toBeInTheDocument();
    });

    it('일정을 생성한 후 오른쪽 일정 리스트에서 해당 일정이 표시되는지 확인합니다', async () => {
      setupMockHandlerCreation();
      const { user } = setup(<App />);

      // 1. 일정 생성
      await saveSchedule(user, {
        title: '테스트 일정',
        date: '2025-10-02',
        startTime: '09:00',
        endTime: '10:00',
        description: '테스트 일정 설명',
        location: '테스트 위치',
        category: '업무',
      });

      // 2. 오른쪽 일정 리스트에서 일정 확인
      const eventList = screen.getByTestId('event-list');
      expect(within(eventList).getByText('테스트 일정')).toBeInTheDocument();
    });
  });

  describe('시나리오 2: 날짜 네비게이션', () => {
    it('현재 주에 일정을 생성하고 다음 주로 이동하면 일정이 표시되지 않는다', async () => {
      setupMockHandlerCreation();
      const { user } = setup(<App />);

      // 1. 주간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'week-option' }));

      // 2. 현재 주에 일정 생성
      await saveSchedule(user, {
        title: '현재 주 일정',
        date: '2025-10-02', // 10월 1주차로 수정
        startTime: '09:00',
        endTime: '10:00',
        description: '현재 주 일정 설명',
        location: '테스트 위치',
        category: '업무',
      });

      // 3. 현재 주에서 일정 확인
      expect(screen.getByText('일정이 추가되었습니다.')).toBeInTheDocument();
      const weekView = screen.getByTestId('week-view');
      expect(within(weekView).getByText('현재 주 일정')).toBeInTheDocument();

      // 4. 다음 주로 이동
      await user.click(screen.getByLabelText('Next'));

      // 5. 다음 주에서는 일정이 표시되지 않는지 확인
      expect(screen.queryByText('현재 주 일정')).not.toBeInTheDocument();

      // 6. 이전 주로 돌아가기
      await user.click(screen.getByLabelText('Previous'));

      // 7. 이전 주에서 일정이 다시 표시되는지 확인
      const weekViewAgain = screen.getByTestId('week-view');
      expect(within(weekViewAgain).getByText('현재 주 일정')).toBeInTheDocument();
    });
  });

  describe('시나리오 3: 뷰 전환 시 날짜 유지', () => {
    it('주간 뷰에서 특정 날짜를 확인하고 월간 뷰로 전환해도 동일한 날짜가 표시된다', async () => {
      const { user } = setup(<App />);

      // 1. 주간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'week-option' }));

      // 2. 주간 뷰에서 특정 날짜 확인 (2025-10-02)
      expect(screen.getByTestId('week-view')).toBeInTheDocument();

      // 주간 뷰에서 2025-10-02 날짜가 표시되는지 확인
      const weekView = screen.getByTestId('week-view');
      expect(within(weekView).getByText('2')).toBeInTheDocument();

      // 3. 월간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'month-option' }));

      // 4. 월간 뷰에서도 동일한 날짜가 표시되는지 확인
      expect(screen.getByTestId('month-view')).toBeInTheDocument();
      const monthView = screen.getByTestId('month-view');
      expect(within(monthView).getByText('2')).toBeInTheDocument();

      // 5. 다시 주간 뷰로 돌아가기
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'week-option' }));

      // 6. 주간 뷰에서도 동일한 날짜가 표시되는지 확인
      expect(screen.getByTestId('week-view')).toBeInTheDocument();
      const weekViewAgain = screen.getByTestId('week-view');
      expect(within(weekViewAgain).getByText('2')).toBeInTheDocument();
    });
  });

  describe('시나리오 4: 검색 결과와 뷰 동기화', () => {
    it('일정을 검색한 후 모든 뷰에서 검색 결과가 올바르게 표시된다', async () => {
      setupMockHandlerCreation();
      const { user } = setup(<App />);

      // 1. 여러 일정 생성 (현재 월간 뷰에 맞는 날짜)
      await saveSchedule(user, {
        title: '검색할 일정',
        date: '2025-10-02', // 10월 1주차로 수정
        startTime: '09:00',
        endTime: '10:00',
        description: '검색 테스트용 일정',
        location: '테스트 위치',
        category: '업무',
      });

      await saveSchedule(user, {
        title: '다른 일정',
        date: '2025-10-03', // 10월 1주차로 수정
        startTime: '10:00',
        endTime: '11:00',
        description: '검색되지 않을 일정',
        location: '다른 위치',
        category: '개인',
      });

      // 2. 검색 실행
      const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
      await user.type(searchInput, '검색할 일정');

      // 3. 월간 뷰에서 검색 결과 확인
      expect(screen.getByTestId('month-view')).toBeInTheDocument();
      const monthView = screen.getByTestId('month-view');
      expect(within(monthView).getByText('검색할 일정')).toBeInTheDocument();
      expect(within(monthView).queryByText('다른 일정')).not.toBeInTheDocument();

      // 4. 주간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'week-option' }));

      // 5. 주간 뷰에서 검색 결과 확인
      expect(screen.getByTestId('week-view')).toBeInTheDocument();
      const weekView = screen.getByTestId('week-view');
      expect(within(weekView).getByText('검색할 일정')).toBeInTheDocument();
      expect(within(weekView).queryByText('다른 일정')).not.toBeInTheDocument();

      // 6. 일정 리스트에서 검색 결과 확인
      const eventList = screen.getByTestId('event-list');
      expect(within(eventList).getByText('검색할 일정')).toBeInTheDocument();
      expect(within(eventList).queryByText('다른 일정')).not.toBeInTheDocument();
    }, 10000);
  });
});
