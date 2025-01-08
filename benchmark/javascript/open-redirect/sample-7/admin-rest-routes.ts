export const internalAdminRestRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.get("/internal/admin/api/auth/status", async (request, reply) => {
    try {
      const decoded = await getDecodedTokenFromHeaders(request);
      if (!decoded.sub)
        return reply.status(401).send({ error: "Invalid token" });
      const user = await commonPrismaClient.adminUser.findUnique({
        where: { id: decoded.sub },
      });
      if (!user) return reply.status(401).send({ error: "Invalid token" });
      return reply.status(200).send({ message: "Logged in", user });
    } catch (error) {
      console.log("Error authing", error);
      return reply.status(401).send({ error });
    }
  });

  fastify.post(
    "/internal/admin/api/auth/login",
    async (
      request: FastifyRequest<{
        Body: { returnTo: string };
      }>,
      reply,
    ) => {
      const returnTo = request.body.returnTo;
      if (!returnTo) {
        console.error("No returnTo", returnTo);
        return reply.status(400).send({ error: "No returnTo" });
      }

      try {
        const url = getWorkosAuthUrl({ state: returnTo });
        return reply.send({ url });
      } catch (error) {
        console.log("Error getting authorization url", error);
        return reply.status(401).send({ error });
      }
    },
  );

  fastify.get(
    "/internal/admin/api/auth/callback",
    async (
      request: FastifyRequest<{
        Querystring: { code?: string; state: string };
      }>,
      reply,
    ) => {
      try {
        const code = request.query.code || "";
        const result = await getProfileAndToken(code);
        const returnTo = request.query.state;
        if (!returnTo) return reply.status(401).send({ error: "No returnTo" });
        if (!validateProfile(result))
          return reply.status(401).send({ error: "Invalid organization" });

        assert(
          result.profile.organizationId,
          "WorkOS user must have organization ID",
        );
        let user = await commonPrismaClient.adminUser.findUnique({
          where: { workosId: result.profile.id },
        });
        if (!user) {
          user = await commonPrismaClient.adminUser.create({
            data: {
              workosId: result.profile.id,
              firstName: result.profile.firstName,
              lastName: result.profile.lastName,
              connectionId: result.profile.connectionId,
              connectionType: result.profile.connectionType,
              organizationId: result.profile.organizationId,
            },
          });
        }

        const jwt = await createJwt({
          sub: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });

        return reply.redirect(
          `${config.adminWebUrl()}/auth/callback?returnTo=${encodeURIComponent(
            returnTo,
          )}#${INTERNAL_ADMIN_AUTH_TOKEN}=${jwt}`,
        );
      } catch (error) {
        console.log("Error logging in", error);
        return reply.status(401).send({ error });
      }
    },
  );
};
