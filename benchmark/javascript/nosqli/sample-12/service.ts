import { SaleTransactionDto } from "./dto";

@Injectable()
export class SaleService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly transactionService: TransactionService,
    private readonly userService: UserService
  ) {}
  /**
   * Mark a sale as paid if its transaction has been completed.
   * @param dto - The sale transaction data (e.g. transactionId, ipAddress)
   * @returns - The sale object object
   */
  async markPaid(dto: SaleTransactionDto): Promise<Sale | null> {
    const sale = await this.repository.findOne({ transactionId: dto.transactionId });
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${dto.transactionId} not found`);
    }

    const transaction = await this.transactionService.findById(dto.transactionId);
    if (!transaction?.completed) {
      throw new TransactionNotCompletedException(dto.transactionId);
    }

    const updatedSale: Partial<Sale> = {
      saleId: sale._id,
      transactionId: dto.transactionId,
      paid: true,
    };
    const response = await this.repository.update(sale?._id as string, updatedSale);
    return response;
  }
}
