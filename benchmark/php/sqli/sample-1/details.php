<?php


$primary_fields = ["first_name", "last_name"];


$id        = intval($_REQUEST['id']);
if ($id <= 0) {
  redirectTo('caregivers.php');
}

$c = PersonDataRow(PERSONTYPE_Caregiver, $id);


if ($_POST) {
  $id   = intval($_POST['caregiver_id']);
  $data = [];

  // these VFLAG_* should be sparse fields, and only stored if set (since they are checkboxes on this screen, they won't be present/deleted in loop below)
  Sql_Exec("DELETE FROM worker_data WHERE worker_id=$id AND field in ('docs_dl_received','docs_cr_received')");
  Sql_Exec("INSERT INTO worker_data (worker_id, field, value_text) VALUES ($id, 'VFLAG_DoNotBill', '1'), ($id,'VFLAG_DoNotPay', '1')
                                                       ON DUPLICATE KEY UPDATE value_text=value_text");

  if (isset($_POST['history_date'])) {
    $hist                    = [];
    $hist['date']            = defspv('', $_POST, 'history_date');
    $hist['type']            = defspv('', $_POST, 'history_type');
    $hist['rate']            = defspv('', $_POST, 'history_rate');
    $hist['note']            = defspv('', $_POST, 'history_note');
    $hist['user_id']         = $_SESSION['user_id'];
    $c['pay_rate_history'][] = $hist;
    usort($c['pay_rate_history'], 'usort_history_date');
    $data['pay_rate_history'] = $hist;
    Sql_Upsert('worker_data',
               ['worker_id' => $id, 'field' => 'pay_rate_history', 'value_text' => json_encode($c['pay_rate_history'])],
               '');
  }
  unset($_POST['history_date']);
  unset($_POST['history_type']);
  unset($_POST['history_rate']);
  unset($_POST['history_note']);

  $validationResponse = CaregiverPayDetailsValidator::create()->validate($_POST);

  if ($validationResponse->isValid()) {
      AddUIMessage('The profile has been saved successfully', 'success');
  } else {
      $_POST = $validationResponse->reduceByFailedKeys($_POST);
      AddUIMessage((new LegacyValidationRenderer())->render($validationResponse), 'error');
  }

  foreach ($_POST as $key => $value) {
      $value = isset($custDataFormat[$key]) && mb_strlen($value) > 0
        ? $custDataFormat[$key]($value)
        : $value;
      $field = Sql_Escape($key);
      $text  = Sql_Escape($value);
      if ( ! in_array($key, $primary_fields) and mb_strlen($field) > 0) {
          if ($field === 'qb_name') {
              Sql_Upsert('worker', ['id' => $id, $field => $value], '');
          } elseif ($field === 'reset_quickbooks_id') {
              $sql
                  = "update `AcctSyncIdent` set extId = null, extSeq = null, syncId = null, statusId = 0 where syncType = 3 and acIdent = {$c['id']}";
              Sql_Exec($sql);
              Sql_Upsert('worker', ['id' => $id, 'qb_listid' => '', 'qb_editsequence' => ''], '');
          } elseif (mb_strlen($text) > 0) {
              if ($key === 'VFLAG_DoNotBill' || $key === 'VFLAG_DoNotPay') {
                  Sql_Exec("DELETE FROM worker_data WHERE worker_id=$id AND field = '$key'");
              } else {
                  $data[$key] = $value;
                  Sql_Upsert('worker_data', ['worker_id' => $id, 'field' => $field, 'value_text' => $text], '');
              }
          } elseif (isset($removableFields[$field]) && $removableFields[$field] > 0) {
              Sql_Exec("DELETE FROM worker_data WHERE worker_id=$id AND field='$field'");
          }
      }
  }

  Util_TableCacheExpire('worker');
  log_change("CAREGIVER", $id, "Update caregiver pay details", $data);
  header("Location: ?caregivers-paydetails.php&id=$id&saved=1");
  exit;
}
