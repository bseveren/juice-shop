@Injectable()
export class LocalesService {
	private logger = new Logger(LocalesService.name)
	constructor(private localeRepository: LocaleRepository) {}

	async addNewLocale(request: LocaleDto): Promise<Locale> {
		return this.localeRepository.save(request)
	}

	async updateLocale(request: LocaleDto): Promise<Locale> {
		await this.localeRepository.update(request.code, { title: request.title })
		return this.localeRepository.findOneOrFail({
			where: { code: request.code },
		})
	}

	async removeLocale(localeIdentity: LocaleIdentity): Promise<boolean> {
		const locale = await this.localeRepository.findOne({
			where: { code: localeIdentity.code },
		})
		if (!locale) {
			throw new Error('Locale already deleted')
		}
		try {
			const result = await this.localeRepository.delete(locale)
			return !!result
		} catch (error) {
			this.logger.error(`Locale already in use. Details: ${error}`)
			throw new Error('Locale already in use')
		}
	}

	async getAvailableLocales(): Promise<Locale[]> {
		return this.localeRepository.find({})
	}

	async getISOLocales(): Promise<ISOLocales> {
		return {
			locales: isoLanguages,
		}
	}

	async getSupportedLocales(): Promise<Locale[]> {
		const data = isoLanguages
		const result: Locale[] = []
		for (const langKey in data) {
			const localeView = new Locale()
			localeView.code = langKey
			localeView.title = data[langKey]
			result.push(localeView)
		}

		return result
	}
}
