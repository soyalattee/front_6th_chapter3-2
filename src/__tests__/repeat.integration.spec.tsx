import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import { setupMockHandlerRepeatCreation } from '../__mocks__/handlersUtils';
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

// ! Hard 여기 제공 안함
const saveRepeatSchedule = async (
  user: UserEvent,
  form: Omit<Event, 'id' | 'notificationTime'> & {
    repeat: { type: string; interval: number; endDate?: string };
  }
) => {
  const { title, date, startTime, endTime, location, description, category, repeat } = form;

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
  await user.click(screen.getByLabelText('반복 유형'));
  await user.click(within(screen.getByLabelText('반복 유형')).getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: `${repeat.type}-option` }));
  if (repeat.endDate) {
    await user.type(screen.getByLabelText('반복 종료일'), repeat.endDate);
  }
  console.log('repeat:', repeat);
  await user.click(screen.getByTestId('event-submit-button'));
};

describe('Repeat Event Integration Tests', () => {
  it('반복 유형 선택 하여 반복 일정을 생성한다.', async () => {
    setupMockHandlerRepeatCreation();
    const { user } = setup(<App />);

    await saveRepeatSchedule(user, {
      title: '팀 회의1',
      date: '2025-10-02',
      startTime: '09:00',
      endTime: '10:00',
      description: '이번주 팀 회의입니다.',
      location: '회의실 A',
      category: '업무',
      repeat: { type: 'monthly', interval: 1 },
    });

    const monthView = within(screen.getByTestId('month-view'));
    expect(monthView.getAllByText('팀 회의1')).toHaveLength(1);
  });

  it('월간/주간 달력에 반복 일정 표시(아이콘)가 되어있음을 확인한다.', async () => {
    setupMockHandlerRepeatCreation();
    const { user } = setup(<App />);

    // Given 반복 일정 시리즈가 렌더됨
    await saveRepeatSchedule(user, {
      title: '팀 회의2',
      date: '2025-10-02',
      startTime: '09:00',
      endTime: '10:00',
      description: '이번주 팀 회의입니다.',
      location: '회의실 A',
      category: '업무',
      repeat: { type: 'monthly', interval: 1 },
    });

    // Then 반복 인스턴스에 반복 아이콘이 표시되고 단일 일정에는 표시되지 않는다.
    const monthView = within(screen.getByTestId('month-view'));
    expect(monthView.getAllByLabelText('반복 일정')).toHaveLength(1);
  });

  it('매일 반복 일정이 여러 개의 인스턴스로 등록된다.', async () => {
    setupMockHandlerRepeatCreation();
    const { user } = setup(<App />);

    // Given 반복: 매일, 종료: 2025-10-30
    await saveRepeatSchedule(user, {
      title: '매일 회의',
      date: '2025-10-15',
      startTime: '06:00',
      endTime: '07:00',
      description: '매일 회의입니다.',
      location: '회의실 A',
      category: '업무',
      repeat: { type: 'daily', interval: 1, endDate: '2025-10-20' },
    });

    const monthView = screen.getByTestId('month-view');
    expect(within(monthView).getAllByText('매일 회의')).toHaveLength(6);
  });

  it('반복 종료(날짜까지)를 확인한다.', async () => {
    setupMockHandlerRepeatCreation();
    const { user } = setup(<App />);

    // Given 반복: 매일, 종료: 2025-10-30
    await saveRepeatSchedule(user, {
      title: '매일 회의',
      date: '2025-10-15',
      startTime: '06:00',
      endTime: '07:00',
      description: '매일 회의입니다.',
      location: '회의실 A',
      category: '업무',
      repeat: { type: 'daily', interval: 1, endDate: '2025-10-20' },
    });

    // When 캘린더 월/주 뷰를 이동

    // Then 10/05까지는 보이고, 10/06 이후에는 보이지 않는다.
    const monthView = screen.getByTestId('month-view');

    const endDateCell = within(monthView).getByText('20').closest('td')!;
    expect(within(endDateCell).getByText('매일 회의')).toBeInTheDocument();
    const endDateCell2 = within(monthView).getByText('21').closest('td')!;
    expect(within(endDateCell2).queryByText('매일 회의')).not.toBeInTheDocument();
  });

  it('반복 일정 단일 수정시 반복아이콘이 사라지고 단일 일정으로 표시되며, 다른 반복 일정은 그대로 유지된다.', async () => {
    setupMockHandlerRepeatCreation();
    const { user } = setup(<App />);

    // Given 반복: 매일, 종료: 2025-10-30
    await saveRepeatSchedule(user, {
      title: '매일 회의',
      date: '2025-10-15',
      startTime: '06:00',
      endTime: '07:00',
      description: '매일 회의입니다.',
      location: '회의실 A',
      category: '업무',
      repeat: { type: 'daily', interval: 1, endDate: '2025-10-20' },
    });

    const editButton = (await screen.findAllByLabelText('Edit event'))[1];
    await user.click(editButton);

    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '매일 회의 수정');
    await user.click(screen.getByTestId('event-submit-button'));

    const monthView = within(screen.getByTestId('month-view'));
    expect(monthView.getAllByLabelText('반복 일정')).toHaveLength(5);
  });

  it('반복 일정 단일 삭제시 달력에서 사라지고, 다른 반복 일정은 그대로 유지된다.', async () => {
    setupMockHandlerRepeatCreation();
    const { user } = setup(<App />);

    // Given 반복: 매일, 종료: 2025-10-30
    await saveRepeatSchedule(user, {
      title: '매일 회의',
      date: '2025-10-15',
      startTime: '06:00',
      endTime: '07:00',
      description: '매일 회의입니다.',
      location: '회의실 A',
      category: '업무',
      repeat: { type: 'daily', interval: 1, endDate: '2025-10-20' },
    });

    const allDeleteButton = await screen.findAllByLabelText('Delete event');
    await user.click(allDeleteButton[0]);

    const monthView = within(screen.getByTestId('month-view'));
    expect(monthView.getAllByLabelText('반복 일정')).toHaveLength(5);
  });
});
