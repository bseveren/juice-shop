import * as _ from "lodash";
import express, { Request, Response } from "express";
const router = express.Router();

/** controller*/
import validate from "../../../lib/validate";
import { send } from "../../../Controller/Events/send";

/**
 * @param {object} req
 * @param {object} res
 * @returns {object}
 */
router.post("/events/send", async (req: Request, res: Response) => {
  // Validation is run to see if request matches the validation scheme
  validate(req.body, {
    type: "object",
    properties: {
      from: { type: "string", format: "email" },
      to: { type: "string", format: "email" },
      origin: { type: "string" },
      subject: { type: "string", format: "nonEmptyOrBlank" },
      templateID: { type: "string", format: "nonEmptyOrBlank" },
      templateData: { type: "object" },
      caseId: { type: "string", format: "mongoId" },
      personId: { type: "string", format: "mongoId" },
    },
    required: ["from", "to", "subject", "templateID", "templateData"],
    additionalProperties: false,
  });

  let caseId;

  if (!_.isNil(req.body.caseId)) {
    caseId = req.body.caseId;
  }

  const sendMailStatus = await send(req, res);

  if (sendMailStatus) {
    res.send({
      status: `Email was sent !`,
    });
  } else {
    res.send({
      status: "Email did not send",
    });
  }
});
