<?php

class CpuLimiter
{
    private $whitelist = ['php', 'node', 'nginx', 'apache2'];

    public function limitCpu($process, $maxCpuPercent = 40)
    {
        $processPath = $this->which($process);
        if ($processPath) {
            exec('cpulimit -P ' . $processPath . ' -l ' . $maxCpuPercent . ' > /dev/null 2>&1 &');
        } else {
            echo "Process not allowed or not found.";
        }
    }

    private function which($process)
    {
        if (in_array($process, $this->whitelist)) {
            $output = [];
            exec("which $process", $output);
            return $output[0] ?? null;
        } else {
            return null;
        }
    }
}
