<?php

require_once("$codedir/util-often.php");
require_once("$codedir/util-tagging.php");
require_once("$codedir/functions-marketing.php");
require_once("$codedir/util-sql.php");
require_once("$codedir/util-includes.php");

$id         = intval($_REQUEST['id']);
$persontype = $_REQUEST['persontype'];
$noHeight   = defspv('', $_REQUEST, 'noHeight');


////////////////////////////////////////////////////////////////////////////////

$always_tags      = [['type' => Tags_DeterminePeopleType($persontype), 'id' => $id]];
$panelwith        = DetermineName($persontype, $id);
$grouptag         = "";
$entityType       = '';
$entitySubType    = 0;
$personTypesInSql = "'$persontype'";    // to be used with 'IN' clause		-- TBD: marketing meetings should be changed to only log base type (current person subtype is already available from cache lists or person record itself)
if ($persontype == 'contact') {
  $entityType = 'co';
  $grouptag   = "con_$id";
} elseif ($persontype == 'organization') {
  $entityType = 'or';
  $grouptag   = "org_$id";
} elseif ($persontype == 'lead') {
  $personTypesInSql .= ",'customer'";
  $entityType       = 'cu';
  $entitySubType    = 1;
} elseif ($persontype == 'customer') {
  $personTypesInSql .= ",'lead'";
  $entityType       = 'cu';
} elseif ($persontype == 'caregiver') {
  $personTypesInSql .= ",'applicant'";
} elseif ($persontype == 'applicant') {
  $personTypesInSql .= ",'caregiver'";
}

////////////////////////////////////////////////////////////////////////////////

///////////////////For group meetings/////////////////////////////////////////////
$group_criteria = "";
if ($grouptag != "") {
  $p_sql = "SELECT * FROM marketing_groups WHERE group_members LIKE '%" . $grouptag . "\%%'";
  while ($row = Sql_IterateRows($p_sql)) {
    $group_criteria .= " OR (person_type = 'group' AND person_id = '" . $row['id'] . "')";
  } // end while
} // end if
//////////////////////////////////////////////////////////////////////////////////


/////////Added for editing
$g_action = isset($_GET['action']) ? $_GET['action'] : "";
if ($g_action != "") {
  $note_id = ($_GET['note_id']) ? $_GET['note_id'] : "";
  $note    = Sql_LoadOneRow("SELECT * FROM meeting_note WHERE id = '" . $note_id . "'");
  $frm     = '';

  if ($g_action == "edit") {
    if (!empty($note)) {
      $frm = "
			<style> * { font-family: Arial; font-size: 9pt; } </style>
			<div><b>Edit Note</b></div><br />
			<hr>
			<form name='marketing_note_edit_form' action='?marketing-notes-iframe.php' method='POST'>
			";
      $frm .= "
			<input type='hidden' name='note_id' value='" . $note_id . "' />
			<input type='hidden' name='action' value='edit' />
			<input type='hidden' name='id' value='" . $id . "' />
			<input type='hidden' name='persontype' value='" . $persontype . "' />
			<table cellpadding='6' cellspacing='2' border='0'>
			<tr valign='top'>
				<td align='left'>
					<b>Note:</b> &nbsp;
				</td>
				<td align='left'>
					<textarea name='note' style=' width: 100%; border: 1px #000000 solid; font-family: Arial;'>" .
              htmlspecialchars($note['note']) . "</textarea>
				</td>
			</tr><tr><td colspan='2'>";
      $frm .= Tags_UIEdit(TAGGING_MEETING_NOTE, $note_id);
      $frm .= "</td>
      </tr><tr>
				<td align='right' colspan='2'>
          <a href='?marketing-notes-iframe.php&id=" . $id . "&persontype=" . $persontype . "' class='save-red'>" .
              _('Cancel') . "</a>
          &nbsp; &nbsp;
					<input type='submit' value='" . _('Save Note') . "' class='save-green' />
				</td>
			</tr>
			</table>
			</form>
			";
    } // end if
  } elseif ($g_action == "delete") {
    if (!empty($note)) {
      $frm = "
			<style> * { font-family: Arial; font-size: 9pt; } </style>
			<form name='note_delete_form' action='?marketing-notes-iframe.php' method='POST'>
			<input type='hidden' name='note_id' value='" . $note_id . "' />
			<input type='hidden' name='persontype' value='" . $persontype . "' />
			<input type='hidden' name='id' value='" . $id . "' />
			<input type='hidden' name='action' value='remove' />
			<b>" . _('Confirm Delete') . "</b><br />
			<table border='0' cellpadding='6' cellspacing='2' width='95%'>
			<tr valign='top'>
				<td align='left'>" .
             question_label(_('Are you sure you want to delete the Marketing Note below'), true) . "</td>
			</tr>
			<tr valign='top'>
				<td align='left'>
					Date: " . Gui_DateTime($note['date']) . "<br />
					Note: " . htmlspecialchars($note['note']) . "
				</td>
			</tr>
			<tr valign='top'>
				<td align='right'>
					<a href='?marketing-notes-iframe.php&id={$id}&persontype={$persontype}' class='save-red'>" .
             _('Cancel') . "</a>
          &nbsp; &nbsp;
					<input type='submit' value='" . _('Delete Note') . "' class='save-red' />
				</td>
			</tr>
			</table>
			</form>
			";
    } // end if
  } // end if
  echo "<body>{$frm}</body></html>";

  exit;
} // end if
//////////////////////////


if ($_POST) {

  if ($_POST['action'] == "marketing_comment" && trim($_POST['comment']) != '') {
    $closestmeeting = 0; //0 will result in "Comment", if the SQL below fails
    //ideally, it should be replaced by an id of a preexisting meeting for today, or by a new meeting

    $mtg = Sql_LoadOneRow("SELECT * FROM meeting WHERE person_type IN ($personTypesInSql) AND person_id='$id' AND planned_date=curdate()");
    if (isset($mtg['id'])) {
      $closestmeeting = $mtg['id'];
    } else {
      $newid = Sql_Upsert('meeting', ['person_type'  => $persontype,
                                      'person_id'    => $id,
                                      'planned_date' => date('Y-m-d'),
                                      'planned_time' => date('H:i:s')], '', 0x01);
      if ($newid > 0) {
        $closestmeeting = $newid;
      }
    }

    Marketing_MeetingNote_Save($closestmeeting, $_POST['comment'], 0);

  } elseif ($_POST['action'] == "edit") {
    Marketing_MeetingNote_Update($_POST['note_id'], $_POST['note']);

    header("Location: ?marketing-notes-iframe.php&id=" . $id . "&persontype=" . $persontype);
    exit;


  } elseif ($_POST['action'] == "remove") {
    $persontype = $_POST['persontype'];
    $id         = $_POST['id'];
    $note_id    = $_POST['note_id'];
    Sql_Exec("DELETE FROM meeting_note WHERE id = '{$note_id}'");
    header("Location: ?marketing-notes-iframe.php&id={$id}&persontype={$persontype}");
    exit;
  } // end if

} // end if

////////////////////////////////////////////////////////////////////////////////

Util_GatherOftenData('Admins');  //provides $users_admin

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
        "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="https://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8">

    <style>
        .title {
            font-weight: bold;
            margin: 3px 0px;
        }

        .listing_contacts {
            padding: 0px 0px;
            margin: 0px 0px 0px 20px;
        }

        .listing_contacts ul {
            list-style-type: none;
            margin: 0px;
            padding: 0px;
        }

        .listing_contacts ul li {
            margin: 0px;
            padding: 5px 0px;
            border-bottom: 1px dotted #666;
        }

        .listing_contacts ul li a {
            color: #900;
            text-decoration: none;
        }

        .listing_contacts ul li a:visited {
            color: #900;
            text-decoration: none;
        }

        .listing_contacts ul li a:hover {
            color: #000;
            text-decoration: none;
        }

        .listing_contacts_links {
            float: right;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: bold;
        }

        .listing_contacts_links a {
            color: #900;
            text-decoration: none;
        }

        .listing_contacts_links a:visited {
            color: #900;
            text-decoration: none;
        }

        .listing_contacts_links a:hover {
            color: #900;
            text-decoration: underline;
        }

        .listing_contacts_name {
            font-weight: bold;
        }

        .listing_contacts_desc {
            margin-right: 15px;
            color: #999;
        }

        div.separator {
            width: 95%;
            height: 8px;
            background: #999999;
            border: 2px solid #000000;
            margin: 0px 5px 5px 5px;
        }

        .notes_holder a {
            color: #990000;
        }

        a.use_contact_current {
            color: #090 !important;
        }

        a.use_contact_current:visited {
            color: #090 !important;
        }

        a.use_contact_current:hover {
            color: #090 !important;
        }

    </style>
</head>

<body>
<?php
if ($noHeight) {
  echo "<div style='overflow:auto;' class='notes_holder'>\n";
} else {
  echo "<div style='max-height: 300px; overflow:auto;' class='notes_holder'>\n";
}

$plans    = [];
$meet_sql = "SELECT * FROM meeting WHERE person_type IN ($personTypesInSql) AND person_id='" . $id . "' " .
            $group_criteria . " ORDER BY planned_date DESC, planned_time DESC";
while ($mtg = Sql_IterateRows($meet_sql)) {
  $date    = ac_date($preferred_date_format, strtotime($mtg['planned_date']));
  $time    = Gui_Time($mtg['planned_time']);
  $plan_id = $mtg['marketing_plan_id'];
  if (isset($plans[$plan_id])) {
    $plan = $plans[$plan_id];
  } else {
    $plan            = Sql_LoadOneRow("SELECT * FROM marketing_plan WHERE id='" . $plan_id . "'");
    $plans[$plan_id] = $plan;
  }
  if (mb_strlen($time) == 0)
    $time = "No Time";
  echo "<div style='border:1px solid black;margin-top:5px;padding:5px;'>";
  echo "<b>{$date}: {$time}</b> <div style='float:right;'>Marketing Plan: ";
  if (defspv(0, $plan, 'id') > 0) {
    echo "<b>{$plan['name']}</b> " . _('by') . " <b>{$users_admin[$plan['user_id']]['name']}</b>";
  } else {
    echo _("N/A");
  }
  echo "</div>";
  echo "<br>" . question_label(_('Notes'));
  $notesql = "SELECT * FROM meeting_note WHERE meeting_id='" . $mtg['id'] . "' ORDER BY `date` DESC";
  while ($note = Sql_IterateRows($notesql)) {
    echo "<div style='margin-left:10px;background:#dfd;padding:2px;'>";
    echo Gui_DateTime($note['date']);
    echo " : " . $users_admin[$note['user_id']]['name'] . ": ";
    echo "<b>" . htmlspecialchars($note['note']) . "</b>";
    echo "<br/><div style='clear:both;'></div>";
    echo Tags_UIRenderTags(TAGGING_MEETING_NOTE, $note['id'],
                           ['ignore_person' => ['type' => Tags_DeterminePeopleType($persontype), 'id' => $id]
                            //		,'cleared'=>false ,'startcount'=>1
                           ]);
    echo "<span style='float:left;'>";
    echo "<a href='?marketing-notes-iframe.php&action=edit&id={$id}&persontype={$persontype}&note_id={$note['id']}' class='save-blue'>" .
         _('Edit') . "</a>";
    echo "  ";
    echo "<a href='?marketing-notes-iframe.php&action=delete&id={$id}&persontype={$persontype}&note_id={$note['id']}' class='minus_iconic'>" .
         _('Remove') . "</a>";
    echo "</span>";
    echo "<div style='clear:both;'></div>";
    echo "</div>";
    echo "<div style='clear:both;'></div>";
  }
  echo "</div><div style='clear:both;'></div>";
}


?>

</div>
<?php if (!$noHeight) { ?>
    <div>
        <form method="post" action="index.php?marketing-notes-iframe.php&id=<?= $id ?>&persontype=<?= $persontype ?>">
            <textarea name='comment' rows='3' style='width:98%;'></textarea>
          <?php echo Tags_UIEdit(TAGGING_MEETING_NOTE, 0, ['button-size' => '12px;']); ?>
            <input type='hidden' name='action' value='marketing_comment'/>
            <input type='submit' class='instadisable save-green' value='Add Note' style='float:right;'/>
        </form>
    </div>
<?php } ?>

<script>
  var changed = 0;
  $(function () {
    $("select,input").change(function () {
      if (!$(this).hasClass("nochange")) {
        changed = 1;
      }
    });
    $('a.fancybox').click(function (event) {
      event.preventDefault();
      window.parent.$.fancybox({type: 'iframe', href: this.href});
    });
    $('.instadisable').click(function () {
      var e = $(this);
      setTimeout(function () {
        e.prop("disabled", "disabled");
      }, 10);
    });
  });
  window.onbeforeunload = function () {
    if (changed) {
      return "<?= get_migration_confirmation('Your meeting note has not been saved.')?>";
    }
  };
</script>

</body>
</html>
