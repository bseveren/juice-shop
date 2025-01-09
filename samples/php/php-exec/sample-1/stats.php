<?php

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $process = isset($_GET['process']) ? $_GET['process'] : null;
    $maxCpuPercent = isset($_GET['maxCpuPercent']) ? intval($_GET['maxCpuPercent']) : 40;

    if ($process) {
        $controller = new PsStatsService();
        $controller->limitCpuAction($process, $maxCpuPercent);
    } else {
        echo "Please provide a process name.";
    }
}
