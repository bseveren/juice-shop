<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Message;

class SmsController extends Controller
{

	public function handleSms(Request $request)
	{
		$fromNumber = substr(str_replace(['(', ')', '-', ' '], '', $request->from_number), -10);
		$toNumber = substr(str_replace(['(', ')', '-', ' '], '', $request->to_number), -10);
		$data = [
			'user_id' => auth()->user()->id,
			'from' => '+1' . $fromNumber,
			'to' => '+1' . $toNumber,
		];

		$since = Carbon::now()->subMinutes(5);
		$message = Message::where($data)->where('created_at', '>=', $since)->first();

		SmsJob::dispatch($message);
		return response()->json(['status' => true, 'message' => 'success']);
	}
}
