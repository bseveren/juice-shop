<?php


if (isset($_POST['view_by_month']) && $_POST['view_by_month'] > 0) {
  $current_month = intval($_POST['view_by_month']);    // this is YYYYmm
  $sDate         = mktime(0, 0, 0, $current_month % 100, 2, $current_month / 100);    // 2nd day of selected month
  $eDate         = mktime(0, 0, 0, $current_month % 100 + 1, -1, $current_month / 100);    // last day of selected month
  $sDate         = strtotime("last Monday", $sDate);    // find beginning of first week ending selected month
  $eDate         = strtotime("next Sunday", $eDate);    // find end of last week starting selected month
  $sDateSql      = date('Ymd', $sDate);
  $eDateSql      = date('Ymd', $eDate);
  $criteria      .= " AND start_date BETWEEN $sDateSql AND $eDateSql";
  $visitWhere    .= " AND visit_date BETWEEN $sDateSql AND $eDateSql";
  if ($week_end < $sDate || $week_start > $eDate) {
    $curWeekSchedules = [];
  }    // clear list - not in select month
}

if ($curWeekSchedules) {
  foreach ($curWeekSchedules as $row) {
    $sDate = date('Ymd', strtotime($row['start_date']));
    $key   = "$sDate-$row[patient_id]-$row[worker_id]";
    if ($date_range_to == "" && $date_range_from == "") {
      $care_notes[$key] = [
        'id'             => 0,
        'start_date'     => $row['start_date'],
        'worker_id'      => $row['worker_id'],
        'worker_name'    => ($GLOBALS['conf_values']['hideCaregiverLastNameFromClient'] ?? false)
            ? $workers_all[$row['worker_id']]['first_name'] ?? ''
            : BuildName($workers_all[$row['worker_id']]),
        'patient_id'     => $row['patient_id'],
        'patient_adls'   => '',
        'notes'          => '',
        'certified'      => null,
        'certified_date' => null,
        'certified_by'   => null,
      ];
    } // end if
  }
} // end if

// MySQL uses 1=sunday..7=saturday - this script uses Monday..Sunday -- TBD:  convert this script to support Sun..Sat (see top of this file for week start)
$visits = Sql_GetRows(
  "SELECT DISTINCT date_sub(visit_date, interval ((dayofweek(visit_date)-2+7)%7) day) start_date, worker_id, patient_id FROM visit  $visitWhere"
);
foreach ($visits as $row) {
  $sDate            = date('Ymd', strtotime($row['start_date']));
  $key              = "$sDate-$row[patient_id]-$row[worker_id]";
  $care_notes[$key] = [
    'id'             => 0,
    'start_date'     => $row['start_date'],
    'worker_id'      => $row['worker_id'],
    'worker_name'    => ($GLOBALS['conf_values']['hideCaregiverLastNameFromClient'] ?? false)
        ? $workers_all[$row['worker_id']]['first_name'] ?? ''
        : BuildName($workers_all[$row['worker_id']]),
    'patient_id'     => $row['patient_id'],
    'patient_adls'   => '',
    'notes'          => '',
    'certified'      => null,
    'certified_date' => null,
    'certified_by'   => null,

  ];
}

$rs = mysql_query("SELECT * FROM patient_care_notes " . $criteria . " ORDER BY start_date DESC");
while ($row = mysql_fetch_assoc($rs)) {
  $sDate = date('Ymd', strtotime($row['start_date']));
  $key   = "$sDate-$row[patient_id]-$row[worker_id]";
  $row['worker_name'] = ($GLOBALS['conf_values']['hideCaregiverLastNameFromClient'] ?? false)
      ? $workers_all[$row['worker_id']]['first_name'] ?? ''
      : BuildName($workers_all[$row['worker_id']]);
  $care_notes[$key] = $row;
} // end while
