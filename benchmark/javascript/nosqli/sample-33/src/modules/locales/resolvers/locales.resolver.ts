import { LocalesService } from '../services/locales.service'

@Resolver(() => Locale)
export class LocalesResolver {
	constructor(private readonly localesService: LocalesService) {}

	@GqlRoleAuth([USER_ROLES.ADMIN])
	@Query(() => [Locale], { name: 'availableLocales' })
	@LogAndMonitoring('T2')
	async getLocales(@UserContextData() _moderator: User): Promise<Locale[]> {
		return this.localesService.getAvailableLocales()
	}

	@GqlRoleAuth([USER_ROLES.ADMIN])
	@Query(() => ISOLocales, { name: 'availableISOLanguages' })
	@LogAndMonitoring('T2')
	async getISOLocales(
		@UserContextData() _moderator: User,
	): Promise<ISOLocales> {
		return this.localesService.getISOLocales()
	}

	@Query(() => [Locale], { name: 'allSupportedLocales' })
	@LogAndMonitoring('T2')
	async getSupportedLocales(
		@UserContextData() _moderator: User,
	): Promise<Locale[]> {
		return this.localesService.getSupportedLocales()
	}

	@GqlRoleAuth([USER_ROLES.ADMIN])
	@Mutation(() => Locale, { name: 'addNewLocale' })
	@LogAndMonitoring('T2')
	async createLocale(
		@Args('locale') locale: LocaleDto,
		@UserContextData() _moderator: User,
	): Promise<Locale> {
		return this.localesService.addNewLocale(locale)
	}

	@GqlRoleAuth([USER_ROLES.ADMIN])
	@Mutation(() => Boolean, { name: 'deleteLocale', nullable: true })
	@LogAndMonitoring('T2')
	async deleteLocale(
		@Args('locale') locale: LocaleIdentity,
		@UserContextData() _moderator: User,
	): Promise<boolean> {
		return this.localesService.removeLocale(locale)
	}

	@GqlRoleAuth([USER_ROLES.ADMIN])
	@Mutation(() => Locale, { name: 'updateLocale' })
	@LogAndMonitoring('T2')
	async updateLocale(
		@Args('locale')
		locale: LocaleDto,
		@UserContextData() _moderator: User,
	): Promise<Locale> {
		return this.localesService.updateLocale(locale)
	}
}
