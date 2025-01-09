export const blockingSpawn = (command: string, args: string[], options?: SpawnSyncOptions): E.Either<Error, SpawnSyncReturns<string>> => {
    logger.debug({ cmd: command, args: args, options }, `Spawning command '${command}'`)

    const r = spawnSync(command, args, {
        ...options,
        encoding: 'utf-8',
    })

    logger.debug(r, `Command finished ('${command}')`);

    return r.error ? E.left(r.error) : E.right(r);
}
