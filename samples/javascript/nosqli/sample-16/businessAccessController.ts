export default class BusinessAccessUsersController extends BaseController.Api<IBusinessAccessUser> {
  public async transferAccess(request: IHapiRequest, reply: Hapi.ResponseToolkit) {
    const { id } = request.params;
    const { toAccountAccessId, businessAccountIds } = request.payload as TransferAccess;
    try {
      const fromBAU = await this.database.BusinessAccessUser.findOne({ accountAccessId: id }, null);
      if (!fromBAU) {
        return Boom.badRequest("From business access user does not exists");
      }
    } catch (err) {
      return Boom.badRequest(err);
    }
  }
}
