async function sendMessagesTask(
    options: ProducerOptions,
    queue: Queue,
    queueService: SqsQueueService,
    signal: AbortSignal,
    bar: LogBar
) {
    for await (const cb of setInterval(
        calculateIntervalInMs(options.frequency),
        () => sendMessage(queue, options, queueService),
        { signal }
    )) {
        const messageResponse = await cb();
        bar.incCounter(LogCounter.SENT);
        messageSentCounter++;
        if (options.log) {
            logToFile(
                options.log,
                stringifyMessageResponse(messageResponse, options),
                options.resetLog ? false : true
            );
        }
    }
}

async function updateQueueStatsTask(
    queueService: SqsQueueService,
    queue: Queue,
    signal: AbortSignal,
    bar: LogBar
) {
    for await (const cb of setInterval(
        2000,
        () => queueService.getQueue(queue),
        {
            signal,
        }
    )) {
        const info = await cb();
        d(info);
        if (info.attrs && info.attrs.ApproximateNumberOfMessages) {
            bar.updateCounter(
                LogCounter.TOTAL,
                parseInt(info.attrs.ApproximateNumberOfMessages)
            );
        }
        if (info.attrs && info.attrs.ApproximateNumberOfMessagesNotVisible) {
            bar.updateCounter(
                LogCounter.HIDDEN,
                parseInt(info.attrs.ApproximateNumberOfMessagesNotVisible)
            );
        }
    }
}

producer
    .description("Produce messages in a queue")
    .summary("produce messages")
    .option("--queue <QUEUE>", "The queue URL where to create the messages")
    .addOption(
        new Option(
            "--body <TYPE>",
            "Specify the type of message body to generate"
        ).choices(Object.values(BodyType))
    )
    .option(
        "--fixed <CONTENT>",
        "The fixed content for the body when --body is set to fixed",
        ""
    )
    .option(
        "--frequency <FREQUENCY>",
        "Number of messages sent per second",
        parseFrequency,
        10
    )
    .option("--group-id <GROUP_ID>", "Specify the message group ID to use")
    .addOption(
        new Option(
            "--deduplication <DEDUPLICATION>",
            "Select the deduplication algorithm to use"
        ).choices(Object.values(DeduplicationStrategy))
    )
    .option(
        "--deduplication-id <DEDUPLICATION_ID>",
        "Specify the message deduplication ID to use"
    )
    .option("--fifo", "When creating a queue, create a FIFO one.", false)
    .option("--log <PATH>", "Log messages sent to file", "")
    .option("--reset-log", "Truncate messages log", false)
    .option(
        "--name <NAME>",
        "The name for this producer",
        faker.name.firstName()
    )
    .action(async (options: ProducerOptions) => {
        const bar = new LogBar(
            `P[${options.name}] ${options.groupId} `,
            Object.values(LogCounter)
        );
        const signal = setupGracefulShutdown(bar);

        const queueService = new SqsQueueService(new SQS({}));
        const queueFactory = new QueueFactory(queueService);

        const queue = await setupQueue(options, queueService, queueFactory);

        await Promise.all([
            sendMessagesTask(options, queue, queueService, signal, bar),
            updateQueueStatsTask(queueService, queue, signal, bar),
        ]);
    })
    .hook("preAction", (thisCommand: Command, actionCommand: Command) => {
        d("args %o", actionCommand.args);
        d("options %o", actionCommand.optsWithGlobals());
    });
