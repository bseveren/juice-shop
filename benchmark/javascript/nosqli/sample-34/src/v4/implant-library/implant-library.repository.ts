@Injectable()
export class ImplantLibraryRepository {
  constructor(
    @InjectModel(ImplantLibrary.name, MongooseConnection.CloudDatabase)
    private implantLibraryModel: Model<ImplantLibraryDocument>
  ) {}

  async getImplantTypeLibrary(
    companyId: Types.ObjectId
  ): Promise<ImplantLibraryDocument> {
    const foundDocument = await this.implantLibraryModel
      .findOne({
        _id: companyId,
        lifecycle: { $eq: ImplantLibraryLifecycle.PUBLISHED },
      })
      .exec();
    if (foundDocument) {
      return foundDocument;
    }

    throw new BusinessException(
      ErrorCodeImplantLibrary.IMPLANT_LIBRARY_NOT_FOUND,
      `해당 회사( ${companyId}) Implant Library가 존재하지 않습니다.`
    );
  }

  async getPublishedImplantLibraryDocuments() {
    return this.implantLibraryModel.find({
      lifecycle: { $eq: ImplantLibraryLifecycle.PUBLISHED },
    });
  }
}
