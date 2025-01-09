import { Optional } from "@***hq/lang-extensions"
import { UniqueIdentifier } from "@***hq/zod-commons"
import { z } from "zod"

import { Abilities } from "../../../../domains"
import {
  OrganizationRepository,
  OrganizationRepositoryToken,
} from "../../../../domains/users/organization"
import { authenticatedWithAccessProcedure } from "../../server.trpc"

import {
  ActivitiesSLARepositoryToken,
  ActivitiesSLARepository,
} from "~/core/revenue/diagnostic/app-core/ports"

export const getActivitiesSLA = authenticatedWithAccessProcedure
  .input(
    z.object({
      organizationId: UniqueIdentifier,
      funnelId: z.string(),
      functionId: z.string(),
    }),
  )
  .query(async ({ input, ctx: { container } }) => {
    const activitiesSLARepository = container.resolve<ActivitiesSLARepository>(
      ActivitiesSLARepositoryToken,
    )

    const abilities = container.resolve(Abilities)
    const organizationRepository = container.resolve<OrganizationRepository>(
      OrganizationRepositoryToken,
    )

    const organization = Optional.from(
      await organizationRepository.findOne(input.organizationId),
    ).getOrThrow()

    abilities.authorize("read", organization)

    const entity = await activitiesSLARepository.findOne({
      organizationId: organization.id,
      funnelId: input.funnelId,
      functionId: input.functionId,
    })

    abilities.authorize("read", entity)

    if (!entity) {
      return null
    }

    return {
      id: entity.id,
      funnelId: entity.funnelId,
      functionId: entity.functionId,
      organizationId: entity.organizationId,
      keyActivityTargets: entity.keyActivityTargets.map((kat) => {
        return {
          activityType: kat.activityType,
          highCount: kat.highCount,
          avgCount: kat.avgCount,
          lowCount: kat.lowCount,
          timeEnd: kat.timeEnd.toNumber(),
          timeStart: kat.timeStart.toNumber(),
        }
      }),
    }
  })
