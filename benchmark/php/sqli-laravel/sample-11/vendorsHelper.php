<?php

namespace App\Helpers;

use Illuminate\Http\Request;
use App\Models\User;

class VendorsHelper
{
	public static function getVendorUsers(Request $request)
	{
		$vendorIds = $request->input('vendors', []);

		$userQuery = User::where('users.id', '>', 0)->orderBy('users.id');
		$vendorQuery = 'SELECT user_id FROM vendor_user WHERE `vendor_user`.`status` IN (1, 2)';
		if (is_array($vendorIds) and count($vendorIds)) {
			$vendorQuery .= ' AND vendor_user.id IN (' . implode(',', $vendorIds) . ')';
		}
		$userQuery->whereRaw('users.id IN (' . $vendorQuery . ')');

		return $userQuery->get();
	}
}
