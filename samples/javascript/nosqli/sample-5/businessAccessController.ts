export default class BusinessAccessController extends BaseController.Api<BusinessAccessDTO> {
  public tableName = "business_access";
  protected database: Services["postgres"];
  constructor({ serverConfigs, services, workers }: IRouteInitialisation) {
    super(serverConfigs, services, workers, [], true, "business_access_users");
  }
  @isAuthorised("read")
  public async getOneById(request: IHapiRequest) {
    try {
      const { BusinessAccess, BusinessAccessUser, BusinessTag } = this.services.postgres;
      const { id } = request.params;
      const ba = await BusinessAccess.findOne(id);
      if (!ba) {
        return Boom.notFound();
      }
      return ba;
    } catch (e) {
      return Boom.badRequest(e);
    }
  }

  public async deleteOneById(
    request: IHapiRequest
  ): Promise<Boom.Boom | Hapi.ResponseObject | boolean> {
    const { postgres: database } = this.services;
    try {
      const businessAccessId = request.params.id;
      const access = await database.BusinessAccess.findOne(businessAccessId);
      if (access.isOwner) {
        return Boom.badRequest("Can't delete owner access.");
      }
      const bau = await database.BusinessAccessUser.findOne({
        accountAccessId: access.accountAccessId,
      });
      const changeLogEntityType =
        BUSINESS_ACCESS_ROLE_TO_CHANGE_LOG_ENTITY_MAP[bau.accountAccessRole];
    } catch (e) {
      return Boom.badRequest(e);
    }
  }
}
