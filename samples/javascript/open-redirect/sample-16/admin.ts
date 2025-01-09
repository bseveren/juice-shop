import fs from "node:fs";

import * as express from "express";
import path from "path";

import { AppContext } from "~server/appContext";
import { Authentication } from "~server/authentication";
import { handler } from "~server/httpServer";
import { logger } from "~server/logger";
import { mountSubpath, Proxy } from "~server/proxy";

import { devAssets } from "./_dev";
import { mountEnvConfigRoute } from "./envconf";

const cwd = process.cwd();

export default function (
  ctx: AppContext,
  auth: Authentication,
  proxy: Proxy,
): express.Router {
  const config = ctx.config;
  const router = express.Router();

  router.use(auth.middleware({ requiredRole: "admin" }));

  mountEnvConfigRoute(ctx, router);

  router.get(
    "/_dashboard",
    handler(async (req, res) => {
      try {
        // Implicitly "logout" from the admin service when navigating back to
        // public Resonance site, however if this fails for some reason it's
        // not that big deal that we need to interrupt user, just log the error
        await auth.endSession(req);
      } catch (error) {
        logger.error(
          { error },
          "Unexpected error occurred while ending admin session",
        );
      }
      res.redirect(config.resonance.baseUrl);
    }),
  );

  router.get("/api/status", (req, res) => {
    res.json({ status: "ok" });
  });

  // /profile route is served through public gateway API
  const gatewayApi = proxy.forUpstream(config.upstreams.gatewayApi.url);
  router.get(
    "/api/gateway/profile",
    gatewayApi.http({ path: "/dashboard/profile" }),
  );

  // other routes are served through admin gateway API
  const gatewayAdmin = proxy.forUpstream(config.upstreams.gatewayBackend.url);
  router.get("/api/gateway/status", gatewayAdmin.http({ path: "/status" }));

  mountSubpath(router, gatewayAdmin, {
    sourcePath: "/api/gateway",
    targetPath: "/admin",
  });

  const cms = proxy.forUpstream(config.upstreams.cms.url);
  router.all("/cms/graphql", cms.http({ path: `/cms/graphql` }));
  router.all("/cms/admin", cms.http({ path: `/cms/admin` }));
  mountSubpath(router, cms, {
    sourcePath: "/cms/admin",
    targetPath: "/cms/admin",
    logLevel: "trace",
  });
  const cmsImages = proxy.forUpstream(config.upstreams.cmsImages.url);
  mountSubpath(router, cmsImages, {
    sourcePath: "/cms/images",
    targetPath: "",
  });

  // dev
  if (config.devMode) {
    router.use(devAssets("admin", proxy));
  } else {
    // Serve static assets from FS
    const indexHtml = fs.readFileSync(
      path.join(cwd, "dist/frontend/src/web/admin/index.html"),
    );
    router.use(
      "/static",
      express.static(path.join(cwd, "dist/frontend/static")),
    );
    router.use(
      "/assets",
      express.static(path.join(cwd, "dist/frontend/assets")),
    );
    router.use(
      "/assets/admin",
      express.static(path.join(cwd, "dist/frontend/assets/admin")),
    );
    router.get("/*", (req, res) => {
      res.header("Content-Type", "text/html").send(indexHtml);
    });
  }
  return router;
}
