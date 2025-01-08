import { send as eventSend } from "../../Service/Events/send";

export const send = async (
  req: Request,
  res: Response,
): Promise<boolean | null> => {
  const {
    from,
    to,
    subject,
    templateID,
    templateData,
    caseId,
    personId,
    origin,
  } = req.body;

  const { user }: any = req;

  logger.info("Send email event", {
    from,
    to,
    subject,
    templateID,
    templateData,
    user,
    caseId,
    origin,
    personId,
  });

  const isEmailSuppressed = await checkEmailSuppressed(to);
  if (isEmailSuppressed) {
    logger.error(`Email is suppressed, email not sent => ${to}`);
    return false;
  }

  const eventToSend: SendEventRequestDto = {
    from: from,
    to: to,
    subject: subject,
    templateId: templateID,
    jobData: templateData,
    user: user,
    origin: origin,
    personId: personId,
  };

  const mailSent = await eventSend(eventToSend);

  if (mailSent === true) {
    return true;
  } else {
    return false;
  }
};
