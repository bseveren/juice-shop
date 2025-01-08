<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class UserController extends Controller
{
	public function search(Request $request)
	{
		$users = User::query();
		$users = $users->where('name', 'LIKE', '%' . $request->search . '%')
			->orderBy($request->column);
		return $users->get();
	}
}
