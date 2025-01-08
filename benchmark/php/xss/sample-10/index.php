<?php
// State get param is required
if (empty($_GET["state"])){
    echo 'No state param.';
    exit;
}
// Show error
if (!empty($_GET["error"])){
    echo $_GET["error_description"];
    exit;
}
