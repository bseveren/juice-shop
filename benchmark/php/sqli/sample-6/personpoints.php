<?php
function get_points()
{
	//$id = $_POST['id'];
	$id = preg_replace('/\D/', '', _ei($_GET['id']));

	// Get current value
	$rs = mysql_query("SELECT id, total FROM person_points WHERE person_id = '$id'");
	if ($row = mysql_fetch_assoc($rs)) {
		$point_id = $row['id'];
		$total  = $row['total'];
	} else {
		$point_id = -1;
		$total  = 0;
	}
	return ["id" => $point_id, "total" => $total];
}
