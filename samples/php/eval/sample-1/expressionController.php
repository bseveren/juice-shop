<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;

class expressionController
{
	private static $expressionRegex = '/^(\d|\(|\)|\*|\/|\+|\-|%|\^|\.|\s)+$/';

	public function computeFormula(
		#[MapQueryParameter] string $formula,
	): Response {
		if (preg_match(self::$expressionRegex, $formula)) {
			$result = eval('return ' . $formula . ';');
			if ($result === false) {
				$result = Config::$BAD_FORMULA;
			}
		} else {
			$result = Config::$BAD_FORMULA;
		}

		return new Response($result);
	}
}
