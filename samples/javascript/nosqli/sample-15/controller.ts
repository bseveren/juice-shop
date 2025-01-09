export default class LevelSlotTemplateController extends BaseController.Mongo<ILevelSlotTemplateDocument> {
  public async getOneById(request: IHapiRequest): Promise<Boom.Boom | Hapi.ResponseObject> {
    try {
      const id = request.params.id;
      const record = await this.services.mongo.LevelSlotTemplateModel.findOne({ id }, undefined, {
        comment: DISABLE_AUTO_TRANSLATE_COMMENT,
      }).lean();
      if (!record) {
        return Boom.notFound();
      }
      return await this.mapRecord({ ...record, _id: undefined, id: record.id });
    } catch (e) {
      return Boom.badRequest(e);
    }
  }
}
