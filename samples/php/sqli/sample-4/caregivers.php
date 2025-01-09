<?php



// Patch custom forms
if (is_dir("$codedir/custom-files/")) {
  header("Location: ?system-custom-forms.php&update_only=1&pth=" . $_SERVER['REQUEST_URI']);
} // end if

// get apps and templates
$applications = [];

// New style
$rs = mysql_query("SELECT id, frm_title FROM custom_forms WHERE frm_type = '3' AND frm_display > '0' ORDER BY frm_title ASC");
while ($row = mysql_fetch_assoc($rs)) {
  $frm = ['frm_name' => stripslashes($row['frm_title']),
          'frm_id'   => $row['id']];
  if (!in_array($frm, $applications)) {
    $applications[] = $frm;
  } // end if
} // end while

if (isset($application_logo_src)) {
  $headerAltLogo = $application_logo_src;
}
include("pdf_header.php");

$fn = isset($_POST['pi_First_Name']) ? $_POST['pi_First_Name'] : "";
$ln = isset($_POST['pi_Last_Name']) ? $_POST['pi_Last_Name'] : "";

if ($_POST && $fn != "" && $ln != "") {

  // Create unique application id
  $app_id   = rand(0, 99) . rand(0, 99) . "_" . time() . "_" . rand(0, 20) . rand(0, 100);
  $f_id     = $_POST['frm_id'];
  $app_date = date("Y-m-d");

  // Name redundance check
  $first_name = $fn;
  $last_name  = $ln;

  $fn = Sql_Escape($fn);
  $ln = Sql_Escape($ln);

  $sql = "SELECT COUNT(id) AS total FROM worker WHERE first_name = '" . $fn . "' AND (last_name = '" . $ln .
         "' OR last_name LIKE '" . $ln . " %')";
  $rs  = mysql_query($sql);
  if ($row = mysql_fetch_assoc($rs)) {
    $total_matches = $row['total'];
  } // end if
