import { DatePicker } from './date-picker.js';

describe('DatePickerのテスト', () => {

  const newInvalidInstance = () => new DatePicker('[name="foo"]');
  const newValidInstance   = () => new DatePicker('[name="date"]');
  const getCalendarUi      = () => document.querySelector('.ts-calendar-container');
  const getInputUi         = () => document.querySelector('[name="date"]');
  const getInputValue      = () => getInputUi().value;
  const zeroPadding        = (number) => ('00' + number).slice(-2);
  const formatDate         = (date) => `${date.getFullYear()}-${zeroPadding(date.getMonth() + 1)}-${zeroPadding(date.getDate())}`;
  const waitForAnimation   = async () => await new Promise(r => setTimeout(r, 1000));
  const openCalendar       = async () => {
    getInputUi().dispatchEvent(new CustomEvent('click'));
    await waitForAnimation();
  };
  const clickPrev          = async (view) => {
    view.querySelector('.ts-prev').dispatchEvent(new CustomEvent('click'));
    await waitForAnimation();
  };
  const clickNext          = async (view) => {
    view.querySelector('.ts-next').dispatchEvent(new CustomEvent('click'));
    await waitForAnimation();
  };

  beforeEach(() => document.body.innerHTML = '<input type="text" name="date" readonly>');

  describe('インスタンス生成時', () => {

    describe('存在しないセレクターを指定した場合', () => {

      it('例外は投げられない', () => {
        expect(newInvalidInstance).toThrow('The element for the specified CSS selector was not found.');
      });
    });

    describe('存在するセレクターを指定した場合', () => {

      it('例外は投げられない', () => {
        expect(newValidInstance).not.toThrow();
      });

      it('インスタンスが生成される', () => {
        expect(newValidInstance()).toBeInstanceOf(DatePicker);
      });
    });
  });

  describe('インスタンス生成後', () => {

    let defaultDate;

    beforeEach(() => defaultDate = new Date(2022, 0, 1));

    describe('初期の日付をセットする際', () => {

      it('インスタンス内に日付が反映される', () => {
        const picker = newValidInstance();

        picker.setDate(defaultDate);

        expect(picker.getDate().getFullYear()).toBe(defaultDate.getFullYear());
        expect(picker.getDate().getMonth()).toBe(defaultDate.getMonth());
        expect(picker.getDate().getDate()).toBe(defaultDate.getDate());
      });

      describe('第一引数のみの場合', () => {

        it('Input要素にも値が反映される', () => {
          const picker = newValidInstance();
          picker.setDate(defaultDate);
          expect(getInputValue()).toBe(formatDate(defaultDate));
        });
      });

      describe('第二引数に`false`を渡した場合', () => {

        it('Input要素には値が反映されない', () => {
          const picker = newValidInstance();
          picker.setDate(defaultDate, false);
          expect(getInputValue()).toBe('');
        });
      });
    });

    describe('カレンダー内の日付をクリックすると', () => {

      let picker;
      let selectedDate;

      const clickDateCell = () => {
        const cell  = getCalendarUi().querySelector('.ts-body-cell.ts-date');
        const time  = cell.dataset.time;
        const event = new CustomEvent('click', {
          target: {
            dataset: {
              time,
            },
          }
        });
        cell.dispatchEvent(event);

        return time;
      };

      beforeEach(() => {
        picker = newValidInstance();
        picker.setDate(defaultDate);
      });

      describe('カレンダーが開いていない場合', () => {

        beforeEach(() => {
          // 日付をクリック
          clickDateCell();
        });

        it('インスタンス内に日付が反映されない', () => {
          expect(picker.getDate().getFullYear()).toBe(defaultDate.getFullYear());
          expect(picker.getDate().getMonth()).toBe(defaultDate.getMonth());
          expect(picker.getDate().getDate()).toBe(defaultDate.getDate());
        });

        it('Input要素に値が反映されない', () => {
          expect(getInputValue()).toBe(formatDate(defaultDate));
        });
      });

      describe('カレンダーが開いている場合', () => {

        beforeEach(async () => {
          await openCalendar();
          // 日付をクリック
          const time   = clickDateCell();
          selectedDate = new Date(+time);
        });

        it('インスタンス内に日付が反映される', async () => {
          expect(picker.getDate().getFullYear()).toBe(selectedDate.getFullYear());
          expect(picker.getDate().getMonth()).toBe(selectedDate.getMonth());
          expect(picker.getDate().getDate()).toBe(selectedDate.getDate());
        });

        it('Input要素に値が反映される', () => {
          expect(getInputValue()).toBe(formatDate(selectedDate));
        });
      });
    });

    describe('日付選択画面のページャーのテスト', () => {

      let picker;
      let mainView;

      const getYearMonth = () => {
        return new Date(
          +mainView.querySelector('.ts-header-year .ts-text').innerHTML.trim(),
          +mainView.querySelector('.ts-header-month .ts-text').innerHTML.trim() - 1,
          1
        );
      };

      beforeEach(async () => {
        picker = newValidInstance();
        picker.setDate(defaultDate);

        await openCalendar();

        mainView = getCalendarUi().querySelector('.ts-view-main');
      });

      describe('次へボタンをクリックすると', () => {

        it('1ヶ月後の年月が表示される', async () => {
          const currentYearMonth = getYearMonth();
          await clickNext(mainView);
          const nextYearMonth = getYearMonth();

          currentYearMonth.setMonth(currentYearMonth.getMonth() + 1)

          expect(nextYearMonth.getFullYear()).toBe(currentYearMonth.getFullYear());
          expect(nextYearMonth.getMonth()).toBe(currentYearMonth.getMonth());
        });
      });

      describe('前へボタンをクリックすると', () => {

        it('1ヶ月前の年月が表示される', async () => {
          const currentYearMonth = getYearMonth();
          await clickPrev(mainView);
          const prevYearMonth = getYearMonth();

          currentYearMonth.setMonth(currentYearMonth.getMonth() - 1);

          expect(prevYearMonth.getFullYear()).toBe(currentYearMonth.getFullYear());
          expect(prevYearMonth.getMonth()).toBe(currentYearMonth.getMonth());
        });
      });
    });

    describe('経路別画面遷移の挙動テスト', () => {

      let picker;
      let mainView;
      let yearsView;
      let monthsView;
      let selectedYear;
      let selectedMonth;

      const select = async (view, dataSetPropName) => {
        const cell = view.querySelector('.ts-body-cell');
        const prop = cell.dataset[dataSetPropName];

        cell.dispatchEvent(new CustomEvent('click', {
          target: {
            dataset: {
              [dataSetPropName]: prop,
            },
          }
        }));

        await waitForAnimation();

        return prop;
      };

      beforeEach(async () => {
        picker = newValidInstance();
        picker.setDate(defaultDate);

        await openCalendar();

        mainView   = getCalendarUi().querySelector('.ts-view-main');
        yearsView  = getCalendarUi().querySelector('.ts-view-years');
        monthsView = getCalendarUi().querySelector('.ts-view-months');
      });

      describe('カレンダー上部の年をクリックすると', () => {

        beforeEach(async () => {
          const yearElm = mainView.querySelector('.ts-calendar-header .ts-header-year');
          yearElm.dispatchEvent(new CustomEvent('click'));

          await waitForAnimation();
        });

        it('年選択画面に移動する', () => {
          expect(mainView.classList.contains('ts-hidden')).toBeTruthy();
          expect(yearsView.classList.contains('ts-hidden')).toBeFalsy();
          expect(monthsView.classList.contains('ts-hidden')).toBeTruthy();
        });

        describe('年選択画面のページャーのテスト', () => {

          const getYears = () => Array.from(yearsView.querySelectorAll('.ts-body-cell')).map(elm => +elm.innerHTML.trim());

          describe('次へボタンをクリックすると', () => {

            it('次の16年が表示される', async () => {
              const currentYears = getYears();
              await clickNext(yearsView);
              const nextYears = getYears();

              expect(nextYears).toHaveLength(16);
              expect(nextYears[0]).toBe(currentYears[currentYears.length - 1] + 1);
              expect(nextYears[nextYears.length - 1]).toBe(nextYears[0] + 15);
            });
          });

          describe('前へボタンをクリックすると', () => {

            it('前の16年が表示される', async () => {
              const currentYears = getYears();
              await clickPrev(yearsView);
              const prevYears = getYears();

              expect(prevYears).toHaveLength(16);
              expect(prevYears[prevYears.length - 1]).toBe(currentYears[0] - 1);
              expect(prevYears[0]).toBe(prevYears[prevYears.length - 1] - 15);
            });
          });
        });

        describe('年を選択すると', () => {

          beforeEach(async () => selectedYear = await select(yearsView, 'year'));

          it('月選択画面に移動する', () => {
            expect(mainView.classList.contains('ts-hidden')).toBeTruthy();
            expect(yearsView.classList.contains('ts-hidden')).toBeTruthy();
            expect(monthsView.classList.contains('ts-hidden')).toBeFalsy();
          });

          describe('月を選択すると', () => {

            beforeEach(async () => selectedMonth = await select(monthsView, 'month'));

            it('メインビューに移動する', () => {
              expect(mainView.classList.contains('ts-hidden')).toBeFalsy();
              expect(yearsView.classList.contains('ts-hidden')).toBeTruthy();
              expect(monthsView.classList.contains('ts-hidden')).toBeTruthy();
            });

            it('選択した年月のカレンダーが表示されている', () => {
              expect(mainView.querySelector('.ts-calendar-header .ts-header-year .ts-text').innerHTML.trim()).toBe(selectedYear);
              expect(mainView.querySelector('.ts-calendar-header .ts-header-month .ts-text').innerHTML.trim()).toBe(selectedMonth);
            });
          });
        });
      });

      describe('カレンダー上部の月をクリックすると', () => {

        beforeEach(async () => {
          const monthElm = mainView.querySelector('.ts-calendar-header .ts-header-month');
          monthElm.dispatchEvent(new CustomEvent('click'));

          await waitForAnimation();
        });

        it('月選択画面に移動する', () => {
          expect(mainView.classList.contains('ts-hidden')).toBeTruthy();
          expect(yearsView.classList.contains('ts-hidden')).toBeTruthy();
          expect(monthsView.classList.contains('ts-hidden')).toBeFalsy();
        });

        describe('月選択画面のページャーのテスト', () => {

          const getYear = () => +monthsView.querySelector('.ts-header-selected-year').innerHTML.trim();

          describe('次へボタンをクリックすると', () => {

            it('翌年に移動する', async () => {
              const currentYear = getYear();
              await clickNext(monthsView);

              expect(getYear()).toBe(currentYear + 1);
            });
          });

          describe('前へボタンをクリックすると', () => {

            it('前年に移動する', async () => {
              const currentYear = getYear();
              await clickPrev(monthsView);

              expect(getYear()).toBe(currentYear - 1);
            });
          });
        });

        describe('月を選択すると', () => {

          beforeEach(async () => selectedMonth = await select(monthsView, 'month'));

          it('メインビューに移動する', () => {
            expect(mainView.classList.contains('ts-hidden')).toBeFalsy();
            expect(yearsView.classList.contains('ts-hidden')).toBeTruthy();
            expect(monthsView.classList.contains('ts-hidden')).toBeTruthy();
          });

          it('選択した月のカレンダーが表示されている', () => {
            expect(mainView.querySelector('.ts-calendar-header .ts-header-month .ts-text').innerHTML.trim()).toBe(selectedMonth);
          });
        });
      });
    });
  });
});

