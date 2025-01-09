<?php

require 'CpuLimiter.php';

class PsStatsService
{
    protected $cpuLimiter;

    public function __construct()
    {
        $this->cpuLimiter = new CpuLimiter();
    }

    public function limitCpuAction($process, $maxCpuPercent = 40)
    {
        $this->cpuLimiter->limitCpu($process, $maxCpuPercent);
        echo "CPU limit set for process: $process to $maxCpuPercent%";
    }
}
