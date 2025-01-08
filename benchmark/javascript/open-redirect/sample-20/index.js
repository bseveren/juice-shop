import config from './config';
import * as path from 'path';
import _ from 'lodash';
import express from 'express';
import morgan from 'morgan';
import serialize from 'serialize-javascript';
import i18n from './i18n';
import localeDetection from './middleware/locale-detection';
import cookieParser from 'cookie-parser';
import * as MarketplaceAPI from './api/Marketplace';
import { getLocaleDataFromPath } from './util';
import url from 'url';

const debug = require('debug')('ssr:index');

const server = express();
server.use(morgan('combined'));
server.use(cookieParser());
server.use(localeDetection);
server.set('views', path.join(__dirname, 'views'));
server.set('view engine', 'ejs');

server.get('/manage/:reference?', (req, res) => {
  const translations = i18n.getTranslations(req.language);
  const translatedManageSlug = translations['common.slug.manage'];

  const reference = req.params.reference;
  if (reference) {
    const translatedSettingsSlug = translations['common.slug.settings'];
    return res.redirect(`/${req.locale}/${translatedManageSlug}/${translatedSettingsSlug}/${reference}`);
  }

  return res.redirect(`/${req.locale}/${translatedManageSlug}`);
});
