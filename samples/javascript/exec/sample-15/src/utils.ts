export const blockingSpawn = (command: string, args: string[], options?: SpawnSyncOptions): E.Either<Error, SpawnSyncReturns<string>> => {
    logger.debug({ cmd: command, args: args, options }, `Spawning command '${command}'`)

    const r = spawnSync(command, args, {
        ...options,
        encoding: 'utf-8',
    })

    logger.debug(r, `Command finished ('${command}')`);

    return r.error ? E.left(r.error) : E.right(r);
}

export const blockingCopy = (copyDetails: CopyDetails) => {
    if (copyDetails.link) {
        console.log('linking', copyDetails)
        return blockingSpawn('ln', ['-sf', copyDetails.source, copyDetails.target]);
    } else {
        console.log('copying', copyDetails)
        return blockingSpawn('cp', ['-R', copyDetails.source, copyDetails.target]);
    }
}
