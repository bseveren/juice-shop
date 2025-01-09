<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Leads;

class LeadsController
{
	public function countLeads(Request $request)
	{
		$listdata = ['region' => $request->region, 'campaign_id' => $request->campaign_id, 'contact_user_id' => $request->user_id];
		$leadsCount = Leads::where($listdata)->count();
		return response->json(["leadsCount" => $leadsCount]);
	}
}
