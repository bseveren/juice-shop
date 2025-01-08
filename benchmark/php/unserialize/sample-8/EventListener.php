<?php

use Illuminate\Support\Facades\Auth;
use App\Events\LoginEvent;

class UpdateLastLogin
{
	/**
	 * Create the event listener.
	 *
	 * @return void
	 */
	public function __construct()
	{
		//
	}
	/**
	 * Handle the event.
	 *
	 * @param  LoginEvent  $event
	 * @return void
	 */
	public function handle(LoginEvent $event)
	{
		$user = User::find(Auth::id());
		$user->lastlogintime = date("Y-m-d H:i:s");
		$user->save();
		$usersettingdata = unserialize($user->usersetting);
		$row_per_grid = isset($usersettingdata['row_per_grid']) ? $usersettingdata['row_per_grid'] : 10;
		$row_per_grid = $row_per_grid == 'All' ? '-1' : $row_per_grid;
		session(['RowPerGrid' => $row_per_grid]);
		if (!session('is_admin', false)) {
			Log::debug('User Login in to System');
		}
	}
}
