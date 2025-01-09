<?php
if ($_POST) {
  $id            = isset($_POST['id']) ? intval($_POST['id']) : -1;
  $cat_id        = isset($_POST['point_cat']) ? intval($_POST['point_cat']) : -1;

  // Get current value
  $rs = mysql_query("SELECT id, total FROM person_points WHERE person_id = '$id' AND person_type = '" .
                    PERSONTYPE_Caregiver . "' AND cat = '$cat_id'");
  if ($row = mysql_fetch_assoc($rs)) {
    $point_id = $row['id'];
    $cur_val  = $row['total'];
  } else {
    $point_id = -1;
    $cur_val  = 0;
  }

  if (isset($_POST['add_points'])) {
    if (is_numeric($_POST['add_points'])) {
      $add_points = $_POST['add_points'];
      $new_val    = $cur_val + $add_points;
    } // end if
  } elseif (isset($_POST['remove_points'])) {
    if (is_numeric($_POST['remove_points'])) {
      $remove_points = $_POST['remove_points'];
      $new_val       = $cur_val - $remove_points;
    } // end if
  } else {
    $new_val = $cur_val;
  } // end if

  $success = false;
  if ($point_id > 0) {
    $sql = "UPDATE person_points SET total = '" . $new_val . "' WHERE id = '$point_id'";
    if (mysql_query($sql)) {
      $success = true;
    } // end if
  }
}
