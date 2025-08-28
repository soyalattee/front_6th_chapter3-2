import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { act, render, screen, within } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';
import { vi } from 'vitest';

import { setupMockHandlerCreation } from '../__mocks__/handlersUtils';
import App from '../App';
import { Event } from '../types';

const theme = createTheme();

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

const saveScheduleWithNotification = async (
  user: UserEvent,
  form: Omit<Event, 'id' | 'notificationTime' | 'repeat'> & { notificationTime?: number }
) => {
  const {
    title,
    date,
    startTime,
    endTime,
    location,
    description,
    category,
    notificationTime = 10,
  } = form;

  await user.type(screen.getByLabelText('제목'), title);
  await user.type(screen.getByLabelText('날짜'), date);
  await user.type(screen.getByLabelText('시작 시간'), startTime);
  await user.type(screen.getByLabelText('종료 시간'), endTime);
  await user.type(screen.getByLabelText('설명'), description);
  await user.type(screen.getByLabelText('위치'), location);
  await user.click(screen.getByLabelText('카테고리'));
  await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: `${category}-option` }));

  // 알림 시간 설정
  await user.click(within(screen.getByLabelText('알림 설정')).getByRole('combobox'));

  const timeSelect = {
    1: '1분 전',
    10: '10분 전',
    60: '1시간 전',
    120: '2시간 전',
    1440: '1일 전',
  };

  const notificationOption = screen.getByRole('option', {
    name: `${timeSelect[notificationTime as keyof typeof timeSelect]}`,
  });
  await user.click(notificationOption);

  await user.click(screen.getByTestId('event-submit-button'));
};

describe('알림 시스템 통합 테스트', () => {
  describe('시나리오 1: 기본 알림 워크플로우', () => {
    it('사용자가 일정을 생성할 때 알림 시간을 10분 전으로 설정하고 알림이 정확한 메시지와 함께 표시되는지 확인', async () => {
      vi.setSystemTime(new Date('2025-10-15 08:50:00'));
      setupMockHandlerCreation();

      const { user } = setup(<App />);

      await saveScheduleWithNotification(user, {
        title: '오전 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '팀 미팅',
        location: '회의실 A',
        category: '업무',
        notificationTime: 10,
      });

      // 일정 생성 후 10분 전으로 시간 진행 (08:50)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 알림 메시지 확인
      const alertMessage = await screen.findByText('10분 후 오전 회의 일정이 시작됩니다.');
      expect(alertMessage).toBeInTheDocument();
    });

    it('사용자가 알림을 닫으면 알림이 사라지는지 확인', async () => {
      vi.setSystemTime(new Date('2025-10-15 08:50:00'));
      setupMockHandlerCreation();

      const { user } = setup(<App />);

      await saveScheduleWithNotification(user, {
        title: '오전 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '팀 미팅',
        location: '회의실 A',
        category: '업무',
        notificationTime: 10,
      });

      // 10분 전으로 시간 진행
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 알림 메시지 확인
      const alertMessage = await screen.findByText('10분 후 오전 회의 일정이 시작됩니다.');
      expect(alertMessage).toBeInTheDocument();

      // 알림 닫기 버튼 클릭
      const closeButton = screen.getByTestId('CloseIcon');
      await user.click(closeButton);

      // 알림이 사라졌는지 확인
      expect(alertMessage).not.toBeInTheDocument();
    });
  });

  describe('시나리오 2: 여러 알림 동시 처리', () => {
    it('여러 개의 일정을 각각 다른 알림 시간으로 생성하고 여러 알림이 동시에 표시되는지 확인', async () => {
      vi.setSystemTime(new Date('2025-10-15 08:50:00'));
      setupMockHandlerCreation();

      const { user } = setup(<App />);

      // 첫 번째 일정: 10분 전 알림 (09:00 시작, 08:50에 알림)
      await saveScheduleWithNotification(user, {
        title: '오전 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '팀 미팅',
        location: '회의실 A',
        category: '업무',
        notificationTime: 10,
      });

      // 두 번째 일정: 60분 전 알림 (12:00 시작, 11:00에 알림이지만 현재 08:50이므로 알림 안됨)
      await saveScheduleWithNotification(user, {
        title: '점심 약속',
        date: '2025-10-15',
        startTime: '12:00',
        endTime: '13:00',
        description: '고객과 점심',
        location: '레스토랑',
        category: '업무',
        notificationTime: 60,
      });

      // 알림 체크를 위해 시간 진행
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 첫 번째 알림만 표시되는지 확인
      await screen.findByText('10분 후 오전 회의 일정이 시작됩니다.');

      // 시간을 11:00으로 변경 (점심 약속 1시간 전)
      act(() => {
        vi.setSystemTime(new Date('2025-10-15 11:00:00'));
        vi.advanceTimersByTime(1000);
      });

      // 두 번째 알림이 추가로 표시되는지 확인
      expect(screen.queryByText('60분 후 점심 약속 일정이 시작됩니다.')).toBeInTheDocument();
      // 첫 번째 알림은 여전히 존재하는지 확인
      expect(screen.getByText('10분 후 오전 회의 일정이 시작됩니다.')).toBeInTheDocument();
    }, 10000);

    it('사용자가 특정 알림만 제거했을 때 다른 알림은 유지되는지 확인', async () => {
      vi.setSystemTime(new Date('2025-10-15 08:50:00'));
      setupMockHandlerCreation();

      const { user } = setup(<App />);

      // 첫 번째 일정: 09:00 시작, 10분 전 알림 (08:50에 활성화)
      await saveScheduleWithNotification(user, {
        title: '오전 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '팀 미팅',
        location: '회의실 A',
        category: '업무',
        notificationTime: 10,
      });

      // 두 번째 일정: 10:00 시작, 60분 전 알림 (09:00에 활성화)
      await saveScheduleWithNotification(user, {
        title: '다른 회의',
        date: '2025-10-15',
        startTime: '10:00',
        endTime: '11:00',
        description: '다른 미팅',
        location: '회의실 B',
        category: '업무',
        notificationTime: 60,
      });

      // 첫 번째 알림 시간 (08:50)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 첫 번째 알림만 표시되는지 확인
      await screen.findByText('10분 후 오전 회의 일정이 시작됩니다.');
      expect(screen.queryByText('60분 후 다른 회의 일정이 시작됩니다.')).not.toBeInTheDocument();

      // 시간을 09:00으로 진행 (두 번째 알림 활성화)
      act(() => {
        vi.setSystemTime(new Date('2025-10-15 09:00:00'));
        vi.advanceTimersByTime(1000);
      });

      // 두 번째 알림이 추가로 표시되는지 확인
      await screen.findByText('60분 후 다른 회의 일정이 시작됩니다.');

      // 첫 번째 알림도 여전히 존재하는지 확인
      expect(screen.getByText('10분 후 오전 회의 일정이 시작됩니다.')).toBeInTheDocument();

      // 첫 번째 알림의 닫기 버튼 클릭
      const closeButtons = screen.getAllByTestId('CloseIcon');
      await user.click(closeButtons[0]); // 첫 번째 알림 닫기

      // 첫 번째 알림만 사라지고 두 번째는 유지되는지 확인
      expect(screen.queryByText('10분 후 오전 회의 일정이 시작됩니다.')).not.toBeInTheDocument();
      expect(screen.getByText('60분 후 다른 회의 일정이 시작됩니다.')).toBeInTheDocument();
    });
  }, 10000);
});
