const setupSuperAdminUser = async () => {
  const params = {
    username: strapi.config.get("administrator.email"),
    password: strapi.config.get("administrator.password"),
    firstname: "Admin",
    lastname: "Admin",
    email: strapi.config.get("administrator.email"),
    blocked: false,
    isActive: true,
  };

  //Check if any account exists.
  const adminUser = await strapi
    .query("admin::user")
    .findOne({ where: { email: params.email } });
  try {
    let verifyRole = await strapi
      .query("admin::role")
      .findOne({ where: { code: "strapi-super-admin" } });
    if (!verifyRole) {
      verifyRole = await strapi.query("admin::role").create({
        data: {
          name: "Super Admin",
          code: "strapi-super-admin",
          description:
            "Super Admins can access and manage all features and settings.",
        },
      });
    }
    params.roles = [verifyRole.id];
    params.password = await strapi
      .service("admin::auth")
      .hashPassword(params.password);
    if (!adminUser) {
      await strapi.query("admin::user").create({ data: { ...params } });
      strapi.log.info("Admin account was successfully created.");
    } else {
      await strapi
        .query("admin::user")
        .update({ where: { id: adminUser.id }, data: { ...params } });
      strapi.log.info("Admin account was successfully updated.");
    }
  } catch (error) {
    strapi.log.error(`Couldn't create Admin account during bootstrap: `, error);
  }
};
