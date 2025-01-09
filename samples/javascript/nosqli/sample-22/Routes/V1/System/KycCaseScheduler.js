const express = require("express");
const router = express.Router();

/** lib */
const { errors } = require("@***/error");

/** Dao */
const KycCaseDao = require("../../../Daos/KycCaseDao");

/**
 * This route is used for the case scheduler to check company and people for changes
 * @path '/v1/system/schedular/case'
 * @param {object} req
 * @param {object} res
 * @returns {object}
 */
module.exports = router.get("/system/schedular/case", async (req, res) => {
  if (req.user && req.user.email !== "foo@bar.com") {
    throw errors.UNAUTHORIZED("Wrong user");
  }

  // send response
  try {
    res.json(await KycCaseDao.getOneKycCaseForScheduler());
  } catch (err) {
    throw errors.NOT_FOUND("Case not found!");
  }
});
