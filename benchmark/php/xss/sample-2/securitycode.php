<?php
//Modify the randstring variable below to customize your security code.
//- Use 'num' for numbers only
//- Use 'alphanum' for numbers and letters
//- Use 'secure' for numbers, letter and special characters
//Modify the number in the string to reflect how many characters you want your security code to be
$_SESSION["captcha_" . $_GET["id"]]=randString("alphanum",6);
?>
<a href="captcha.php?securitycode=<?php echo $_SESSION["captcha_" . $_GET["id"]];?>">Fill in captcha</a>
