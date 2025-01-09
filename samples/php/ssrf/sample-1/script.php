<?php
/*
    webshop health script
*/
$whitelist = ['coolblue.nl', 'bol.com', 'amazon.com', 'amazon.de'];

if (isset($_GET['webshop_host'])) {
    $host = $_GET['webshop_host'];

    if (in_array($host, $whitelist)) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "http://".$host);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $output = curl_exec($ch);

        if ($output === false) {
            echo 'Internal error: ' . curl_error($ch);
        } else {
            echo $output;
        }

        curl_close($ch);
    } else {
        echo "We only monitor the following webshops currently: " . implode(", ", $whitelist);
    }
} else {
    echo "No webshop provided.";
}
?>
