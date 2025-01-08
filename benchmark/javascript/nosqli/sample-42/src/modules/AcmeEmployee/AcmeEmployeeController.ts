import AcmeEmployeeSynchronizer from "modules/AcmeEmployee/AcmeEmployeeSynchronizer";
import IAcmeSettingsRepository from "modules/AcmeSettings/IAcmeSettingsRepository";
import IAcmeEmployeeRepository from "modules/AcmeEmployee/IAcmeEmployeeRepository";
import AcmeEmployeeFormatter from "modules/AcmeEmployee/AcmeEmployeeFormatter";
import IAcmeEmployeeManager from "modules/AcmeEmployee/IAcmeEmployeeManager";
import IAcmeEmployeeAPIInput from "lib/Acme/IAcmeEmployeeAPIInput";
import IAcmeEmployee from "modules/AcmeEmployee/IAcmeEmployee";
import { ModelController } from "@***/alexis-microservice";
import IAcmeAPI from "lib/Acme/IAcmeAPI";
import AcmeAPI from "lib/Acme/AcmeAPI";
import express from "express";
import _ from "lodash";

export default class AcmeEmployeeController extends ModelController {
  public constructor() {
    super("AcmeEmployee");
  }

  public getAvailable = async (req: express.Request, res: express.Response) => {
    const { companyId } = req.query;
    const context = this.loadContext(req);

    const settings = await context
      .getRepository<IAcmeSettingsRepository>("AcmeSettings")
      .findOne({ filters: { companyId } });

    const AcmeEmployees = await context
      .getRepository<IAcmeEmployeeRepository>("AcmeEmployee")
      .getByCompany(companyId);

    const api = new AcmeAPI(settings);

    const employees = await this.allAvailable(api);

    res.json(this.formatEmployees(companyId, employees, AcmeEmployees));
  };

  public upsert = async (req: express.Request, res: express.Response) => {
    const { companyId, employeeId } = req.body;
    const context = this.loadContext(req);

    res.json(
      await context
        .getManager<IAcmeEmployeeManager>("AcmeEmployee")
        .upsert(companyId, employeeId, req.body)
    );
  };

  public provision = async (req: express.Request, res: express.Response) => {
    const { companyId } = req.query;
    const context = this.loadContext(req);

    const settings = await context
      .getRepository<IAcmeSettingsRepository>("AcmeSettings")
      .findOne({ filters: { companyId } });

    const formatter = new AcmeEmployeeFormatter();
    const api = new AcmeAPI(settings);

    const { employee, user, employment } = req.body;
    const input = formatter.fromAlexis(employee, user, employment);

    const sync = new AcmeEmployeeSynchronizer(context);
    const data = await sync.create(input, companyId, employee._id, api);

    res.json(data);
  };

  public sync = async (req: express.Request, res: express.Response) => {
    const context = this.loadContext(req);

    const { employee, user, employment } = req.body;

    const sync = new AcmeEmployeeSynchronizer(context);
    const data = await sync.sync(employee, user, employment);

    res.json(data);
  };

  public getAvailableById = async (
    req: express.Request,
    res: express.Response
  ) => {
    const { id } = req.params;
    const { companyId } = req.query;
    const context = this.loadContext(req);

    const settings = await context
      .getRepository<IAcmeSettingsRepository>("AcmeSettings")
      .findOne({ filters: { companyId } });

    const [AcmeEmployee] = await context
      .getRepository<IAcmeEmployeeRepository>("AcmeEmployee")
      .getByCompanyAndExternalIds(companyId, [id]);

    const formatter = new AcmeEmployeeFormatter();
    const api = new AcmeAPI(settings);

    const employee = await api.employees.retrieve(id);

    const formatted = formatter.toAlexis(companyId, employee, AcmeEmployee);

    res.json(formatted);
  };

  public getAvailableByIds = async (
    req: express.Request,
    res: express.Response
  ) => {
    const { companyId, externalIds } = req.query;
    const context = this.loadContext(req);

    const settings = await context
