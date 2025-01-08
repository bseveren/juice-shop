export class PlayerTrainingResultsConsumer
  extends ConsumerBase
  implements Consumer
{
  private facilities: Snapshot<Facility> = {};

  private isSendCertificateMessageEnabled = false;

  private sqsClient: SQSClient = new SQSClient();

  private readonly consumerName = 'player_module_training_stats';

  private globalMarketId: mongo.ObjectId | undefined;

  get name(): string {
    return this.consumerName;
  }

  get consumerBatchSize(): number {
    return 1000;
  }

  get topics(): ConsumerTopic[] {
    return [
      { topic: Topic.Facilities },
      { topic: Topic.TrainingSessions, consumeAfter: Topic.Facilities },
    ];
  }

  async init(): Promise<void> {
    this.isSendCertificateMessageEnabled =
      process.env.SQS_SEND_MESSAGE_ENABLED === '1';
    if (this.isSendCertificateMessageEnabled) {
      this.sqsClient = new SQSClient({
        region: process.env.AWS_REGION,
        endpoint: process.env.AWS_ENDPOINT,
        useQueueUrlAsEndpoint: false,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
    }

    const globalMarket = await MarketModel.findOne({
      name: 'global',
    });

    this.globalMarketId = globalMarket?._id;

    this.facilities = await this.getSnapshot<Facility>(Topic.Facilities);
  }

  async consume(
    messages: Message<TrainingSession | Facility>[],
    { tx, replaying = false }: { tx?: ClientSession; replaying?: boolean },
  ): Promise<void> {
    const [{ partition, topic }] = messages;

    switch (topic) {
      case Topic.TrainingSessions:
        {
          const messagesByPlayer = groupBy(
            messages as Message<TrainingSession>[],
            (message) => {
              const playerUniqueId = getPlayerUniqueId({
                playerId: message.value.player.id,
                gender: message.value.player.gender,
                jobLevel: message.value.player.jobLevel,
              });

              return playerUniqueId;
            },
          );

          const programIds = [
            ...new Set(
              (messages as Message<TrainingSession>[]).map(
                (msg) => msg.value.appId,
              ),
            ),
          ];

          const playerIds = Object.keys(messagesByPlayer);

          const playerTrainingResults =
            await PlayerModuleTrainingResultModel.find({
              playerId: { $in: playerIds },
            }).lean();

          const quizzesMetadata = await QuizzesMetadataModel.find({
            programId: { $in: programIds },
          }).lean();

          const operations: Array<any> = [];

          for (const [id, messagesByPlayerId] of Object.entries(
            messagesByPlayer,
          )) {
            operations.push(
              ...(await this.handleMessagesByPlayerId({
                messagesByPlayerId,
                partition,

  private async getCertificateConfigurationByBrand(
    facilityId: string,
    programId: string,
    questionsVersion: number,
  ): Promise<(CertificateConfiguration & { brandName?: string }) | null> {
    const qrCode = await QRCodeModel.findOne({
      factoryId: facilityId.toString(),
      'config.trainingSeriesList': {
        $elemMatch: {
          programId,
          version: `v${questionsVersion}`,
        },
      },
    });

    const config = qrCode?.config.trainingSeriesList.find(
      (series) =>
        series.programId === programId &&
        series.version === `v${questionsVersion}`,
    );

    if (config?.brands && config.brands.length === 1) {
      const brand = await BrandModel.findOne({
        _id: new mongo.ObjectId(config.brands[0]),
      });

      if (!brand) {
        return null;
      }

      const certificateConfig = await CertificateConfigurationModel.findOne({
        brandId: new mongo.ObjectId(brand._id),
        programIds: programId,
      });

      if (certificateConfig?.certificateDesign) {
        return { ...certificateConfig, brandName: brand.name };
      }
    }

    return null;
  }
