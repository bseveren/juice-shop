<?php

namespace repositories\images;

use App\services\http\Curl;
use Core\facades\Logger;
use League\Route\Http\Exception\BadRequestException;

class imageRepo
{

    public function handleRequest($image_filename, $content)
    {

		file_put_contents( "/tmp/".$image_filename, $content);

	}
}
