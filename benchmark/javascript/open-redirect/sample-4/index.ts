import logger from './lib/logger';
import { updateAllEnvironments } from './updateAllEnvironments';

config();

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production';
            DRY_RUN?: string;
            PORT?: string;
            PWD: string;
            SLACK_TOKEN: string;
            ENVIRONMENTCHANNELMANAGER_URL: string;
            SQLINSTANCES_URL: string;
            SQLINSTANCES_SECRET: string;
            SNAPSHOT_PATH?: string;
        }
    }
}

const app = express();
const port = process.env.PORT || 3000;

const cronEveryMinute = '*/1 * * * *';
const cronNever = '0 0 29 2 1';

const cronSchedule = (function () {
    if (!!process.env.ENVBOT_CRON) {
        logger.info("Schedule is set to '%s'", process.env.ENVBOT_CRON);
        return process.env.ENVBOT_CRON;
    }

    logger.warn('Forgot to specify schedule');
    if (isDevelopment()) {
        return cronEveryMinute;
    }

    return cronNever;
})();

if (cronSchedule === cronNever) {
    logger.info('Skipping cron job completely');
} else {
    cron.schedule(cronSchedule, async function () {
        try {
            const start = new Date();
            logger.info('CRON: Triggered %o...', start);
            await updateAllEnvironments(false);
            logger.info('CRON: Update complete after %d seconds', (new Date().getTime() - start.getTime()) / 1000);
        } catch (e) {
            logger.error('CRON: Error %o', e);
        }
    });
}

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/state', async (_, res) => {
    if (!existsSync(snapshotFile)) {
        logger.warn('Missing snapshot file %s', snapshotFile);

        return res.status(404).send('Snapshot file not found');
    }

    const state = await readFile(snapshotFile, {
        encoding: 'utf8',
    });

    res.setHeader('content-type', 'application/json');
    res.send(state);
});

app.get('/health/live', (_, res) => {
    return res.status(200).send('OK');
});
app.get('/health/ready', (_, res) => {
    return res.status(200).send('OK');
});

app.get('/admin/update', async (req, res) => {
    res.status(200).send(`
    <html> 
        <head>
            <title>Force update</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sakura.css/css/sakura.css" type="text/css">
        </head>
        <body>
            <h1>Force update</h1>
            <form action="/admin/update?force=true" method="post">
                <input type="input" name="env" placeholder="Environment">
                <input type="submit" value="Force update">
            </form>
        </body>
    </html>`);
});

app.post('/admin/update', async (req, res) => {
    // check if forcing the update
    const force = req.query.force === 'true';
    const env = req.body?.env ?? z.coerce.string().default('').parse(req.query.env);
    await updateAllEnvironments(force, env);
    res.redirect(`/admin/update?status=success&env=${env}`);
});
