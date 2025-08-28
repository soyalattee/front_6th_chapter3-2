import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';

import { UserEvent, userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import { setupMockHandlerCreation, setupMockHandlerUpdating } from '../__mocks__/handlersUtils';
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

const saveSchedule = async (
  user: UserEvent,
  form: Omit<Event, 'id' | 'notificationTime' | 'repeat'> & {
    repeat?: { type: string; interval: number; endDate?: string };
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
  if (repeat) {
    await user.click(screen.getByLabelText('반복 유형'));
    await user.click(within(screen.getByLabelText('반복 유형')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: `${repeat.type}-option` }));
    if (repeat.endDate) {
      await user.type(screen.getByLabelText('반복 종료일'), repeat.endDate);
    }
  }
  await user.click(screen.getByTestId('event-submit-button'));
};

describe('일정 생성 테스트', () => {
  it('새 일정을 생성하고 제출한 후 폼이 완전히 초기화됩니다.', async () => {
    // 모든 입력 필드가 비워지고 기본값들이 올바르게 설정되는지 확인
    setupMockHandlerCreation();

    const { user } = setup(<App />);

    await saveSchedule(user, {
      title: '새 회의',
      date: '2025-10-15',
      startTime: '14:00',
      endTime: '15:00',
      description: '프로젝트 진행 상황 논의',
      location: '회의실 A',
      category: '업무',
    });

    expect(screen.getByLabelText('제목')).not.toHaveValue();
    expect(screen.getByLabelText('날짜')).not.toHaveValue();
    expect(screen.getByLabelText('시작 시간')).not.toHaveValue();
    expect(screen.getByLabelText('종료 시간')).not.toHaveValue();
    expect(screen.getByLabelText('설명')).not.toHaveValue();
    expect(screen.getByLabelText('위치')).not.toHaveValue();
    expect(screen.getByLabelText('카테고리')).not.toHaveValue();
  });

  it('필수 필드를 입력하지 않을경우 오류 메세지가 노출됩니다', async () => {
    // 필수 필드를 입력하지 않고 제출할 때 적절한 오류 메시지가 표시되는지 확인
    // 필드 오류가 있을 때 일정이 저장되지 않아야함
    setupMockHandlerCreation();
    const { user } = setup(<App />);

    await user.click(screen.getAllByText('일정 추가')[0]);
    await user.type(screen.getByLabelText('제목'), '새 회의');
    await user.type(screen.getByLabelText('날짜'), '2025-10-15');
    await user.click(screen.getByTestId('event-submit-button'));

    expect(screen.getByText('필수 정보를 모두 입력해주세요.')).toBeInTheDocument();
  });

  it('시작 시간이 종료 시간보다 늦을 때 오류 메시지가 노출됩니다', async () => {
    // 시작 시간이 종료 시간보다 늦을 때 적절한 오류 메시지가 표시되는지 확인
    // 시간 오류가 있을 때 일정이 저장되지 않아야함
    setupMockHandlerCreation();
    const { user } = setup(<App />);

    await saveSchedule(user, {
      title: '새 회의',
      date: '2025-10-15',
      startTime: '14:00',
      endTime: '13:30',
      description: '프로젝트 진행 상황 논의',
      location: '회의실 A',
      category: '업무',
    });

    expect(screen.getByText('시간 설정을 확인해주세요.')).toBeInTheDocument();
    expect(screen.getByText('시작 시간은 종료 시간보다 빨라야 합니다.')).toBeInTheDocument();
    expect(screen.getByText('종료 시간은 시작 시간보다 늦어야 합니다.')).toBeInTheDocument();

    await user.click(screen.getByTestId('event-submit-button'));

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.queryByText('새 회의')).not.toBeInTheDocument();
  });
});

describe('일정 편집 테스트', () => {
  it('기존 일정을 편집 모드로 전환했을 때 모든 폼 필드가 올바르게 로드됩니다.', async () => {
    // 제목, 날짜, 시간, 설명, 위치, 카테고리, 알림 설정이 모두 정확하게 표시되는지 확인
    setupMockHandlerUpdating();
    const { user } = setup(<App />);

    const editButton = (await screen.findAllByLabelText('Edit event'))[1];
    await user.click(editButton);

    expect(screen.getByLabelText('제목')).toHaveValue('기존 회의2');
    expect(screen.getByLabelText('날짜')).toHaveValue('2025-10-15');
    expect(screen.getByLabelText('시작 시간')).toHaveValue('11:00');
    expect(screen.getByLabelText('종료 시간')).toHaveValue('12:00');
    expect(screen.getByLabelText('설명')).toHaveValue('기존 팀 미팅 2');
    expect(screen.getByLabelText('위치')).toHaveValue('회의실 C');

    const categoryInput = await screen.findByLabelText('카테고리');
    expect(categoryInput).toHaveTextContent('업무');

    const field = screen.getByText('알림 설정').closest('.MuiFormControl-root')! as HTMLElement;
    const notificationInput = within(field).getByRole('combobox');
    expect(notificationInput).toHaveTextContent('10분 전');
  });

  it('일정 편집이 완료되면 폼이 초기 상태로 돌아갑니다.', async () => {
    // 일정 편집 중에 새 일정 추가 버튼을 클릭했을 때 폼이 초기 상태로 돌아가는지 확인
    // 일정 편집에서 일정 추가버튼으로 변경됨을 확인
    setupMockHandlerUpdating();
    const { user } = setup(<App />);

    const editButton = (await screen.findAllByLabelText('Edit event'))[1];
    await user.click(editButton);

    await user.click(screen.getByTestId('event-submit-button'));

    expect(screen.getByLabelText('제목')).not.toHaveValue();
    expect(screen.getByLabelText('날짜')).not.toHaveValue();
    expect(screen.getByLabelText('시작 시간')).not.toHaveValue();
    expect(screen.getByLabelText('종료 시간')).not.toHaveValue();
    expect(screen.getByLabelText('설명')).not.toHaveValue();
    expect(screen.getByLabelText('위치')).not.toHaveValue();
    expect(screen.getByLabelText('카테고리')).not.toHaveValue();
  });
});

describe('반복 테스트', () => {
  it('반복 일정 체크박스가 체크되어있을때 반복일정 폼이 존재합니다.', async () => {
    const { user } = setup(<App />);
    // 반복 일정 체크박스를 클릭했을 때 반복 기간, 종료시간 폼이 추가되었는지 확인
    // 체크박스를 다시 클릭했을 때 체크가 해제되는지 확인
    expect(screen.getByText('반복 종료일')).toBeInTheDocument();
    expect(screen.getByText('반복 유형')).toBeInTheDocument();
    expect(screen.getByText('반복 간격')).toBeInTheDocument();

    await user.click(screen.getByLabelText('반복 일정'));

    expect(screen.queryByText('반복 종료일')).not.toBeInTheDocument();
    expect(screen.queryByText('반복 유형')).not.toBeInTheDocument();
    expect(screen.queryByText('반복 간격')).not.toBeInTheDocument();
  });
});
