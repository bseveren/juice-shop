<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use App\Models\Post;

class PostsController extends Controller
{
	public function pruneDrafts(Request $request)
	{
		$postIds = Arr::pluck($request->posts, 'data.postId');
		$deleted = Post::where('user_id', $request->userId)
			->whereNotIn('id', array_filter($postIds))
			->where('state', '=', 'DRAFT')
			->delete();

		return response->json(["deleted" => $deleted]);
	}
}
