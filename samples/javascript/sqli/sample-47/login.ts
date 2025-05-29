import { type Request, type Response, type NextFunction } from "express";
import { type User } from "./data/types";
import { BasketModel } from "./models/basket";
import { UserModel } from "./models/user";
import * as utils from "./lib/utils";
const models = require("./models/index");
const security = require("./lib/insecurity");

module.exports = function login() {
  function afterLogin(user: { data: User; bid: number }, res: Response, next: NextFunction) {
    BasketModel.findOrCreate({ where: { UserId: user.data.id } })
      .then(([basket]: [BasketModel, boolean]) => {
        const token = security.authorize(user);
        user.bid = basket.id; // keep track of original basket
        security.authenticatedUsers.put(token, user);
        res.json({ authentication: { token, bid: basket.id, umail: user.data.email } });
      })
      .catch((error: Error) => {
        next(error);
      });
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const options = { model: UserModel, plain: true };
    const hash = security.hash(req.body.password || "");
    models.sequelize
      .query(
        `SELECT * FROM Users WHERE email = '${
          req.body.email || ""
        }' AND password = '${hash}' AND deletedAt IS NULL`,
        options
      )
      .then((authenticatedUser) => {
        const user = utils.queryResultToJson(authenticatedUser);
        if (user.data?.id) {
          afterLogin(user, res, next);
        } else {
          res.status(401).send(res.__("Invalid email or password."));
        }
      })
      .catch((error: Error) => {
        next(error);
      });
  };
};
