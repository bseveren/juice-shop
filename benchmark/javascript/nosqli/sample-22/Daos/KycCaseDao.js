module.exports.getOneKycCaseForScheduler = async () => {
  try {
    const queryDate = moment().subtract(1, "days");

    // get kyc case by id.
    const kyccase = await KycCase.findOne({
      isDeleted: false,
      lastSchedulerCheckLooked: null,
      $or: [
        { lastSchedulerCheck: null },
        { lastSchedulerCheck: { $lt: queryDate.toISOString() } },
      ],
    });

    if (kyccase && kyccase._id) {
      KycCaseService.updateById(kyccase._id, {
        lastSchedulerCheckLooked: new Date(),
      });
    }
    {
      return null;
    }
  } catch (err) {
    log.error("getOneKycCaseForScheduler", err);
    return null;
  }
};
