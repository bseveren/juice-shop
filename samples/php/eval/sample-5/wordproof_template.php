<?php
class Template
{
	private static $template_path = 'templates/';

	public static function view($file, $data = [])
	{
		$code = self::includeFiles($file);
		$code = self::compileCode($code);
		$code = '?>' . PHP_EOL . $code . PHP_EOL . "<?php";
		extract($data, EXTR_SKIP);
		eval($code);
	}


	private static function compileCode($code)
	{
		$code = self::compileBlock($code);
		$code = self::compileYield($code);
		$code = self::compileEscapedEchos($code);
		$code = self::compileEchos($code);
		$code = self::compilePHP($code);
		return $code;
	}

	private static function includeFiles($file)
	{
		$code = file_get_contents(self::$template_path . $file);
		preg_match_all('/{% ?(extends|include) ?\'?(.*?)\'? ?%}/i', $code, $matches, PREG_SET_ORDER);
		foreach ($matches as $value) {
			$code = str_replace($value[0], self::includeFiles($value[2]), $code);
		}
		$code = preg_replace('/{% ?(extends|include) ?\'?(.*?)\'? ?%}/i', '', $code);
		return $code;
	}
}
