const { getSdk, handleError } = require('../api-util/sdk');
const { isConfirmed, unseal } = require('../api-util/spaceLinqOrderRecord');

/**
 * SpaceLinq: the company name of a business customer.
 *
 * It is stored sealed on the booking, so a provider cannot read it while the
 * booking is only a request. This endpoint opens it for the two parties of the
 * booking (nobody else can load the booking) once the booking is confirmed.
 */
const customerCompany = (req, res) => {
  const { transactionId } = req.body || {};
  if (!transactionId?.uuid) {
    return res.status(400).json({ error: 'transactionId is required' });
  }

  const sdk = getSdk(req, res);
  sdk.transactions
    .show({ id: transactionId })
    .then(response => {
      const { protectedData, transitions } = response.data.data.attributes;
      const sealed = protectedData?.customerCompanySealed;
      if (!sealed) {
        return res.status(200).json({ isBusiness: false, companyName: null });
      }
      const details = isConfirmed(transitions) ? unseal(sealed) : null;
      return res.status(200).json({ isBusiness: true, companyName: details?.companyName || null });
    })
    .catch(e => {
      handleError(res, e);
    });
};

module.exports = customerCompany;
