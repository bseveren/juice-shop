<?php

namespace App\Http\Controllers;
use App\Models\ReconciliationStatus;

class OrderController extends Controller
{
	public function reconciliationStatus($data)
	{
		$data = unserialize((urldecode($data)));
		$order_id = $data['order_id'];
		$status = ($data['status'] == 1) ? 'yes' : 'no';
		$days = $data['day'];
		$values = ['order_id' => $order_id, 'reconciliation_status' => $status, 'days' => $days];
		ReconciliationStatus::create($values);
	}
	public function reconcile(Request $request)
	{
		$this->reconciliationStatus($request->data);
		return response()->json([
			'status' => 'ok'
		]);
	}
};
