const execInDir = (cwd: string) => {
    return async (cmd: string): Promise<string> => {
        try {
            if (verbose) cmd += ' --verbose';
            const label = `\x1b[1mcd ${cwd} && ${cmd}\x1b[0m`;
            console.time(label);
            return new Promise((resolve) => {
                const options = {
                    encoding: 'utf8',
                    cwd,
                };
                exec(cmd, options, (err, stdout, stderr) => {
                    if (err) {
                        console.error(err);
                        console.timeEnd(label);
                        exit(1);
                    }
                    console.timeEnd(label);
                    resolve(stdout || stderr);
                });
            });
        } catch (e) {
            console.warn(
                `ERR: in dir: ${cwd}\n...when executing: ${cmd}\n...encountered exception: ${e}`,
            );
            exit(1);
        }
    };
};

const execInStepFnDir = async <T>(
    stepFn: TStepFn,
    f: (exec: ReturnType<typeof execInDir>) => Promise<T>,
): Promise<T> => {
    const dir = getStepFnPath(stepFn);
    if (!existsSync(path.join(dir, 'node_modules'))) await execInDir(dir)('npm i');
    if (!existsSync(path.join(dir, 'build'))) await execInDir(dir)('tsc');
    return await f(execInDir(dir));
};

const run = async () => {
    /**
     * This block allows using (semi legacy) integrationKey
     * without having to check the database
     */
    let clientId = -1;
    if (!isInteger(clientIdFromUser)) {
        const getClients = await backendApi.clients.getClients({
            integrationKey: [clientIdFromUser],
        });
        const clients = getClients.data.data;
        if (!Array.isArray(clients) || clients.length !== 1) {
            console.log(`Error :: could not find client w/ integrationKey=${clientIdFromUser}`);
            return;
        }
        clientId = clients[0].id;
    } else {
        clientId = Number(clientIdFromUser);
    }
    if (clientId < 1) {
        console.log(`Error :: could not find client w/ clientId=${clientIdFromUser}`);
        return;
    }
    const client = await backendApiGetClient(clientId, [1, 'hours']);
    if (typeof client === 'string') {
        console.log(client);
        return;
    }
    const system = client?.system;
    if (!system || !systemToStepFn[system]) {
        console.log(`ERR: getClient returned bad/no result object`);
        exit(1);
    }

    const stepFnNames = <const>[
        'c-decide-if-predict',
        '1-append-invoice',
        '2-predict',
        '2-b-consolidate-predictions',
        '3-write-to-database',
    ];
    // prettier-ignore
    const extraCommands: string[][] = [
        [],
        [],
        [
            '--saveInputToTests :: to save the input of each preprocessor to _trash/',
            '--echoLambdaInput  :: to save the AWS Lambda input(s) to _trash/',
            '--showStart        :: to beatifully show what we have at the start',
            '--showPredictions  :: to beatifully show what we have at the end',
        ],
        [],
        []
    ];

    const invoiceIds = String(invoiceId).split(',');
    if (until === -1) {
        console.log(
            `next command would be:\n\t\x1b[1mcd '${getStepFnPath(
                systemToStepFn[system],
            )}' && ${invoiceIds
                .map((iid) =>
                    [
                        `node build/tests/timemachine --isTest --invoiceId='${iid}' --clientId='${clientId}'`,
                        mockTs ? ` --mockTimestamp='${mockTs}'` : ` --useFirst`,
                        arbitraryUser ? arbitraryUser : '',
                    ].join(' '),
                )
                .join(' && ')}\x1b[0m`,
        );
        return;
    }

    const files = await Promise.all(
        invoiceIds.map(async (iid_: String | number) => {
            const iid = iid_;
            const file = await execInStepFnDir(systemToStepFn[system], async (exec) => {
                const res = await exec(
                    [
                        `node build/tests/timemachine --isTest --invoiceId='${iid}' --clientId='${clientId}'`,
                        mockTs ? ` --mockTimestamp='${mockTs}'` : ` --useFirst`,
                        arbitraryUser ? arbitraryUser : '',
                    ].join(' '),
                );

                /**
                 * The file name per se doesn't actually change;
                 * this catches "error" statuses, as the step functions don't output the line on failure
                 */
                const file = res.match(/^\s*write to\s+(?:.+\/)?(.+)\.json\s*$/m)?.[1];
                if (!file) {
                    console.warn(`ERR: unexpected output from timemachine:\n${res}`);
                    exit(1);
                }

                if (verbose) console.log(res);

                return file;
            });
            for (const stepFn of stepFnNames.slice(0, until)) {
                await execInStepFnDir(stepFn, async (exec) => {
                    const res = await exec(
                        [
                            `node build/tests/handler --forcePassLocal --fileToTest='${file}'`,
                            arbitraryUser ? arbitraryUser : '',
                        ].join(' '),
                    );
                    if (verbose) console.log(res);
                });
            }
            return file;
        }),
    );

    console.log(
        `next command would be:\n\t\x1b[1mcd '${getStepFnPath(stepFnNames[until])}' && ${files
            .map((x) =>
                [
                    `node build/tests/handler --fileToTest='${x}' --isTest`,
                    arbitraryUser ? arbitraryUser : '',
                ].join(' '),
            )
            .join(' && ')}\x1b[0m`,
    );
    if (extraCommands[until].length) {
        console.log(`\nYou may provide one of the extra commands below:\n`);
        console.log(extraCommands[until].map((s) => `\t${s}`).join('\n'));
    }
};
if (require.main === module) {
    run();
}
