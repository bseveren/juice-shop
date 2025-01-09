import { ImplantLibraryService } from "./implant-library.service";

@Resolver(() => ImplantLibrary)
export class ImplantLibraryResolver {
  constructor(private readonly implantLibraryService: ImplantLibraryService) {}

  @AllowAnonymous()
  @CustomResponse()
  @Query(() => GetPublishedImplantLibrariesResponseDto, {
    name: "publishedImplantLibrariesForFO",
  })
  async getImplantLibraryTypes(
    @Args("companyId") companyId: string,
    @Args("implantName") implantName: string
  ): Promise<GetPublishedImplantLibrariesResponseDto> {
    return this.implantLibraryService.getPublishedImplantLibraries(
      companyId,
      implantName
    );
  }

  @AllowAnonymous()
  @CustomResponse()
  @Query(() => ResponseGetPublishedImplantLibraryCompanyDto, {
    name: "companies",
  })
  async getImplantLibraryCompanies(): Promise<ResponseGetPublishedImplantLibraryCompanyDto> {
    return this.implantLibraryService.getPublishedImplantLibraryCompanyList();
  }
}
