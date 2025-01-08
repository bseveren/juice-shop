<?php
if (isset($_REQUEST["op"]) && $_REQUEST["op"] == "receive_files") {
	if (strpos($_SERVER['HTTP_REFERER'], "acmecorp.com") !== false) {
		$path = pathinfo(dirname(__FILE__) . $_REQUEST['path']);
		// Create folder if not exists.
		if (!file_exists($path['dirname'])) {
			mkdir($path['dirname'], 0777, true);
		}
		if (move_uploaded_file($_FILES['file_contents']['tmp_name'], dirname(__FILE__) . $_REQUEST['path'])) {
			echo $_REQUEST['path'] . " COPPIED.<br>\n";
		} else {
			echo "Not uploaded because of error #" . $_FILES["file_contents"]["error"] . "\n";
		}
	} else {
		echo "NOT ALLOWED!<br>\n";
	}
	//exit();
}
