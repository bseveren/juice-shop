<?php


require_once("util-often.php");
Util_GatherOftenData("Users");

require_once("forms-common.php");


$id          = intval($_REQUEST['id']);
$customer_id = IVdefspv(0, $_REQUEST, 'c');
$special     = ['id', 'c', 'reminder', 'date', 'status'];

Util_Permit_FieldOrExit('customer', "page:customers-assessments.php", $customer_id);

$attribute_list = [];
$rs             = mysql_query("SELECT * FROM attribute ORDER BY sort_order, label");
while ($att = mysql_fetch_assoc($rs)) {
  $attribute_list[] = $att;
} // end while

$assessment_form = isset($_REQUEST['cas_form_id']) ? $_REQUEST['cas_form_id'] : "";
if ($assessment_form == "") {
  header('Location: ?clients.php');
  exit;
} // end if

$print = IVdefspv(0, $_REQUEST, 'printpage');
if ($print != "1" || $print != true) {
  $print = false;
}

$pdf = IVdefspv(0, $_REQUEST, 'makepdf');
if ($pdf != "1" || $pdf != true) {
  $pdf = false;
}
if (isset($messaging_curl) && $messaging_curl) {
  $pdf = true;
}

$cust_fields = [];
$rs          = mysql_query("SELECT DISTINCT field FROM patient_data");
while ($row = mysql_fetch_assoc($rs)) {
  $cust_fields[] = $row['field'];
}

$cust_main_fields = ["first_name", "last_name"];

$data = [];

// Retrieve assessment data
if ($assessment = $pdo->fetchOne('SELECT * FROM patient_assessment WHERE id = :id', ['id' => $id])) {
  $customer_id = $assessment['patient_id'];
  $d           = $assessment['data'];
  //$d = base64_decode($d);
  $data = CustomSerialization::unserializeArray($d);
  $formName = $pdo->fetchValue(
          'SELECT frm_title FROM custom_forms WHERE id = :id',
          ['id' => intval($data['cas_form_id'])],
  );
}

Util_Permitted_NoAccessIfNot(Util_Permit_ViewClient($customer_id));

if (!empty($data)) {
  foreach ($data as $k => $v) {
    if (in_array($k, $encrypted_fields)) {
      $encryption_key = get_customer_encryption_key($k, $customer_id);
      $rms            = decrypt_with_key($v, $encryption_key);
      if ($rms) {
        $data[$k] = $rms;
      } // end if
    } // end if
  } // end foreach
} // end if

if (!$id and $customer_id) {
  // Initialize assessment in database
    $pdo->perform('INSERT INTO patient_assessment(patient_id, date, user_id) VALUES(:patientId, NOW(), :userId)', [
        'patientId' => $customer_id,
        'userId' => $_SESSION['user_id'],
    ]);
  $newid = mysql_insert_id();
  header("Location: ?assessment-custom-main.php&cas_form_id={$assessment_form}&id={$newid}&c={$customer_id}");
  exit;
} elseif ($id and $_POST) {
  $latest = true;
  $rs     = mysql_query("SELECT * FROM patient_assessment WHERE patient_id='{$customer_id}' ORDER BY `date` DESC");
  while ($row = mysql_fetch_assoc($rs)) {
    if (strtotime($row['date']) > strtotime($_POST['date'])) {
      $latest = false;
    }
  }

}
