const { pickCancellable } = require('./spacelinq-give-notice');

const tx = (id, agreementId, lastTransition) => ({
  id: { uuid: id },
  attributes: { lastTransition, protectedData: { agreementId } },
  relationships: { booking: { data: { id: { uuid: `b-${id}` } } } },
});
const booking = (id, start) => ({ type: 'booking', id: { uuid: `b-${id}` }, attributes: { start } });

describe('SpaceLinq give notice', () => {
  const now = new Date(Date.UTC(2027, 0, 20));
  const transactions = [
    tx('m2', 'A', 'transition/auto-payment'),
    tx('m3', 'A', 'transition/accept'),
    tx('m4', 'A', 'transition/accept'),
    tx('m5', 'A', 'transition/update-charges'),
    tx('other', 'B', 'transition/accept'),
    tx('m6', 'A', 'transition/customer-cancel'),
  ];
  const included = [
    booking('m2', new Date(Date.UTC(2027, 0, 15))),
    booking('m3', new Date(Date.UTC(2027, 1, 15))),
    booking('m4', new Date(Date.UTC(2027, 2, 15))),
    booking('m5', new Date(Date.UTC(2027, 3, 15))),
    booking('other', new Date(Date.UTC(2027, 3, 15))),
    booking('m6', new Date(Date.UTC(2027, 4, 15))),
  ];

  it('cancels only scheduled months of this booking that start after the notice period', () => {
    const result = pickCancellable(transactions, included, 'A', now);
    // m3 starts 15 Feb, inside one month of 20 Jan, so it stays
    expect(result.map(i => i.id.uuid)).toEqual(['m4', 'm5']);
    expect(result[0].start).toEqual(new Date(Date.UTC(2027, 2, 15)));
  });

  it('cancels nothing when no month starts after the notice period', () => {
    expect(pickCancellable(transactions, included, 'A', new Date(Date.UTC(2027, 3, 1)))).toEqual([]);
  });
});
