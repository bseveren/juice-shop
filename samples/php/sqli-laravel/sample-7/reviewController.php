<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use App\Models\Review;

class ReviewController extends Controller
{
	public function index(Request $request)
	{
		$validated = $request->validate(['type' => 'in:date,score,views']);
		$type = $validated->type;
		$find = $validated->find;
		$category_id = session('category')['id'] ?? 1;

		$reviews = Review::where('category_id', $category_id)->with('product', 'user');
		if ($type) {
			$reviews = $reviews->whereNotNull($type);
		}
		$reviews = $reviews->where(function ($query) use ($find) {
			return $query
				->where('title', 'LIKE', '%' . $find . '%')
				->orWhere('content', 'LIKE', '%' . $find . '%');
		})->paginate(10);
	}
}
