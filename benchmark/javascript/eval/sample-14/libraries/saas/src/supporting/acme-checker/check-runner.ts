export const repeatedCheckRunner = async (
  config: { info: string; timeoutSec: number; retryIntervalSec: number },
  callback: () => Promise<CheckFunctionResult>
) => {
  const logInfoPrefix = config.info.padStart(20);

  //
  console.log(`${logInfoPrefix}: Starting repeated check`);

  const start = Date.now();
  let iteration = 1;

  while (true) {
    //callback
    const result = await callback();

    const elapsedSec = (Date.now() - start) / 1000;

    const log = `${logInfoPrefix}: Check ${iteration.toString().padStart(3)}: ${secondsNicePrint(elapsedSec).padStart(7)}: ${inspect(result.info, {
      colors: true,
      compact: true,
      breakLength: 1000,
    })}`;

    console.log(log);

    if (result.succeeded) return true;

    //timeout
    if (elapsedSec > config.timeoutSec) {
      console.log(`${logInfoPrefix}: Aborting - exceeded timeout`);
      break;
    }

    //sleep
    await setTimeout(config.retryIntervalSec * 1000);
    iteration++;
  }

  return false;
};
