@Injectable()
export class S3UploadMessageHandlerService {
  constructor(
    private readonly alsService: AsyncLocalStorage<ExecutionContextDto>,
    private readonly documentsService: DocumentsService,
    @InjectRepository(Extraction)
    private readonly extractionRepository: Repository<Extraction>,
    private readonly logger: StructuredLoggerService,
    private readonly sensibleService: SensibleService,
  ) {
    this.logger.setLogScope(S3UploadMessageHandlerService.name);
  }

  /**
   * The message handler returns a single record by configuration, so we always
   * will want to grab the first one.
   * @param body
   * @returns SqsRecord
   */
  #parseBody(body: string): SqsRecord {
    try {
      const parsedBody: { Records: SqsRecord[] } = JSON.parse(body);
      return parsedBody.Records[0];
    } catch (e) {
      this.logger.error('Unable to parse message body', {
        meta: { function: this.#parseBody.name },
        error: e,
        context: {
          body,
        },
      });
      throw e;
    }
  }

  // Could create a decorator for this, but since we only use it in this context I'm
  // keeping it simple for now. If we need to use this elsewhere, we can refactor.
  async #runWithContext(next: () => Promise<void> | void) {
    const store = this.alsService.getStore() ?? new ExecutionContextDto();
    await this.alsService.run(store, async () => {
      await next();
    });
  }

  async #handleMessage(message: Message) {
    performance.clearMarks();
    performance.clearMeasures();
    performance.mark('message-processing-start');

    const record: SqsRecord = this.#parseBody(message.Body);
    const s3Key = parseS3Key(record.s3.object.key);
    const bucketName = record.s3.bucket.name;

    performance.mark('preprocessing-finished');
    performance.measure(
      'preprocessing',
      'message-processing-start',
      'preprocessing-finished',
    );

    this.logger.info('Beginning message processing', {
      meta: { function: this.handleMessage.name },
      context: {
        bucketName,
        s3Key,
      },
    });
    const objectBuffer = await this.documentsService.getObject(
      bucketName,
      s3Key,
    );

    performance.mark('get-object-finished');
    performance.measure(
      'get-object',
      'preprocessing-finished',
      'get-object-finished',
    );

    const submissionId = record.s3.object.key.split('/')?.[0];
    const fileName = parsePropertiesFromKey(s3Key).fileName;

    // This is a long running process. The s3 retry timeout for acknowledging the message is 60 seconds.
    // Setting this to 50 to allow for some buffer.
    let documentType: string;
    try {
      documentType = await promiseTimeout(
        this.sensibleService.classify(objectBuffer),
        50_000,
      );
    } catch (e) {
      const extraction = new Extraction();
      extraction.submissionId = submissionId;
      extraction.originatingFileName = fileName;

      if (e instanceof TimeoutError) {
        this.logger.error('Classification timed out', {
          meta: { function: this.handleMessage.name },
          context: {
            bucketName,
            s3Key,
          },
        });
        extraction.status = ExtractionStatus.TIMEOUT;
      } else {
        this.logger.error('Error classifying document', {
          meta: { function: this.handleMessage.name },
          error: e,
          context: {
            bucketName,
            s3Key,
          },
        });
        extraction.status = ExtractionStatus.FAILED;
      }

      await this.extractionRepository.save(extraction);
      return;
    }

    performance.mark('classification-finished');
    performance.measure(
      'classification',
      'get-object-finished',
      'classification-finished',
    );

    const hasAppliedExtractionsToSubmission =
      !!(await this.extractionRepository.findOne({
        where: {
          submissionId,
          status: ExtractionStatus.APPLIED,
        },
      }));

    performance.mark('found-applied-extractions');
    performance.measure(
      'found-applied-extractions',
      'classification-finished',
      'found-applied-extractions',
    );

    if (hasAppliedExtractionsToSubmission) {
      this.logger.info(
