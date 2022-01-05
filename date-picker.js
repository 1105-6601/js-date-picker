'use strict';

export class DatePicker
{
  static #WINDOW = (0, eval)('this');

  static #ELEMENT_SELECTORS = {
    CONTAINER:            'ts-calendar-container',
    VIEW_MAIN:            'ts-view-main',
    VIEW_YEARS:           'ts-view-years',
    VIEW_MONTHS:          'ts-view-months',
    HEADER_YEAR:          'ts-header-year',
    HEADER_MONTH:         'ts-header-month',
    HEADER_YEARS_RANGE:   'ts-header-years-range',
    HEADER_SELECTED_YEAR: 'ts-header-selected-year',
    TEXT:                 'ts-text',
    BTN_PREV:             'ts-prev',
    BTN_NEXT:             'ts-next',
    BODY:                 'ts-calendar-body',
    CELL:                 'ts-body-cell',
    HIDDEN:               'ts-hidden',
    ANIMATED:             'ts-animated',
    WEEK_NUMBER:          'ts-week-number',
    DATE:                 'ts-date',
    SATURDAY:             'ts-sat',
    SUNDAY:               'ts-sun',
    NOT_THIS_MONTH:       'ts-not-this-month',
    ACTIVE:               'ts-active',
    DELAY:                'ts-delay',
  };

  static #CELL_TYPES = {
    BLANK:       1,
    DAY:         2,
    WEEK_NUMBER: 3,
    DATE:        4,
  };

  static #DAYS = '日月火水木金土';

  static #ANIMATION_DURATION = 500;

  static #CONTAINER_TOP_MARGIN = 8;

  #inputElementRef;

  #containerElementRef;

  // Variables for rendering used by the system.
  #currentDate;

  #dateInOperation;

  #selectedDate;

  #dateCells = [];

  #yearCells = [];

  #monthCells = [];

  #prevUiTimer;

  #currentYearsRange;

  constructor(selector)
  {
    this.#inputElementRef = this.#document.querySelector(selector);
    if (!this.#inputElementRef) {
      throw new Error('The element for the specified CSS selector was not found.');
    }

    this.#selectedDate    = new Date();
    this.#dateInOperation = DatePicker.#cloneDate(this.#selectedDate);
    this.#dateInOperation.setDate(1);
    this.#init();
  }

  setDate(date, applyToInput)
  {
    applyToInput = typeof applyToInput === 'undefined' ? true : applyToInput;

    if (!(date instanceof Date)) {
      throw new Error(`Argument 1 passed to setDate() must be an instance of Date, ${typeof date} given.`);
    }
    if (typeof applyToInput !== 'boolean') {
      throw new Error(`Argument 2 passed to setDate() must be boolean, ${typeof applyToInput} given.`);
    }

    this.#selectedDate    = date;
    this.#dateInOperation = DatePicker.#cloneDate(this.#selectedDate);
    this.#dateInOperation.setDate(1);

    if (applyToInput) {
      this.#input.value = DatePicker.#format(date);
    }

    this.#reInit();
  }

  getDate()
  {
    return DatePicker.#cloneDate(this.#selectedDate);
  }

  get #document()
  {
    return DatePicker.#WINDOW.document;
  }

  get #input()
  {
    return this.#inputElementRef
  }

  get #container()
  {
    return this.#containerElementRef
  }

  #init()
  {
    this.#initContainer();
    this.#initDate();
    this.#initTemplate();
    this.#initHeader();
    this.#initDateCells();
    this.#bindGlobalEvents();
    this.#bindViewEvents();
    this.#bindCellEvents();
  }

  #initContainer()
  {
    const container = this.#document.createElement('div');
    container.classList.add(
      DatePicker.#ELEMENT_SELECTORS.CONTAINER,
      DatePicker.#ELEMENT_SELECTORS.HIDDEN,
      DatePicker.#ELEMENT_SELECTORS.ANIMATED,
    );

    const rect = this.#input.getBoundingClientRect();

    container.style.top  = `${rect.bottom + DatePicker.#CONTAINER_TOP_MARGIN}px`;
    container.style.left = `${rect.left}px`;

    this.#document.body.appendChild(container);
    this.#containerElementRef = container;
  }

  #initDate(baseDate)
  {
    baseDate = baseDate || new Date();

    const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    this.#currentDate  = DatePicker.#cloneDate(startOfMonth);
    // Tweak current date.
    this.#currentDate.setDate(this.#currentDate.getDate() - startOfMonth.getDay());
  }

  #initTemplate()
  {
    this.#container.innerHTML = DatePicker.#getTemplate();
    this.#showMainView()
    this.#hideYearsView();
    this.#hideMonthsView();
  }

  #initHeader()
  {
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN} .${DatePicker.#ELEMENT_SELECTORS.HEADER_YEAR} .${DatePicker.#ELEMENT_SELECTORS.TEXT}`).innerHTML  = this.#dateInOperation.getFullYear();
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN} .${DatePicker.#ELEMENT_SELECTORS.HEADER_MONTH} .${DatePicker.#ELEMENT_SELECTORS.TEXT}`).innerHTML = this.#dateInOperation.getMonth() + 1
  }

  #initDateCells()
  {
    const body      = this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN} .${DatePicker.#ELEMENT_SELECTORS.BODY}`);
    const dateCells = [];

    for (let i = 0; i < 56; i++) {
      const cell = this.#document.createElement('div');
      cell.classList.add(DatePicker.#ELEMENT_SELECTORS.CELL);

      let content = '';
      switch (DatePicker.#getCellType(i)) {
        case DatePicker.#CELL_TYPES.BLANK:
          // noop.
          break;

        case DatePicker.#CELL_TYPES.DAY:
          content = DatePicker.#resolveDay(i);
          break;

        case DatePicker.#CELL_TYPES.WEEK_NUMBER:
          cell.classList.add(DatePicker.#ELEMENT_SELECTORS.WEEK_NUMBER);
          content = this.#resolveCurrentWeekNumber();
          break;

        case DatePicker.#CELL_TYPES.DATE:
          cell.classList.add(
            DatePicker.#ELEMENT_SELECTORS.DATE,
            DatePicker.#ELEMENT_SELECTORS.DELAY + '-' + dateCells.length,
            DatePicker.#ELEMENT_SELECTORS.HIDDEN,
          );
          if (this.#isSat()) {
            cell.classList.add(DatePicker.#ELEMENT_SELECTORS.SATURDAY);
          }
          if (this.#isSun()) {
            cell.classList.add(DatePicker.#ELEMENT_SELECTORS.SUNDAY);
          }
          if (this.#isActive()) {
            cell.classList.add(DatePicker.#ELEMENT_SELECTORS.ACTIVE);
          }
          if (!this.#isThisMonth()) {
            cell.classList.add(DatePicker.#ELEMENT_SELECTORS.NOT_THIS_MONTH);
          }

          const date        = this.#resolveCurrentDate();
          cell.dataset.time = date.getTime();
          content           = date.getDate();
          dateCells.push(cell);
          break;
      }

      cell.innerHTML = `${content}`;

      body.appendChild(cell);
    }

    this.#dateCells = dateCells;

    if (this.#containerOpened()) {
      setTimeout(() => {
        this.#showAllDateCells();
      });
    }
  }

  #showAllDateCells()
  {
    this.#dateCells.forEach(cell => cell.classList.remove(DatePicker.#ELEMENT_SELECTORS.HIDDEN));
  }

  #hideAllDateCells()
  {
    this.#dateCells.forEach(cell => cell.classList.add(DatePicker.#ELEMENT_SELECTORS.HIDDEN));
  }

  #clearDateCells()
  {
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN} .${DatePicker.#ELEMENT_SELECTORS.BODY}`).innerHTML = '';
  }

  #showAllYearCells()
  {
    this.#yearCells.forEach(cell => cell.classList.remove(DatePicker.#ELEMENT_SELECTORS.HIDDEN));
  }

  #hideAllYearCells()
  {
    this.#yearCells.forEach(cell => cell.classList.add(DatePicker.#ELEMENT_SELECTORS.HIDDEN));
  }

  #showAllMonthCells()
  {
    this.#monthCells.forEach(cell => cell.classList.remove(DatePicker.#ELEMENT_SELECTORS.HIDDEN));
  }

  #hideAllMonthCells()
  {
    this.#monthCells.forEach(cell => cell.classList.add(DatePicker.#ELEMENT_SELECTORS.HIDDEN));
  }

  // @see https://stackoverflow.com/a/6117889/13298431
  #resolveCurrentWeekNumber()
  {
    const d = DatePicker.#cloneDate(this.#currentDate);
    d.setDate(d.getDate() + 1);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  #isSun()
  {
    return this.#currentDate.getDay() === 0;
  }

  #isSat()
  {
    return this.#currentDate.getDay() === 6;
  }

  #isThisMonth()
  {
    return this.#dateInOperation.getMonth() === this.#currentDate.getMonth();
  }

  #isActive()
  {
    return DatePicker.#format(this.#currentDate) === DatePicker.#format(this.#selectedDate);
  }

  #resolveCurrentDate()
  {
    const date = DatePicker.#cloneDate(this.#currentDate);
    this.#currentDate.setDate(this.#currentDate.getDate() + 1);
    return date;
  }

  #bindGlobalEvents()
  {
    this.#input.addEventListener('click', this.#showContainer.bind(this));
    this.#document.addEventListener('click', this.#watchUiState.bind(this));
  }

  #bindViewEvents()
  {
    // Main view events.
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN} .${DatePicker.#ELEMENT_SELECTORS.BTN_NEXT}`).addEventListener('click', this.#nextMonth.bind(this));
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN} .${DatePicker.#ELEMENT_SELECTORS.BTN_PREV}`).addEventListener('click', this.#prevMonth.bind(this));
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN} .${DatePicker.#ELEMENT_SELECTORS.HEADER_YEAR}`).addEventListener('click', this.#showYearSelector.bind(this));
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN} .${DatePicker.#ELEMENT_SELECTORS.HEADER_MONTH}`).addEventListener('click', this.#showMonthSelector.bind(this));
    // Years view events.
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_YEARS} .${DatePicker.#ELEMENT_SELECTORS.BTN_NEXT}`).addEventListener('click', this.#nextYears.bind(this));
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_YEARS} .${DatePicker.#ELEMENT_SELECTORS.BTN_PREV}`).addEventListener('click', this.#prevYears.bind(this));
    // Months view events.
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MONTHS} .${DatePicker.#ELEMENT_SELECTORS.BTN_NEXT}`).addEventListener('click', this.#nextYear.bind(this));
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MONTHS} .${DatePicker.#ELEMENT_SELECTORS.BTN_PREV}`).addEventListener('click', this.#prevYear.bind(this));
  }

  #bindCellEvents()
  {
    this.#container.querySelectorAll(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN} .${DatePicker.#ELEMENT_SELECTORS.CELL}.${DatePicker.#ELEMENT_SELECTORS.DATE}`).forEach((cell) => {
      cell.addEventListener('click', this.#dateSelected.bind(this));
    })
  }

  #nextMonth()
  {
    this.#dateInOperation.setMonth(this.#dateInOperation.getMonth() + 1);
    this.#reInit();
  }

  #prevMonth()
  {
    this.#dateInOperation.setMonth(this.#dateInOperation.getMonth() - 1);
    this.#reInit();
  }

  #dateSelected(event)
  {
    if (this.#containerClosed()) {
      return;
    }

    const date = new Date(+event.target.dataset.time);

    this.#selectedDate    = date;
    this.#input.value     = DatePicker.#format(date);
    this.#dateInOperation = DatePicker.#cloneDate(this.#selectedDate);
    this.#dateInOperation.setDate(1);
    this.#hideContainer();
    this.#reInit();
  }

  #containerOpened()
  {
    return !this.#containerClosed();
  }

  #containerClosed()
  {
    return this.#container.classList.contains(DatePicker.#ELEMENT_SELECTORS.HIDDEN);
  }

  #showContainer()
  {
    this.#prevUiTimer && clearTimeout(this.#prevUiTimer);
    this.#container.classList.remove(DatePicker.#ELEMENT_SELECTORS.ANIMATED);
    setTimeout(() => {
      this.#container.classList.remove(DatePicker.#ELEMENT_SELECTORS.HIDDEN);
      this.#showAllDateCells();
      this.#showAllYearCells();
      this.#showAllMonthCells();
    });
  }

  #hideContainer()
  {
    this.#container.classList.add(DatePicker.#ELEMENT_SELECTORS.HIDDEN);
    this.#prevUiTimer = setTimeout(() => {
      this.#container.classList.add(DatePicker.#ELEMENT_SELECTORS.ANIMATED);
      this.#hideAllDateCells();
      this.#hideAllYearCells();
      this.#hideAllMonthCells();
    }, DatePicker.#ANIMATION_DURATION);
  }

  #watchUiState(event)
  {
    const container = DatePicker.#closest(event.target, DatePicker.#ELEMENT_SELECTORS.CONTAINER);
    if (event.target !== this.#input && !container) {
      this.#hideContainer();
    }
  }

  #reInit()
  {
    this.#initDate(this.#dateInOperation);
    this.#initHeader();
    this.#clearDateCells();
    this.#initDateCells();
    this.#bindCellEvents();
  }

  #showYearSelector()
  {
    this.#hideMainView();
    this.#hideMonthsView();
    this.#showYearsView();
    this.#initYearsRange();
    this.#updateYearsSelectorUi();
  }

  #showMonthSelector()
  {
    this.#hideMainView();
    this.#hideYearsView();
    this.#showMonthsView();
    this.#updateMonthsSelectorUi();
  }

  #showDateSelector()
  {
    this.#hideYearsView();
    this.#hideMonthsView()
    this.#showMainView();
    this.#reInit();
  }

  #initYearsRange()
  {
    if (!this.#currentYearsRange) {
      const start = new Date();
      const end   = new Date();
      start.setFullYear(start.getFullYear() - 8);
      end.setFullYear(end.getFullYear() + 7);
      this.#currentYearsRange = [start.getFullYear(), end.getFullYear()];
    }
  }

  #nextYears()
  {
    const start = new Date();
    start.setFullYear(this.#currentYearsRange[1] + 1);
    const end = DatePicker.#cloneDate(start);
    end.setFullYear(start.getFullYear() + 15);
    this.#currentYearsRange = [start.getFullYear(), end.getFullYear()];
    this.#updateYearsSelectorUi();
  }

  #prevYears()
  {
    const start = new Date();
    start.setFullYear(this.#currentYearsRange[0] - 16);
    const end = DatePicker.#cloneDate(start);
    end.setFullYear(start.getFullYear() + 15);
    this.#currentYearsRange = [start.getFullYear(), end.getFullYear()];
    this.#updateYearsSelectorUi();
  }

  #nextYear()
  {
    this.#dateInOperation.setFullYear(this.#dateInOperation.getFullYear() + 1);
    this.#updateMonthsSelectorUi();
  }

  #prevYear()
  {
    this.#dateInOperation.setFullYear(this.#dateInOperation.getFullYear() - 1);
    this.#updateMonthsSelectorUi();
  }

  #updateYearsSelectorUi()
  {
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_YEARS} .${DatePicker.#ELEMENT_SELECTORS.HEADER_YEARS_RANGE}`).innerHTML = `${this.#currentYearsRange[0]} - ${this.#currentYearsRange[1]}`;
    this.#initYearCells();
  }

  #updateMonthsSelectorUi()
  {
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MONTHS} .${DatePicker.#ELEMENT_SELECTORS.HEADER_SELECTED_YEAR}`).innerHTML = `${this.#dateInOperation.getFullYear()}`;
    this.#initMonthCells();
  }

  #initYearCells()
  {
    const body  = this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_YEARS} .${DatePicker.#ELEMENT_SELECTORS.BODY}`);
    const cells = [];
    let index   = 0;

    body.innerHTML = '';

    for (let year = this.#currentYearsRange[0]; year <= this.#currentYearsRange[1]; year++, index++) {
      const cell        = this.#document.createElement('div');
      cell.innerHTML    = `${year}`;
      cell.dataset.year = `${year}`;
      cell.classList.add(
        DatePicker.#ELEMENT_SELECTORS.CELL,
        DatePicker.#ELEMENT_SELECTORS.DELAY + '-' + index,
        DatePicker.#ELEMENT_SELECTORS.HIDDEN,
      );
      if (year === this.#selectedDate.getFullYear()) {
        cell.classList.add(DatePicker.#ELEMENT_SELECTORS.ACTIVE);
      }
      cell.addEventListener('click', this.#yearSelected.bind(this));
      body.appendChild(cell);
      cells.push(cell);
    }

    this.#yearCells = cells;

    if (this.#containerOpened()) {
      setTimeout(() => {
        this.#showAllYearCells();
      });
    }
  }

  #initMonthCells()
  {
    const body  = this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MONTHS} .${DatePicker.#ELEMENT_SELECTORS.BODY}`);
    const cells = [];
    let index   = 0;

    body.innerHTML = '';

    for (let month = 1; month <= 12; month++, index++) {
      const cell         = this.#document.createElement('div');
      cell.innerHTML     = `${month}月`;
      cell.dataset.month = `${month}`;
      cell.classList.add(
        DatePicker.#ELEMENT_SELECTORS.CELL,
        DatePicker.#ELEMENT_SELECTORS.DELAY + '-' + index,
        DatePicker.#ELEMENT_SELECTORS.HIDDEN,
      );
      if (this.#selectedDate.getFullYear() === this.#dateInOperation.getFullYear() && this.#selectedDate.getMonth() + 1 === month) {
        cell.classList.add(DatePicker.#ELEMENT_SELECTORS.ACTIVE);
      }
      cell.addEventListener('click', this.#monthSelected.bind(this));
      body.appendChild(cell);
      cells.push(cell);
    }

    this.#monthCells = cells;

    if (this.#containerOpened()) {
      setTimeout(() => {
        this.#showAllMonthCells();
      });
    }
  }

  #yearSelected(event)
  {
    const year = event.target.dataset.year;
    this.#dateInOperation.setFullYear(year);
    this.#showMonthSelector();
  }

  #monthSelected(event)
  {
    const month = event.target.dataset.month;
    this.#dateInOperation.setMonth(month - 1);
    this.#showDateSelector();
  }

  #hideMainView()
  {
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN}`).classList.add(DatePicker.#ELEMENT_SELECTORS.HIDDEN);
  }

  #showMainView()
  {
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MAIN}`).classList.remove(DatePicker.#ELEMENT_SELECTORS.HIDDEN);
  }

  #hideYearsView()
  {
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_YEARS}`).classList.add(DatePicker.#ELEMENT_SELECTORS.HIDDEN);
  }

  #showYearsView()
  {
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_YEARS}`).classList.remove(DatePicker.#ELEMENT_SELECTORS.HIDDEN);
  }

  #hideMonthsView()
  {
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MONTHS}`).classList.add(DatePicker.#ELEMENT_SELECTORS.HIDDEN);
  }

  #showMonthsView()
  {
    this.#container.querySelector(`.${DatePicker.#ELEMENT_SELECTORS.VIEW_MONTHS}`).classList.remove(DatePicker.#ELEMENT_SELECTORS.HIDDEN);
  }

  static #getCellType(cellIndex)
  {
    switch (true) {
      case cellIndex === 0:
        return DatePicker.#CELL_TYPES.BLANK;
      case cellIndex > 0 && cellIndex <= 7:
        return DatePicker.#CELL_TYPES.DAY;
      case cellIndex % 8 === 0:
        return DatePicker.#CELL_TYPES.WEEK_NUMBER;
      default:
        return DatePicker.#CELL_TYPES.DATE;
    }
  }

  static #resolveDay(cellIndex)
  {
    return DatePicker.#DAYS[cellIndex - 1];
  }

  static #closest(target, selector)
  {
    target = target.parentElement;
    if (!target) {
      return null;
    }

    if (target.classList.contains(selector)) {
      return target;
    }

    return DatePicker.#closest(target, selector);
  }

  static #cloneDate(date)
  {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  static #format(date)
  {
    return `${date.getFullYear()}-${DatePicker.#zeroPadding(date.getMonth() + 1)}-${DatePicker.#zeroPadding(date.getDate())}`
  }

  static #zeroPadding(number)
  {
    return ('00' + number).slice(-2);
  }

  static #getTemplate()
  {
    return `
<div class="ts-calendar">
  <div class="ts-view-main">
    <div class="ts-calendar-header">
      <div class="ts-header-prev">
        <button type="button" class="ts-prev">&laquo;</button>
      </div>
      <div class="ts-header-year-month">
        <div class="ts-header-text">
          <span class="ts-header-year"><span class="ts-text"><!-- Dynamic --></span></span><small>年</small>
          <span class="ts-header-month"><span class="ts-text"><!-- Dynamic --></span></span><small>月</small>
        </div>
      </div>
      <div class="ts-header-next">
        <button type="button" class="ts-next">&raquo;</button>
      </div>
    </div>
    <div class="ts-calendar-body">
      <!-- Dynamic -->
    </div>
  </div>
  <div class="ts-view-years">
    <div class="ts-calendar-header">
      <div class="ts-header-prev">
        <button type="button" class="ts-prev">&laquo;</button>
      </div>
      <div class="ts-header-year-month">
        <div class="ts-header-text">
          <span class="ts-header-years-range"><!-- Dynamic --></span>
        </div>
      </div>
      <div class="ts-header-next">
        <button type="button" class="ts-next">&raquo;</button>
      </div>
    </div>
    <div class="ts-calendar-body">
      <!-- Dynamic -->
    </div>
  </div>
  <div class="ts-view-months">
    <div class="ts-calendar-header">
      <div class="ts-header-prev">
        <button type="button" class="ts-prev">&laquo;</button>
      </div>
      <div class="ts-header-year-month">
        <div class="ts-header-text">
          <span class="ts-header-selected-year"><!-- Dynamic --></span>
        </div>
      </div>
      <div class="ts-header-next">
        <button type="button" class="ts-next">&raquo;</button>
      </div>
    </div>
    <div class="ts-calendar-body">
      <!-- Dynamic -->
    </div>
  </div>
</div>
`;
  }
}
