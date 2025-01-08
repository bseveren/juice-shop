import {blockingCopy, blockingSpawn} from "./utils";

const init = async (ctx: Context) => {
    updateState()

    logger.info('Emptying the coder folder');
    for (const file of await fse.readdir(ctx.workspacePath)) {
        if (ctx.config.kennel.ignoreRemove.includes(file)) {
            continue
        }
        const p = path.join(ctx.workspacePath, file);
        if ((await fse.stat(p)).isDirectory()) {
            await fse.rm(p, { recursive: true, force: true });
        } else {
            await fse.unlink(p);
        }
    }

    const initializeResult = await initialize(
        ctx.workspacePath,
        ctx.lab,
        ctx.config.kennel.copyExtra({lab: ctx.lab, workspacePath: ctx.workspacePath})
        );

    return pipe(
        initializeResult,
        E.fold(
            (error) => {
                logger.error({error}, 'Failed to initialize kennel lab');
                pipe(ctx.res, BadRequest('Failed to initialize kennel lab'));
            },
            (_) => {
                pipe(ctx.res, Ok());
            }
        )
    );
}

const determineHandler = (url: URL): O.Option<RequestHandler> => {
    if (url.pathname === '/') return O.some(aliveness);
    if (url.pathname === '/keepalive') return O.some(keepalive);
    if (url.pathname === '/run') return O.some(run);
    if (url.pathname === '/tests') return O.some(listTests);
    if (url.pathname === '/init') return O.some(init);
    // if (url.pathname === '/init') return O.some(dyco.resources.init);
    if (url.pathname === '/files') return O.some(dyco.resources.files);
    if (url.pathname === '/patch') return O.some(dyco.resources.patch);
    return O.none;
}

export const initialize = async (workspacePath: string, lab: Lab, copyExtra: CopyDetails[]) => {
    const arrayToCopy: CopyDetails[] = [
        {source: `${lab.projectDirectory()}/.`, target: workspacePath, link: false},
        ...copyExtra,
    ]

    const copyCommandResults = pipe(
        arrayToCopy,
        A.map(blockingCopy),
    );

    const otherCommandResults = pipe(
        [
            blockingSpawn('git', ['config', '--global', '--add', 'safe.directory', workspacePath]),
            blockingSpawn('git', ['init'], {cwd: workspacePath}),
            blockingSpawn('git', ['add', '.'], {cwd: workspacePath}),
            blockingSpawn('git', ['commit', '-m', '"Initial commit"'], {cwd: workspacePath}),
        ],
    )

    return pipe(
        [...copyCommandResults, ...otherCommandResults],
        A.sequence(E.Applicative),
        E.map((_) => {}),
    )
}

export const server = async (config: EntrypointConfig) => {
    const projectsPath = config.projectsPath || process.env.PROJECTS_PATH || '/home/runner/testprojects';
    const workspacePath = config.workspacePath || process.env.WORKSPACE_PATH || '/home/coder/project';
    const challengeId = config.challengeId || process.env.CHALLENGE_ID;

    if (!existsSync(projectsPath)) {
        throw new Error('Projects path does not exist: ' + projectsPath)
    }
    if (!existsSync(workspacePath)) {
        throw new Error('Workspace path does not exist: ' + workspacePath)
    }
    

    if (!challengeId) {
        throw new Error('No challenge ID specified')
    }

    const labPool = await buildLabPool(projectsPath);
    if (!Object.keys(labPool).length) {
        throw new Error(`No labs found in ${projectsPath}`);
    }

    const lab = labPool[challengeId];
    if (!lab) {
        const labList = Object.entries(labPool)
            .sort(([a],[b]) => a.localeCompare(b))
            .map(([id,lab]) => `\n    ${id} @ ${lab.path}`)

        throw new Error(`Lab '${challengeId}' not found. These are the available labs: ${labList.join('')}`);
    }
    const copyExtra = config.copyExtra({lab, workspacePath});

    new Promise<void>((resolve, reject) => {
        try {
            config.startup({lab, workspacePath});
            resolve();
        } catch (error) {
            reject(error);
        }
    }).then(() => {
        logger.info('Startup hook finished. Testrunner is ready...')
        ready = true;
    });

    logger.info('Initialising environment');
    const initializeResult = await initialize(workspacePath, lab, copyExtra);

    if (E.isLeft(initializeResult)) {
        logger.error('Could not initialize the lab', initializeResult.left)
        throw initializeResult.left;
    } else {
        logger.info("Initialisation done!")
    }

    return createServer((req: IncomingMessage, res: ServerResponse) => {
            let context: Context = {
                req,
                res,
                config,
                lab,
                workspacePath,
                copyExtra,
            };

            pipe(
                O.fromNullable(req.url),
                O.map(u => new URL(u, `http://${req.headers.host}`)),
                O.chain(determineHandler),
                O.getOrElse(() => notFoundHandler)
            )(context);
        }
    );
};
