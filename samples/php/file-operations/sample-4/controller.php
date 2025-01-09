<?php

namespace controllers\cron\daily;

use App\services\http\Curl;
use Core\facades\Logger;
use League\Route\Http\Exception\BadRequestException;

class saveCvePocs implements \controllers\controllerInterface
{
    public function __construct(
        private \App\repositories\cve_pocs\cvePocs $cvePocsRepo,
    ) {}

    public function handleRequest($request, $args, $response)
    {
        set_time_limit(30*60);

        $poc_in_gh_repo_download_url = "https://github.com/nomi-sec/PoC-in-GitHub/archive/master.zip";

        $file_content = @file_get_contents($poc_in_gh_repo_download_url);

	}
}
