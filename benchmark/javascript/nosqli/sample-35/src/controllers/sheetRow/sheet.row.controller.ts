import { createInfoSheetCell } from './handlers/createInfoSheetCell.handler';

@Controller('/rows')
@Authorized([editRowColumnRequirement])
@ApiTags('SheetRow')
export class SheetRowController {
	@Post('/:sheetRowId/cells')
	@ApiOperation({ summary: 'Create info sheetCell (cell)' })
	@ApiResponse({ type: SheetCellView, status: StatusCode.created })
	async createInfoSheetCell(
		@Body() body: SheetCellBody,
		@Param('sheetRowId') sheetRowId: string
	): Promise<SheetCellView> {
		return (await createInfoSheetCell(body, sheetRowId)) as unknown as SheetCellView;
	}

	@Patch('/:sheetRowId/position')
	@ApiOperation({ summary: 'Switch position' })
	@ApiResponse({ type: SheetRowView })
	async switchPosition(
		@Body() { position }: PositionSwitchBody,
		@Param('sheetRowId') sheetRowId: string,
		@Req() request: Request
	): Promise<SheetRowView> {
		const teamId = request.token.team.id;
		return (await switchPosition(position, sheetRowId, teamId)) as unknown as SheetRowView;
	}

	@Patch('/:sheetRowId/duplicate')
	@ApiOperation({ summary: 'Duplicate row' })
	@ApiResponse({ type: SheetRowView })
	async duplicateRow(@Param('sheetRowId') sheetRowId: string): Promise<SheetRowView> {
		return duplicateSheetRow(sheetRowId);
	}

	@Delete('/:sheetRowId')
	@ApiOperation({ summary: 'Delete sheetRow (sheet row)' })
	@HttpCode(204)
	async removeSheetRow(@Param('sheetRowId') sheetRowId: string): Promise<void> {
		return removeSheetRow(sheetRowId);
	}
}
