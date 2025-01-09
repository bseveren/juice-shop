<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AssetController extends Controller
{
	public function getAssets(Organisation $org, Request $request)
	{
		$file = $request->file('file');
		$result = $this->getAssetsFromFile($file, $org);
		return response()->json($result);
	}

	protected function getAssetsFromFile(UploadedFile $file, Organisation $org): array
	{
		$importCollection = Excel::toCollection(new AssetImport($org), $file)->flatten(1);

		$rawWhereQuery = $importCollection->map(function ($assetRow) {
			if (isset($assetRow['item_serial'])) {
				return "(name = '{$assetRow['item_name']}' AND item_serial = '{$assetRow['item_serial']}')";
			}
			return "(name = '{$assetRow['item_name']}' AND item_serial IS NULL)";
		})
			->implode(' OR ');

		$assets = Asset::where('org_id', $org->id)
			->whereRaw($rawWhereQuery)
			->get();

		return $assets;
	}
}
