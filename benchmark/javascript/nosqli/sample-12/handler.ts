import { SaleService } from "./service";
@CommandHandler(SalePaidCommand)
export class SalePaidHandler implements ICommandHandler<SalePaidCommand> {
  constructor(private readonly saleService: SaleService) {}

  async execute(command: SalePaidCommand): Promise<Sale> {
    return this.saleService.markPaid(command.saleTransactionDto);
  }
}
