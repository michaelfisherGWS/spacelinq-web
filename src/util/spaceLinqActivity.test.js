import {
  activityPeriodFor,
  activityTemplateCsv,
  parseActivityCsv,
  parseCsv,
  summariseActivity,
} from './spaceLinqActivity';

const rateCard = [
  { key: 'receiving-pallet', label: 'Receiving and put-away' },
  { key: 'labour-hour', label: 'Labour for other work' },
];

describe('spaceLinqActivity', () => {
  it('reads quoted cells, other separators and Windows line endings', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ]);
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('')).toEqual([]);
  });

  it('reads activity lines with the columns in any order', () => {
    const { lines, error } = parseActivityCsv(
      'Quantity,Service,Date,Reference\n12,receiving-pallet,2026-10-05,PO 77\n"1,250.5",labour-hour,31/10/2026,'
    );
    expect(error).toBeNull();
    expect(lines).toEqual([
      {
        row: 2,
        date: '2026-10-05',
        rawDate: '2026-10-05',
        service: 'receiving-pallet',
        quantity: 12,
        reference: 'PO 77',
        note: '',
      },
      {
        row: 3,
        date: '2026-10-31',
        rawDate: '31/10/2026',
        service: 'labour-hour',
        quantity: 1250.5,
        reference: '',
        note: '',
      },
    ]);
  });

  it('explains a file it cannot use', () => {
    expect(parseActivityCsv('').error).toEqual('empty');
    expect(parseActivityCsv('item,amount\nx,1').error).toEqual('no-header');
  });

  it('bills the month before the payment', () => {
    expect(activityPeriodFor(new Date('2026-11-23T00:00:00.000Z'))).toEqual({
      from: '2026-10-23',
      to: '2026-11-23',
    });
    expect(activityPeriodFor(null)).toBeNull();
  });

  it('adds lines up per service, matching by key or label', () => {
    const { lines } = parseActivityCsv(
      [
        'date,service,quantity',
        '2026-10-25,receiving-pallet,10',
        '2026-11-01,Receiving and put-away,2.5',
        ',labour-hour,1.25',
        '2026-11-23,receiving-pallet,99',
        '2026-10-22,receiving-pallet,99',
        '2026-11-02,carton-pick,5',
        '2026-11-02,labour-hour,-1',
        '31/02/2026,labour-hour,1',
      ].join('\n')
    );
    const period = { from: '2026-10-23', to: '2026-11-23' };
    expect(summariseActivity(lines, rateCard, period)).toEqual({
      quantities: { 'receiving-pallet': 12.5, 'labour-hour': 1.25 },
      counted: 3,
      skipped: [
        { row: 5, service: 'receiving-pallet', reason: 'outside-period' },
        { row: 6, service: 'receiving-pallet', reason: 'outside-period' },
        { row: 7, service: 'carton-pick', reason: 'unknown-service' },
        { row: 8, service: 'labour-hour', reason: 'bad-quantity' },
        { row: 9, service: 'labour-hour', reason: 'bad-date' },
      ],
    });
  });

  it('makes a starter file from the rate card', () => {
    expect(activityTemplateCsv(rateCard, '2026-10-31')).toEqual(
      'date,service,quantity,reference,note\n2026-10-31,receiving-pallet,0,,\n2026-10-31,labour-hour,0,,'
    );
  });
});
