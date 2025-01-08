import { raw, Router }  from 'express';

import { logger } from '../services/LoggingService';
import {  receiveWebhookEvent } from '../services/stripeWebhook';
import { sanitizeParams } from '../utils/validators';

export const webhookRouter = Router({});

// Utility function to sanitize headers
const sanitizeHeader = (header: string | undefined): string => {
  return header ? sanitizeParams({ header }).header : '';
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
webhookRouter.post('/', raw({ type: 'application/json' }), async (_req, res, _next) => {
  try {
    const sig = sanitizeHeader(_req.get('stripe-signature'));
    await receiveWebhookEvent(_req.body, sig);
    res.status(200).send('OK');
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});
