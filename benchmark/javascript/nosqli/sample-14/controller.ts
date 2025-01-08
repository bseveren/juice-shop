export default class GoalProductsController extends BaseController.Mongo<IGoalProductDocument> {
  public globalController: GlobalGoalProductsController;
  constructor({ server, serverConfigs, services, workers }: IRouteInitialisation) {
    super(
      serverConfigs,
      services,
      workers,
      services.mongo.GoalProductModel,
      [],
      true,
      "goal_products"
    );
    this.globalController = new GlobalGoalProductsController({
      server,
      serverConfigs,
      services,
      workers,
    });
  }

  public async getOneById(
    request: IHapiRequest<IGoalProductDocument>,
    reply: Hapi.ResponseToolkit
  ) {
    try {
      const id = request.params.id;
      const record = await this.primaryModel
        .findOne({ _id: id }, undefined, { comment: DISABLE_AUTO_TRANSLATE_COMMENT })
        .lean();
      if (!record) {
        return Boom.notFound();
      }
      const usersCount = await this.services.mongo.GoalParticipationModel.countDocuments({
        goal: new ObjectId(request.params.id),
        status: { $in: [UserEventStatus.ACTIVE, UserEventStatus.COMPLETED] },
      });
      const hasParticipants = usersCount > 0;
      return this.mapRecord({
        ...record,
        hasParticipants,
      });
    } catch (e) {
      return Boom.badRequest(e);
    }
  }
}
