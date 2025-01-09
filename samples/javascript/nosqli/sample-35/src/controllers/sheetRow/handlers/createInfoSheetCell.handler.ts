export const createInfoSheetCell = async (body: SheetCellBody, sheetRowId: string) => {
	const em = getEm();
	const sheetRow = await em.getRepository(SheetRow).findOneOrFail(sheetRowId);
	const column = await em.getRepository(InfoSheetColumn).findOneOrFail(body.column);

	if (sheetRow.sheet.id !== column.sheet.id) {
		throw new BadRequestException(
			'SheetRowAndColumnNotFromSameSheet',
			'The sheetRow and column do not share the same sheet.'
		);
	}

	if (column.isLocked) {
		throw new BadRequestException('ColumnIsLocked', 'The column is locked.');
	}

	let sheetCell = await em.getRepository(InfoSheetCell).findOne({ column: body.column, row: sheetRow });
	if (!sheetCell) {
		sheetCell = em.create(InfoSheetCell, { ...body, row: sheetRow });
	} else {
		sheetCell.assign({ value: body.value });
	}
	em.persist(sheetCell);
	await em.flush();
	return sheetCell;
};
