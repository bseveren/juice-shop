<?php

use D\{Response, User};
use D\Controller\{ClientController, ContactController};

require_once("includes/config_global.php");

authenticate_user();

$clientController = new ClientController($adoConnection);
$contactController = new ContactController($adoConnection);

require("includes/db/gateway.php");
require("includes/db/legacy.php");

if (!isset($_GET['ID']) || !is_numeric($_GET['ID'])) {
    Response::send(404);
}

$Profile = $clientController->getClientById($_GET['ID']);

echo '<div data-role="collapsible" data-theme="d" data-content-theme="a" data-collapsed="false">';
echo '<h3>Contacts</h3>';
echo '<ul data-role="listview" data-filter="false" data-inset="true" data-mini="true">';
$contacts = $db->query("SELECT ID, FirstName, LastName FROM clients_contacts WHERE ClientID = '".$_GET['ID']."' AND Deleted=0 ORDER BY LastName, FirstName ASC");
foreach ($contacts as $row) {
    echo '<li>';
    echo '<a href="contact.php?ID='.$row['ID'].'" data-ajax="false" >';
    echo '<h3>'.$row["FirstName"] . ' '.$row["LastName"].'</h3>';
    echo '</a></li>';
}
echo '</ul>';

if (!User::isClientReadOnly()) {
    echo '<p><a data-role="button" data-inline="true" data-theme="c" data-mini="true" href="#popup_Add_Contact" data-rel="popup"  data-position-to="window" data-icon="plus" data-iconpos="left">Add Contact</a></p>';
}

echo '</div>';