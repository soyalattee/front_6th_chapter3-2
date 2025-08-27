import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within, act } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import {
  setupMockHandlerCreation,
  setupMockHandlerDeletion,
  setupMockHandlerUpdating,
} from '../__mocks__/handlersUtils';
import App from '../App';
import { server } from '../setupTests';
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

describe('Repeat Event Integration Tests', () => {
  it('반복 유형 선택 하여 반복 일정을 생성한다.', async () => {
    setupMockHandlerCreation();
    const { user } = setup(<App />);

    // Given 일정 생성/수정 폼이 열림
    await user.click(screen.getByText('일정 추가'));

    // When “반복” 콤보박스에서 매일을 선택
    await user.click(screen.getByLabelText('반복 일정'));
    await user.click(screen.getByLabelText('반복 유형'));
    await user.click(screen.getByRole('option', { name: '매일' }));

    // Then 선택 상태가 반영되고 저장 시 서버로 해당 반복 타입이 전송된다.
    await user.click(screen.getByTestId('event-submit-button'));
    expect(await screen.findByText('반복: 매일')).toBeInTheDocument();
  });

  it('월간/주간 달력에 반복 일정 표시(아이콘)가 되어있음을 확인한다.', async () => {
    setupMockHandlerCreation();
    const { user } = setup(<App />);

    // Given 반복 옵션으로 저장된 일정 존재
    await user.click(screen.getByText('일정 추가'));
    await user.click(screen.getByLabelText('반복 일정'));
    await user.click(screen.getByLabelText('반복 유형'));
    await user.click(screen.getByRole('option', { name: '매일' }));
    await user.click(screen.getByTestId('event-submit-button'));

    // When 월/주 뷰를 렌더
    await user.click(screen.getByRole('option', { name: 'month-option' }));

    // Then 반복 인스턴스에 반복 아이콘이 표시되고 단일 일정에는 표시되지 않는다.
    const monthView = within(screen.getByTestId('month-view'));
    expect(monthView.getByText('반복: 매일')).toBeInTheDocument();
  });

  it('반복 종료(날짜까지)를 확인한다.', async () => {
    setupMockHandlerCreation();
    const { user } = setup(<App />);

    // Given 반복: 매일, 종료: 2025-10-30
    await user.click(screen.getByText('일정 추가'));
    await user.click(screen.getByLabelText('반복 일정'));
    await user.click(screen.getByLabelText('반복 유형'));
    await user.click(screen.getByRole('option', { name: '매일' }));
    await user.type(screen.getByLabelText('반복 종료일'), '2025-10-30');
    await user.click(screen.getByTestId('event-submit-button'));

    // When 캘린더 월/주 뷰를 이동
    await user.click(screen.getByRole('option', { name: 'month-option' }));

    // Then 10/30까지는 보이고, 10/31 이후에는 보이지 않는다.
    const monthView = within(screen.getByTestId('month-view'));
    expect(monthView.getByText('2025-10-30')).toBeInTheDocument();
    expect(monthView.queryByText('2025-10-31')).not.toBeInTheDocument();
  });

  it('반복 일정 단일 수정시 반복아이콘이 사라지고 단일 일정으로 표시되며, 다른 반복 일정은 그대로 유지된다.', async () => {
    setupMockHandlerUpdating();
    const { user } = setup(<App />);

    // Given 반복 일정 시리즈가 렌더됨
    await user.click(screen.getByText('일정 추가'));
    await user.click(screen.getByLabelText('반복 일정'));
    await user.click(screen.getByLabelText('반복 유형'));
    await user.click(screen.getByRole('option', { name: '매일' }));
    await user.click(screen.getByTestId('event-submit-button'));

    // When 특정 인스턴스를 편집(제목/시간 변경) 후 저장
    await user.click(screen.getByLabelText('Edit event'));
    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '수정된 일정');
    await user.click(screen.getByTestId('event-submit-button'));

    // Then 해당 인스턴스는 반복 아이콘이 사라지고 단일 일정으로 표시되며, 다른 인스턴스는 그대로 유지.
    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('수정된 일정')).toBeInTheDocument();
    expect(eventList.queryByText('반복: 매일')).not.toBeInTheDocument();
  });

  it('반복 일정 단일 삭제시 달력에서 사라지고, 다른 반복 일정은 그대로 유지된다.', async () => {
    setupMockHandlerDeletion();
    const { user } = setup(<App />);

    // Given 반복 일정 시리즈가 렌더됨
    await user.click(screen.getByText('일정 추가'));
    await user.click(screen.getByLabelText('반복 일정'));
    await user.click(screen.getByLabelText('반복 유형'));
    await user.click(screen.getByRole('option', { name: '매일' }));
    await user.click(screen.getByTestId('event-submit-button'));

    // When 특정 인스턴스를 삭제
    const deleteButton = await screen.findAllByLabelText('Delete event');
    await user.click(deleteButton[0]);

    // Then 해당 인스턴스만 리스트/캘린더에서 사라지고, 나머지 인스턴스는 유지.
    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.queryByText('반복: 매일')).not.toBeInTheDocument();
  });

  it('매일 반복 일정이 여러 개의 인스턴스로 등록된다.', async () => {
    setupMockHandlerCreation();
    const { user } = setup(<App />);

    // Given 일정 생성/수정 폼이 열림
    await user.click(screen.getByText('일정 추가'));
    await user.type(screen.getByLabelText('제목'), '반복 일정');
    await user.type(screen.getByLabelText('날짜'), '2025-10-01');
    await user.click(screen.getByLabelText('반복 일정'));
    await user.click(screen.getByLabelText('반복 유형'));
    await user.click(screen.getByRole('option', { name: '매일' }));
    await user.type(screen.getByLabelText('반복 종료일'), '2025-10-05');
    await user.click(screen.getByTestId('event-submit-button'));

    // When 일정 리스트를 확인
    const eventList = within(screen.getByTestId('event-list'));

    // Then 매일 반복 일정이 여러 개의 인스턴스로 등록된다.
    expect(eventList.getAllByText('반복 일정').length).toBe(5);
  });
});
