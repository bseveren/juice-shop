export class NoteController extends BaseController.Api<unknown> {
  public tableName = "business_note";
  protected database: Services["mongodb"];
  constructor({ serverConfigs, services, workers }: IRouteInitialisation) {
    super(serverConfigs, services, workers, [], true, "notes");
    this.database = this.services.mongodb;
  }

  public async createOne(
    request: IHapiRequest,
    reply: Hapi.ResponseToolkit
  ): Promise<Boom.Boom | Hapi.ResponseObject> {
    try {
      const { error, value } = createSchema.validate(
        {
          ...request.payload,
          internalUserId: request.auth.credentials.userId,
        },
        { allowUnknown: false }
      );
      if (error) {
        return Boom.badRequest(error.message);
      }
      const admin = await this.database.InternalAdminUser.findOne({
        internalUserId: value.internalUserId,
      });
      if (!admin) {
        return Boom.badRequest("Unknown internal admin");
      }
    } catch (err) {
      return Boom.badRequest(err);
    }
  }
}
