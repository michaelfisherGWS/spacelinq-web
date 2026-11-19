import {
  areBlockedPeriodsValid,
  validBlockedPeriods,
  blockedHoursFromFormValues,
  blockedHoursToFormValues,
  createSpaceLinqAvailabilityPlan,
  validBlockedHours,
} from './SpaceLinqAvailabilityForm';

const entriesFor = (plan, day) =>
  plan.entries.filter(e => e.dayOfWeek === day).map(e => [e.startTime, e.endTime, e.seats]);

describe('createSpaceLinqAvailabilityPlan', () => {
  it('is bookable all day, every day, without blocked hours', () => {
    const plan = createSpaceLinqAvailabilityPlan(6, 'Pacific/Auckland');
    expect(plan.entries).toHaveLength(7);
    expect(entriesFor(plan, 'mon')).toEqual([['00:00', '00:00', 6]]);
    expect(plan.timezone).toBe('Pacific/Auckland');
  });

  it('leaves out working hours on the chosen days', () => {
    const plan = createSpaceLinqAvailabilityPlan(10, 'Pacific/Auckland', {
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      from: '08:00',
      to: '17:00',
    });
    // Bookable before 8am and from 5pm to midnight
    expect(entriesFor(plan, 'wed')).toEqual([['00:00', '08:00', 10], ['17:00', '00:00', 10]]);
    // Weekends are untouched
    expect(entriesFor(plan, 'sat')).toEqual([['00:00', '00:00', 10]]);
    expect(plan.entries).toHaveLength(12);
  });

  it('handles blocks that start at midnight, end at midnight or cover the day', () => {
    const morning = createSpaceLinqAvailabilityPlan(1, 'Pacific/Auckland', {
      days: ['sun'],
      from: '00:00',
      to: '09:00',
    });
    expect(entriesFor(morning, 'sun')).toEqual([['09:00', '00:00', 1]]);

    const evening = createSpaceLinqAvailabilityPlan(1, 'Pacific/Auckland', {
      days: ['sun'],
      from: '18:00',
      to: '24:00',
    });
    expect(entriesFor(evening, 'sun')).toEqual([['00:00', '18:00', 1]]);

    const allDay = createSpaceLinqAvailabilityPlan(1, 'Pacific/Auckland', {
      days: ['sun'],
      from: '00:00',
      to: '24:00',
    });
    expect(entriesFor(allDay, 'sun')).toEqual([]);
    expect(allDay.entries).toHaveLength(6);
  });

  it('ignores a block that is not valid', () => {
    const plan = createSpaceLinqAvailabilityPlan(2, 'Pacific/Auckland', {
      days: ['mon'],
      from: '17:00',
      to: '08:00',
    });
    expect(entriesFor(plan, 'mon')).toEqual([['00:00', '00:00', 2]]);
  });
});

describe('blocked periods form values', () => {
  it('needs a day and an end after the start', () => {
    expect(validBlockedHours({ days: [], from: '08:00', to: '17:00' })).toBe(null);
    expect(validBlockedHours({ days: ['mon'], from: '09:00', to: '09:00' })).toBe(null);
    expect(validBlockedHours({ days: ['fri', 'mon', 'nope'], from: '08:00', to: '17:00' })).toEqual(
      { days: ['mon', 'fri'], from: '08:00', to: '17:00' }
    );
  });

  it('saves nothing when the space is bookable at any time', () => {
    const blocks = [{ days: ['mon'], from: '08:00', to: '17:00' }];
    expect(blockedHoursFromFormValues({ blockMode: 'any', blocks })).toBe(null);
    expect(blockedHoursFromFormValues({ blockMode: 'block', blocks })).toEqual(blocks);
  });

  it('suggests weekday working hours for a listing with no block yet', () => {
    expect(blockedHoursToFormValues(undefined)).toEqual({
      blockMode: 'any',
      blocks: [{ days: ['mon', 'tue', 'wed', 'thu', 'fri'], from: '08:00', to: '17:00' }],
    });
  });

  it('reads the single period saved by the first version', () => {
    const saved = { days: ['sat'], from: '10:00', to: '14:00' };
    expect(blockedHoursToFormValues(saved)).toEqual({ blockMode: 'block', blocks: [saved] });
  });

  it('refuses to save while any period on the form is incomplete', () => {
    const good = { days: ['mon'], from: '08:00', to: '17:00' };
    const bad = { days: [], from: '08:00', to: '12:00' };
    expect(areBlockedPeriodsValid({ blocks: [good] })).toBe(true);
    expect(areBlockedPeriodsValid({ blocks: [good, bad] })).toBe(false);
    expect(areBlockedPeriodsValid({ blocks: [] })).toBe(false);
  });
});

describe('several blocked periods', () => {
  const weekdays = { days: ['mon', 'tue', 'wed', 'thu', 'fri'], from: '08:00', to: '17:00' };
  const saturdayMorning = { days: ['sat'], from: '08:00', to: '12:00' };

  it('gives each day its own bookable hours', () => {
    const plan = createSpaceLinqAvailabilityPlan(3, 'Pacific/Auckland', [
      weekdays,
      saturdayMorning,
    ]);
    expect(entriesFor(plan, 'tue')).toEqual([['00:00', '08:00', 3], ['17:00', '00:00', 3]]);
    expect(entriesFor(plan, 'sat')).toEqual([['00:00', '08:00', 3], ['12:00', '00:00', 3]]);
    expect(entriesFor(plan, 'sun')).toEqual([['00:00', '00:00', 3]]);
  });

  it('merges periods that overlap or sit on the same day', () => {
    const plan = createSpaceLinqAvailabilityPlan(1, 'Pacific/Auckland', [
      { days: ['mon'], from: '08:00', to: '12:00' },
      { days: ['mon'], from: '10:00', to: '14:00' },
      { days: ['mon'], from: '20:00', to: '24:00' },
    ]);
    expect(entriesFor(plan, 'mon')).toEqual([['00:00', '08:00', 1], ['14:00', '20:00', 1]]);
  });

  it('keeps at most three periods', () => {
    const many = [weekdays, saturdayMorning, weekdays, saturdayMorning];
    expect(validBlockedPeriods(many)).toHaveLength(3);
  });
});

describe('whole-day blocks for space booked by the day', () => {
  it('blocks the chosen days entirely, whatever hours the form holds', () => {
    const blocks = blockedHoursFromFormValues(
      { blockMode: 'block', blocks: [{ days: ['mon', 'tue'], from: '08:00', to: '17:00' }] },
      true
    );
    expect(blocks).toEqual([{ days: ['mon', 'tue'], from: '00:00', to: '24:00' }]);
    const plan = createSpaceLinqAvailabilityPlan(4, 'Pacific/Auckland', blocks);
    expect(entriesFor(plan, 'mon')).toEqual([]);
    expect(entriesFor(plan, 'wed')).toEqual([['00:00', '00:00', 4]]);
  });
});
