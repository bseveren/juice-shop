import express from 'express';
import { json } from 'body-parser';
import logger from 'pino';

const log = logger({
  formatters: {
    level (label:unknown, number:unknown) {
      return { level: number, severity: label }
    }
  }
});

import { getDefenceMode, setDefenceMode } from './aws';

const port = process.env.APP_PORT || 3000;
const hookSecret = process.env.APP_HOOK_SECRET || 'some-auth-hook-key';
const apiSecret = process.env.APP_API_SECRET || 'some-auth-api-key';

const app = express();

app.use(json());

type Request = {
  header(name: string): string | undefined
}

interface Response {
  status(code: number): this
  send(body: string): this
}

function authorize(req: Request, res: Response, secret: string) {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    log.error('request received without authorization header');
    res.status(401).send('unauthorized');
    return false;
  }

  if (authHeader !== secret) {
    log.error('incorrect authorization header provided');
    res.status(401).send('unauthorized');
    return false;
  }

  return true
}

app.post('/hook', async (req, res) => {
  if (!authorize(req, res, hookSecret)) { return }

  log.info('received webhook', { body: req.body });

  try {
    const output = await setDefenceMode(true);
    log.info('command ran successfully', { output });
  } catch (err) {
    log.error(err, 'could not execute command');
  }

  res.send('ok');
})
