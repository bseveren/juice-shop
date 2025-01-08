import { Router } from '@awaitjs/express';
import csrf from 'csurf';
import url from 'url';
import Debug from 'debug';
import { timingSafeEqual } from 'crypto';

import { validateEmail } from '../validation/email.js';
import { validateNewPassword } from '../validation/password.js';

import env from '../config/env.js';
import {
  generateHash,
  getUserByLogin,
  getUserByToken,
} from '../lib/analyticsd/api.js';
import passwordHash from 'password-hash';
import { User } from '../types/user.js';

const debug = Debug('identity:routes:registration');

const router = Router();
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: env.session.sameSite,
    secure: env.session.secure,
  },
});

const padBuffer = (buffer: Buffer, length: number) => {
  return Buffer.concat([buffer, Buffer.alloc(length - buffer.length)]);
};

router.getAsync('/', csrfProtection, async function (req, res) {
  const query = url.parse(req.url, true).query;
  const token = String(query.token || '');

  debug({ method: req.method, path: req.path, token });

  const user: User = await getUserByToken(token);
  if (!user) {
    console.error(`registration error: user ${token} not found.`);
    return res.redirect('generate-token');
  }

  return res.render('registration', {
    action: 'registration',
    csrfToken: req.csrfToken(),
    email: user.email,
    token,
    config: { debug: env.isDevelopment },
  });
});

router.postAsync('/', csrfProtection, async function (req, res) {
  const { token, password } = req.body;
  let { email } = req.body;
  email = email?.toLowerCase();

  debug({ method: req.method, path: req.path, email, token, password });

  let valid, message;
  ({ valid, message } = validateEmail(email));
  if (!valid) {
    console.error(`registration error: ${message}.`);
    req.flash('error', 'Invalid registration');
    return res.redirect('error');
  }

  if (!token) {
    console.error('registration error: missing token.');
    req.flash('error', 'Invalid registration');
    return res.redirect('error');
  }

  ({ valid, message } = validateNewPassword(password, email));
  if (!valid) {
    return res.render('registration', {
      action: 'registration',
      csrfToken: req.csrfToken(),
      email,
      token,
      error: message,
      config: { debug: env.isDevelopment },
    });
  }

  let user: User | null = null;
  try {
    user = await getUserByLogin(email);
  } catch {
    //do nothing since we log error in the next code.
  }

  if (!user) {
    console.error(`registration error: user ${email} not found.`);
    req.flash('error', 'Invalid registration');
    return res.redirect('error');
  }

  if (user.token !== token) {
    console.error('registration error: invalid token.');
    req.flash('error', 'Invalid registration');
    return res.redirect('error');
  }

  const hashedPassword = passwordHash.generate(password, {
    saltLength: 8,
    iterations: 2048,
  });

  await generateHash(user.login, user.email, hashedPassword).catch((err) => {
    console.error(
      `registration error: can not generate hash for user ${err?.message}.`,
    );
  });

  return res.redirect(req.app.locals.dashboardUrl);
});
