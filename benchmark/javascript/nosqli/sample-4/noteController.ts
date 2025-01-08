export class NoteController extends BaseController.Api<unknown> {
  public tableName = "business_note";
  protected database: Services["postgres"];
  protected queries: BusinessNotesQueries;
  constructor({ serverConfigs, services, workers }: IRouteInitialisation) {
    super(serverConfigs, services, workers, [], true, "notes");
    this.database = this.services.postgres;
    this.queries = new BusinessNotesQueries(this.services.postgres.Client);
  }

  public async deleteOneById(
    request: IHapiRequest,
    reply: Hapi.ResponseToolkit
  ): Promise<Boom.Boom | Hapi.ResponseObject> {
    try {
      const { id: businessNoteId } = request.params;
      const admin = await this.services.postgres.InternalAdminUser.findOne({
        internalUserId: request.auth.credentials.userId,
      });
      if (!admin) {
        return Boom.badRequest("Unknown internal admin");
      }
      const note = await this.services.postgres.BusinessNote.findOne({
        businessNoteId,
      });
      if (!note) {
        return Boom.badRequest("Invalid note");
      }
      if (note.internalUserId !== request.auth.credentials.userId) {
        return Boom.badRequest("Invalid user");
      }
    } catch (err) {
      return Boom.badRequest(err);
    }
  }
}
