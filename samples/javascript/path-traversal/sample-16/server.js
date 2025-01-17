const fs = require('fs');
const path = require('path');
const prpl = require('prpl-server');
const express = require('express');

const environment = process.env.APP_ENV || 'development';
const analyticsId = process.env.GOOGLE_TRACKING_ID;
const tagManagerId = process.env.GOOGLE_TAG_MANAGER_ID;
const firebaseApiKey = process.env.FIREBASE_API_KEY;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseAppId = process.env.FIREBASE_APP_ID;
const firebaseMeasurementId = process.env.FIREBASE_MEASUREMENT_ID;
const leanplumAppId = process.env.LEANPLUM_APP_ID;
const leanplumEnvId = process.env.LEANPLUM_ENV_ID;
const bugsnagId = process.env.BUGSNAG_ID;
const facebookPixelId = process.env.FACEBOOK_PIXEL_ID;
const yandexMetricaId = process.env.YANDEX_METRICA_ID;

const port = process.env.PORT || 8080;
const app = express();
const helmet = require('helmet');

app.use(helmet({
  xssFilter: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use((req, res, next) => {
  if (req.url.indexOf('.js') > -1 || req.url.indexOf('/assets') > -1 || req.url.indexOf('/vendor') > -1 || req.url.indexOf('site.webmanifest') > -1) {
    const resolvedPath = path.resolve(`${__dirname}/dist${decodeURI(req.url)}`);
    if (resolvedPath.includes('../') || resolvedPath.includes('..\\')) {
      return next(new Error('Invalid file path'));
    }
    res.sendFile(resolvedPath, err => {
      if (err?.name === 'NotFoundError') {
        next();
      } else if (err) {
        next(err);
      }
    });
  } else if (req.url.indexOf('/api') > -1) {
    next();
  } else if (req.url.indexOf('/health') === 0) {
    res.sendStatus(200);
  } else {
    fs.readFile(path.join(__dirname, 'dist/index.html'), 'utf8', (err, data) => {
      if (err) {
        res.sendStatus(404);
      } else {
        data = data.replace('APP_ENV', environment);
        data = data.replace('GOOGLE_TRACKING_ID', analyticsId);
        data = data.replace('GOOGLE_TAG_MANAGER_ID', tagManagerId);
        data = data.replace('FIREBASE_API_KEY', firebaseApiKey);
        data = data.replace('FIREBASE_PROJECT_ID', firebaseProjectId);
        data = data.replace('FIREBASE_APP_ID', firebaseAppId);
        data = data.replace('FIREBASE_MEASUREMENT_ID', firebaseMeasurementId);
        data = data.replace('LEANPLUM_APP_ID', leanplumAppId);
        data = data.replace('LEANPLUM_ENV_ID', leanplumEnvId);
        data = data.replace('BUGSNAG_ID', bugsnagId);
        data = data.replace(/FACEBOOK_PIXEL_ID/g, facebookPixelId);
        data = data.replace(/YANDEX_METRICA_ID/g, yandexMetricaId);
        res.set('Cache-Control', 'no-cache, proxy-revalidate, max-age=0');
        res.send(data);
      }
    });
  }
});
