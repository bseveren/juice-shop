<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use App\Models\Review;

class ReviewController extends Controller
{
	public function search(Request $request)
	{
		$validated = $request->validate(['column' => 'null|in:author,title']);
		$column = $validated->column ?? 'title';
		$find = $validated->find;
		$category_id = session('category')['id'] ?? 1;

		$reviews = Review::where('category_id', $category_id)->with('product', 'user');
		$reviews = $reviews->where(function ($query) use ($column, $find) {
			return $query
				->where($column, 'LIKE', '%' . $find . '%')
				->orWhere('content', 'LIKE', '%' . $find . '%');
		})->paginate(10);
	}
}
