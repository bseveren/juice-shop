export const roomsRouter = createTRPCRouter({
  moveSectionToStage: organisationProcedure.input(moveNodeToStageSchema).mutation(async ({ ctx, input }) => {
    const room = await ctx.queryBuilder
      .selectFrom("rooms")
      .where("id", "=", input.roomId)
      .where("organisationId", "=", ctx.session.user.organisationId)
      .select(["id"])
      .executeTakeFirst();
    if (!room) throw new TRPCError({ code: "NOT_FOUND" });
    const stage = await ctx.queryBuilder
      .selectFrom("room_stages as stage")
      .where("stage.roomId", "=", input.roomId)
      .where("stage.id", "=", input.newStageId)
      .leftJoin("room_documents as document", (join) =>
        join.onRef("document.roomId", "=", "stage.roomId").onRef("document.stageId", "=", "stage.id")
      )
      .selectAll("stage")
      .select(["document.data as documentData", "document.id as documentId"])
      .executeTakeFirst();
    if (!stage || !stage.documentId) throw new TRPCError({ code: "NOT_FOUND", message: "STAGE_NOT_FOUND" });

    await axios.post(
      `http${env.NEXT_PUBLIC_ACME_URL?.slice(2)}/organisations/${ctx.session.user.organisationId}/section`,
      { roomId: input.roomId, stageId: input.newStageId, nodeJson: input.nodeJson },
      { headers: { "Content-Type": "application/json", Authorization: env.NEXTAUTH_SECRET } }
    );

    if (input.nodeJson.attrs.syncedSectionId) {
      const existingSectionInstance = await ctx.queryBuilder
        .selectFrom("saved_section_instances as instance")
        .where("instance.organisationId", "=", ctx.session.user.organisationId)
        .where("instance.roomId", "=", input.roomId)
        .where("instance.componentId", "=", input.nodeJson.attrs.id)
        .select(["id"])
        .executeTakeFirst();
      if (!!existingSectionInstance) {
        await ctx.db.savedSectionInstance.update({
          where: { id: existingSectionInstance.id },
          data: { stageId: input.newStageId },
        });
      }
    }

    const foundCrmEntityList = input.nodeJson.content.find((c: any) => c.type === "crmentitylist");
    if (!!foundCrmEntityList) {
      const existingView = await ctx.queryBuilder
        .selectFrom("crm_entity_view")
        .where("organisationId", "=", ctx.session.user.organisationId)
        .where("componentId", "=", foundCrmEntityList.attrs?.id)
        .where("roomId", "=", input.roomId)
        .selectAll()
        .executeTakeFirst();
      if (!existingView) return;
      await ctx.db.crmEntityView.update({ where: { id: existingView.id }, data: { stageId: input.newStageId } });
    }
  }),
