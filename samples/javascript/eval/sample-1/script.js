const timeout = this.getTimeoutInMinutes(job) * 60 * 1000;

await Promise.race([
  job.getCallback(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Job timed out after ${timeout}ms`)), timeout)
  ),
]);
