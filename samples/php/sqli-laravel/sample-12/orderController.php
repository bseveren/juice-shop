<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class OrderController extends Controller
{
	public function getOrderDueDate(Request $request)
	{
		$orderId = $request->orderId;
		$sql = "select due_date from orders where id = $orderId and status = 'Completed'";
		$result = DB::select(DB::raw($sql));

		if (count($result) > 0) {
			return response->json(["dueDate" => $result[0]->due_date]);
		}
		return null;
	}
}
