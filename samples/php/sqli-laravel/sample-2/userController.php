<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class UserController extends Controller
{
	public function search(Request $request)
	{
		$users = User::query();
		$users = $users->where('bio', 'LIKE', '%' . $request->search . '%');
		return $users->get();
	}
}
