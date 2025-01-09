export default class SellersAPIController extends BaseController {
  @post("/sellers", {
    auth: {
      strategies: [VIAuthStrategy.jwt, VIAuthStrategy.orgApiKey],
    },
    description: "Create a Seller",
    payload: SellerValidator.createSellerModel,
    tags,
  })
  @response(201)
  public async createSeller(request: CustomRequest, reply: Hapi.ResponseToolkit) {
    if (!request.auth.credentials.admin) {
      if (request.auth.credentials.type === AuthCredentialsType.api) {
        request.payload.orgId = request.auth.credentials.orgId
      }

      if (request.payload.owner) {
        return Boom.forbidden("You are not allowed to set an owner")
      }

      if (!request.payload.orgId) {
        return Boom.badRequest("No orgId provided")
      }

      if (
        !request.auth.permissionChecker.hasPermission({
          type: PermissionType.OrgAccess,
          scope: request.payload.orgId,
        })
      ) {
        return Boom.unauthorized("Missing permission for organization with id " + request.payload.orgId)
      }
    }

    const newSeller: ISeller = request.payload

    if (newSeller.locationCountry !== "DE" || newSeller.orgId) {
      if (!newSeller.posSettings) {
        newSeller.posSettings = {} as IPosSettings
      }

      newSeller.posSettings.fiscalization = false
    }

    if (newSeller.orgId) {
      newSeller.owner = undefined
      newSeller.supportSettings = {
        managedBy: SupportManagement.Seller,
      }
    } else if (!newSeller.owner) {
      newSeller.owner = Owner.***_GMBH
    }

    const Seller: ISeller = await this.database.sellerModel.create(newSeller)
    Seller.url = Utils.string_to_slug(Seller.name) + "-" + Random.lowerCaseAlphaNum(4)
    await Seller.save()
    EventBus.shared.sellerCreated(Seller)

    request.auditLog({
      event: "sellers.created",
      severity: "MEDIUM",
      sellerId: null,
      orgId: Seller.orgId,
      actions: [
        {
          resource: "seller",
          action: "create",
          after: Seller,
        },
      ],
    })

    return reply.response(Seller).code(201)
  }

  @put("/sellers/{id}", {
    auth: {
      strategies: [VIAuthStrategy.jwt, VIAuthStrategy.orgApiKey],
    },
    description: "Update a Seller",
    params: Joi.object({
      id: Joi.string().required(),
    }),
    payload: SellerValidator.updateSellerModel,
    tags,
  })
  @response(200)
  @response(403)
  @response(404)
  public async updateSeller(request: CustomRequest) {
    const id = request.params["id"]

    let Seller = await this.database.sellerModel.findById(id)
    if (!Seller) {
      if (request.auth.credentials.admin) {
        return Boom.notFound()
      } else {
        return Boom.forbidden()
      }
    }

  public async getSellerByMe(request: CustomRequest) {
    let sellerId = request.auth.credentials.id
    const orgId = request.auth.credentials.orgId

    let user: IUser | undefined
    if (request.auth.credentials.me) {
      user = redactUser(request.auth.credentials.me) as IUser
    }

    const promises = []

    const pos: IPOS = request.auth.credentials.pos
    if (pos) {
      sellerId = request.auth.credentials.pos.sellerId.toString()
    }

    let seller: ISeller
    let sellerOrganization: IOrganization
    if (sellerId) {
      promises.push(
        this.database.sellerModel.findOne({_id: sellerId}).then((sellerData) => {
          seller = sellerData
          if (seller.orgId) {
            return this.database.organizationModel.findOne({_id: seller.orgId}).then((sO) => (sellerOrganization = sO))
          }
        }),
      )
    }

    let organization: IOrganization
    if (orgId) {
      promises.push(this.database.organizationModel.findOne({_id: orgId}).then((res) => (organization = res)))
    }

    let orgAccessableSellerIds: string[]
    promises.push(
      new OrganizationAccessManager(this.database)
        .getAccessibleSellerIds([
          ...request.auth.permissionChecker.getAllPermissionScopesOfType(PermissionType.OrgAccess),
        ])
        .then((ids) => (orgAccessableSellerIds = ids)),
    )

    await Promise.all(promises)

    const result = {
      ...(seller && {seller: JSON.parse(JSON.stringify(seller))}),
      ...(organization && {
        organization: {
          _id: organization._id,
          name: organization.name,
          image: organization.image,
        },
      }),
      me: user,
      orgAccessableSellerIds,
    }

    if (sellerOrganization) {
      result.seller.organization = {
        _id: sellerOrganization._id,
        name: sellerOrganization.name,
      }
    }

    return result
  }
