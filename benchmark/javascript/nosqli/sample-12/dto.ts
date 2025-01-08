import { IsString, IsNotEmpty, IsIP, IsOptional } from "class-validator";
import { IsObjectId } from "class-validator-mongo-object-id";

export class SaleTransactionDto {
  @IsString({ message: "Transaction Id must be a string" })
  @IsNotEmpty({ message: "Transaction Id is required" })
  @IsObjectId({ message: "Transaction Id must be a valid ObjectId" })
  transactionId: string;
  @IsOptional()
  @IsString({ message: "IP Address must be a string" })
  @IsIP()
  ipAddress?: string;
}
