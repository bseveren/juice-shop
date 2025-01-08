<?php
require_once('functions-messaging.php');
$cid  = $_GET['c'];
$cgid = $_GET['cg'];

//-------------------------------------------------------------------------------------
// gotta decode the IDs.
//-------------------------------------------------------------------------------------
$cid  = decodeDigs($cid);
$cgid = decodeDigs($cgid);

$mysqli = new mysqli($dbserver, $dbuser, $dbpassword, $dbname);

if (mysqli_connect_errno()) {
  $parms = "$dbserver,$dbuser,$dbpassword,$dbname";
  $msg   = question_label(_("ERROR")) . ' ' . _('Unable to connect to the database.') . ' ' .
           _('Please log off and log back in to see if that clears the problem.') . ' ' .
           _("The Administrator has been notified.");
  NonPopupMsg($msg, true, $site_url, "*** home", $site_url, "Connect", $dbname, $parms);
  exit;
}

$primary_fields = ['first_name', 'last_name', 'status', 'telephony_num'];
$rs             = mysql_query("SELECT * FROM patient WHERE id='$cid'");
if ($row = mysql_fetch_assoc($rs)) {
  $c  = $row;
  $rs = mysql_query("SELECT * FROM patient_data WHERE patient_id='$cid'");
  while ($row = mysql_fetch_assoc($rs)) {
    if (!in_array($row['field'], $primary_fields)) {
      if (in_array($row['field'], $encrypted_fields) and $row['encrypted']) {
        $encryption_key    = get_customer_encryption_key($row['field'], $row['patient_id']);
        $drs               = mysql_query("SELECT CAST(AES_DECRYPT(BINARY UNHEX(value_text),'{$encryption_key}') AS CHAR) FROM patient_data WHERE patient_id='{$cid}' AND field='{$row['field']}'");
        $drow              = mysql_fetch_array($drs);
        $row['value_text'] = $drow[0];
      }
      $c[$row['field']] = $row['value_text'];
    }
  }
} else {
  $msg = _("ERROR") . ' ' . _('Bad result returned from database. Please try again later.');
  ?>
    <div style="text-align: center; font-family: Arial sans-serif; color: black; font-weight: bold; font-size: 1.2em; line-height: 1.3em;
        background-color: #FAAFBA"><?php echo $msg ?>
    </div>
  <?php
  exit;
}

