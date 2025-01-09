<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
	public function getUsers(Request $request)
	{
		$groupId = $request->groupId;
		$query = queryUsersInGroup(DB::table('users'), $groupId);
		$result = $query->get();
		return response()->json($result);
	}

	protected function queryUsersInGroup(Builder $query, $groupId = null)
	{
		return $query->leftJoin('users_groups as g', function ($join) use ($groupId) {
			$join->on('g.id', '=', 'users.group_id');
			if ($groupId) {
				$join->on('g.id', '=', DB::raw($groupId));
			}
		});
	}
}
