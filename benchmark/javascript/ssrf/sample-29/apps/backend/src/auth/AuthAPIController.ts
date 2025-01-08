import DomainService from "../services/DomainService"

export class AuthAPIController extends BaseController {
  @post("/auth/exchange-token", {
    description: "Create an exchange token",
    payload: ExchangeTokenValidation.create,
    auth: AuthStrategy.hybrid,
    tags: ["auth"],
  })
  @response(200, ExchangeTokenResponseResource)
  public async createExchangeToken(request: CustomRequest): Promise<ExchangeTokenResponse> {
    const payload: ICreateExchangeTokenPayload = request.payload

    if (payload.resourceType === TokenResourceType.customer) {
      const customer = await this.database.customerModel.findOne({
        _id: payload.customerId,
        sellerId: request.auth.credentials.id,
      })

      if (!customer) {
        throw Boom.notFound("Customer not found")
      }
    } else if (payload.resourceType === TokenResourceType.user) {
      throw Boom.badRequest("Not implemented")
    }

    const exchangeToken = TokenFactory.exchangeToken({...payload})

    return {
      exchangeToken: exchangeToken,
      expiresIn: TokenFactory.expiresIn(exchangeToken),
    }
  }

  @post("/auth/token", {
    description: "Exchange a token",
    payload: AuthValidation.getToken,
    tags: ["auth"],
  })
  @response(200, TokenResponseResource)
  public async getToken(request: CustomRequest): Promise<TokenResponse> {
    const exchangeToken = request.payload.exchangeToken

    const verifiedToken = TokenFactory.verify<DecodedExchangeToken>(exchangeToken)
    if (!verifiedToken) {
      throw Boom.badRequest("Invalid token")
    }

    if (verifiedToken.resourceType === TokenResourceType.customer) {
      const customerToken = TokenFactory.forCustomer({_id: verifiedToken.customerId})
      return {
        token: customerToken,
        expiresIn: TokenFactory.expiresIn(customerToken),
      }
    } else if (verifiedToken.resourceType === TokenResourceType.user) {
      const userManager = new UserManager(this.database)
      const user = await userManager.findById(verifiedToken.userId)
      if (!user) throw Boom.unauthorized("User not found")

      const linkedSellerIds = await new UserAccessManager(this.database).getLinkedSellerIds(user)
      const userIsLinkedToSeller = !!verifiedToken.sellerId && linkedSellerIds.includes(verifiedToken.sellerId)

      if (!(user.isAdmin || userIsLinkedToSeller)) {
        throw Boom.unauthorized("User does not have access to seller")
      }

      // login
      user.lastLogin = new Date()
      user.sellerAccess = verifiedToken.sellerId ?? user.sellerAccess
      user.save()

      const userToken = TokenFactory.forUser(user)
      return {
        token: userToken,
        expiresIn: TokenFactory.expiresIn(userToken),
      }
    }

    throw Boom.badRequest("Not implemented yet")
  }

  private async getDashboardUrl(seller?: ISeller): Promise<string> {
    const defaultUrl = getDashboardUrl()
    if (!seller) return defaultUrl

    try {
      const sellerId = seller?._id?.toString()
      const orgId = seller?.orgId?.toString()
      if (!orgId || !sellerId) return defaultUrl

      const domain: Domains.DomainContext | null = await DomainService.fetchDashboardDomain({sellerId, orgId})
      return domain ? `https://${domain?.host}` : defaultUrl
    } catch (err: unknown) {
      log.error({err}, "Could not fetch domains")
      return defaultUrl
    }
  }
