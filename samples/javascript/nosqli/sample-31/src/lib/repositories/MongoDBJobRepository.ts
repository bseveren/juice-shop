@injectable()
export class MongoDBJobRepository
  implements IJobLister, IJobReader, IJobWriter
{
  async delete(jobKey: JobKey): Promise<boolean> {
    const updatedDoc = await JobModel.findOneAndUpdate(
      { channelAccountId: jobKey.channelAccountId, mailId: jobKey.mailId },
      { deletedAt: new Date() },
      { new: true },
    )
    return !!updatedDoc
  }
  async listJobs(
    portal: Portal,
    limit: number,
    range: { after?: string | undefined; before?: string | undefined },
  ): Promise<EmailJobsList> {
    const filterCondition = {
      portal,
      deletedAt: null,
    }

    const query = JobModel.find().where(filterCondition).limit(limit)

    const before = deserializeCursorKey(range.before ?? null)
    const after = deserializeCursorKey(range.after ?? null)

    if (before) {
      query.where({ receivedAt: { $gt: before } }).sort({ receivedAt: 1 })
    } else if (after) {
      query.where({ receivedAt: { $lt: after } }).sort({ receivedAt: -1 })
    } else {
      query.sort({ receivedAt: -1 })
    }

    const jobs = await query.lean<JobDocument[]>({ virtuals: true })
    if (before) {
      jobs.reverse()
    }

    const lastKey = jobs.at(-1)?.receivedAt
    const firstKey = jobs.at(0)?.receivedAt

    const hasNextPage =
      lastKey &&
      !!(await JobModel.findOne({
        ...filterCondition,
        receivedAt: { $lt: lastKey },
      }))

    const hasPreviousPage =
      firstKey &&
      !!(await JobModel.findOne({
        ...filterCondition,
        receivedAt: { $gt: firstKey },
      }))

    const statistics = await this.getStatistics(portal)

    return {
      ...statistics,
      items: jobs,
      ...(hasNextPage && { lastKey: serializeCursorKey(lastKey) }),
      ...(hasPreviousPage && { firstKey: serializeCursorKey(firstKey) }),
    }
  }

  async getJobWithMailId(mailId: string): Promise<EmailJob | undefined> {
    const jobDocument = await JobModel.findOne({ mailId }).lean<JobDocument>({
      virtuals: true,
    })
    return jobDocument ?? undefined
  }
  async getOne(jobKey: JobKey): Promise<EmailJob | undefined> {
    const jobDocument = await JobModel.findOne({
      channelAccountId: jobKey.channelAccountId,
      mailId: jobKey.mailId,
    }).lean<JobDocument>({
      virtuals: true,
    })
    return jobDocument ?? undefined
  }

  async save(job: EmailJob): Promise<void> {
    await JobModel.create(job)
  }

  async updateStatus(
    jobKey: JobKey,
    status:
      | JobStatus.Failed
      | JobStatus.Rejected
      | JobStatus.Succeeded
      | JobStatus.Retrying,
    processingResult?: ParseEmailResult,
  ): Promise<void> {
    type StatusTimestamp = "failedAt" | "succeededAt" | "retriedAt"
    let timestampFieldForStatus: keyof Pick<JobDocument, StatusTimestamp>

    switch (status) {
      case JobStatus.Failed:
      case JobStatus.Rejected:
        timestampFieldForStatus = "failedAt"
