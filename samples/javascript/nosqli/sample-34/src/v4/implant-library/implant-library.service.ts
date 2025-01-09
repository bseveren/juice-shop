import { ImplantLibraryRepository } from "./implant-library.repository";

@Injectable()
export class ImplantLibraryService {
  constructor(
    private readonly implantLibraryRepository: ImplantLibraryRepository,
    private readonly fileBucketService: FileBucketService
  ) {}

  async getPublishedImplantLibraryCompanyList(): Promise<ResponseGetPublishedImplantLibraryCompanyDto> {
    const implantLibraries =
      await this.implantLibraryRepository.getPublishedImplantLibraryDocuments();

    const companyInfos = implantLibraries.map((doc) => {
      const implantNameList = this.extractImplantNameList(doc);
      return CompanyInfo.of(doc.id, doc.companyName, implantNameList);
    });

    return new ResponseGetPublishedImplantLibraryCompanyDto(companyInfos);
  }

  async getPublishedImplantLibraries(
    companyId: string,
    implantName: string
  ): Promise<GetPublishedImplantLibrariesResponseDto> {
    const foundImplantLibrary =
      await this.implantLibraryRepository.getImplantTypeLibrary(
        convertStringToObjectId(companyId)
      );

    const targetImplant = foundImplantLibrary.implant.find(
      (implant) => implant.displayName === implantName
    );

    if (!targetImplant) {
      throw new BadRequestException("Not found implant");
    }

    const responseDtoWithoutImplantTypes =
      GetPublishedImplantLibrariesResponseDto.of(
        foundImplantLibrary.id,
        targetImplant.displayName,
        targetImplant.axisOcclusal
      );

    const getFileBucketIdsFromDocument =
      this.collectFileBucketIdsFromDocument(targetImplant);

    const getFileInfo = await this.fileBucketService.getFileBucketIdsMetaData(
      getFileBucketIdsFromDocument.filter((bucketId) => bucketId !== null)
    );

    responseDtoWithoutImplantTypes.implantTypes =
      this.getResponseImplantTypesDto(targetImplant, getFileInfo);

    return responseDtoWithoutImplantTypes;
  }

  private extractImplantNameList(
    foundImplantLibrary: ImplantLibraryDocument
  ): ImplantName[] {
    return foundImplantLibrary.implant.map(
      (implant) => new ImplantName(implant.displayName)
    );
  }

  private collectFileBucketIdsFromDocument(implant: Implant): Types.ObjectId[] {
    const createFileResponseDto: Types.ObjectId[] = [];
    implant.implantTypes.forEach((implantType) => {
      if (implantType.markerFileBucketId) {
        createFileResponseDto.push(implantType.markerFileBucketId);
      }
      implantType.subtypes.forEach((subtype) => {
        if (subtype.markerFileBucketId) {
          createFileResponseDto.push(subtype.markerFileBucketId);
        }
        if (subtype.interfaceFileBucketId) {
          createFileResponseDto.push(subtype.interfaceFileBucketId);
        }
        createFileResponseDto.push(subtype.supportFileBucketId);
      });
    });
    return createFileResponseDto;
  }

  private getResponseImplantTypesDto(
    targetImplant: Implant,
    fileBucketsMetaData: FileBucketMetaData[]
  ): ResponseImplantTypeDto[] {
    return targetImplant.implantTypes.map((implantType) => {
      const foundFileBucketMetaData = fileBucketsMetaData.find((el) =>
        implantType.markerFileBucketId?.equals(el.fileBucketId)
      );

      const markerFileName = foundFileBucketMetaData
        ? foundFileBucketMetaData.fileName
        : null;
      const markerFilePath = foundFileBucketMetaData
        ? foundFileBucketMetaData.filePath
        : null;

      const type = ResponseImplantTypeDto.createWithMarkerFile(
        implantType,
