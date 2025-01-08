<?php

namespace controllers\cron\daily;

use App\services\http\Curl;
use Core\facades\Logger;
use League\Route\Http\Exception\BadRequestException;

class saveImage implements \controllers\controllerInterface
{
    public function __construct(
        private \App\repositories\images\imageRepo $imageRepo,
    ) {}

    public function handleRequest($request, $args, $response)
    {

        $image = $_POST['image'];
        $content = $_POST['content'];

		assertNoPathTraversal( $image );

        $this->imageRepo->saveImage( $image, $content );

	}


	private function assertNoPathTraversal($filename)
	{
		if( str_contains( $filename, '../') || str_contains( $filename, '..\/'))
		{
			throw new BadRequestException('invalid filenmae');
		}
	}
}
