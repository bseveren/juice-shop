<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class UserController extends Controller
{
	public function search(Request $request)
	{
		$users = User::query()->select(DB::raw('count(*) as user_count, status'))
			->where('status', '<>', $request->status)
			->groupBy('status')
			->get();

		return response()->json(["users" => $users]);
	}
}
