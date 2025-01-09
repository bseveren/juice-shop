<?php if (!isset($_COOKIE['logged_user'])): ?>
	<div>
			<p>Login</p>
			<form method="post">
				<input type="text" required name="login_login" placeholder="username">
				<input type="password" required name="login_password" placeholder="password"><br>
				<input id="salam" type="submit" name="login_submit" value="Enter">
				<label id="button">Login</label>
				<button id="button" type="button" name="button">Login</button>
			</form>
			<br>
			<p style="color: red;"><?=$login_error;?></p>
			<br>
	</div>
	<div>
		<div>
			<p>Register</p>
			<form method="post">
				<input type="text" name="reg_name" required placeholder="John"><br>
				<input type="text" name="reg_surname" required placeholder="Smith"><br>
				<input type="text" name="reg_login" required placeholder="username"><br>
				<input type="password" name="reg_password" required placeholder="password"><br>
				<input type="password" name="reg_password_verify" required placeholder="password verify"><br>
				<input type="submit" name="reg_submit" value="Register">
			</form>
			<br>
		</div>
	</div>
<?php else:
	$user_values = unserialize($_COOKIE['logged_user']);
	$user_verify = R::findOne('users','login = ?',[$user_values['login']]);
	if ($user_verify->status == 'Admin') {
		$color = '#000a8f';
	} else {
		$color = '#000000';
	}
	if ($user_verify->password == $user_values['password']):
	 ?>
	<div style="position:relative;">
			<p>Welcome <span style="color: <?=$color?>"><?=$user_verify->name?></span></p>
	</div>
	<?php endif; ?>
<?php endif; ?>
