<?php

namespace de\flashpixx\evalphp;

class filter
{

	/** content filter function for get the tags
	 * @param $pcContent Content
	 **/
	static function runInline($pcContent)
	{
		return preg_replace_callback("!\[evalphp(.*)\](.*)\[/evalphp\]!isU", "de\\flashpixx\\evalphp\\filter::actionInline", $pcContent);
	}

	/** create action on inline code
	 * @param $pa Array with founded regular expressions
	 * @return output
	 **/
	static function actionInline($pa)
	{
		if ((empty($pa)) || (count($pa) != 3))
			return null;

		return self::runCode(self::splitParameter($pa[1]), $pa[2]);
	}



	/** run the code
	 * @param $param input parameter
	 * @param $code input code
	 **/
	private static function runCode($param, $code = null)
	{
		$option = get_option("fpx_evalphp_option");

		// setup includes
		$lcCode = "";
		foreach ($param["include"] as $val)
			if (array_key_exists($val, $option["functions"]))
				$lcCode .= $option["functions"][$val];

		// set code if allowed
		if (!$option["rundefinedonly"])
			$lcCode .= $code;

		// check disallowed
		foreach ($option["disallowed"] as $val)
			if ((!empty($val)) && (strpos($lcCode, $val) !== false)) {
				if (current_user_can("edit_pages") || current_user_can("edit_posts"))
					return sprintf(__("The keyword [%s]  is denied for using", "evalphp"), $val);
				return null;
			}

		// run code and get error message
		if (empty($lcCode))
			return null;

		$content = self::evalrun($lcCode);
		$error = error_get_last();
		if ((!empty($error)) && (strpos($error["file"], "evalphp/filter.class.php") !== false))
			return $error["message"];

		return $content;
	}

	/** splits the tag parameter
	 * @param $pa input string
	 * @return array with parameter data
	 **/
	private static function splitParameter($pa)
	{
		// split the parameters
		$param		= array();
		$tagparam   = preg_split('/\G(?:"[^"]*"|\'[^\']*\'|[^"\'\s]+)*\K\s+/', $pa, -1, PREG_SPLIT_NO_EMPTY);
		foreach ($tagparam as $val) {
			// remove double / single quotes
			$lcTag = str_replace("\"", null, $val);
			$lcTag = str_replace("'", null, $lcTag);

			// find first occurence of = and split the string
			$laTag = preg_split('/=/', $lcTag, 2);
			if (count($laTag) == 2)
				$param[trim($laTag[0])] = trim($laTag[1]);
		}

		if (array_key_exists("include", $param))
			$param["include"] = array_map("trim", explode(" ", $param["include"]));
		else
			$param["include"] = array();


		return $param;
	}

	/** eval function
	 * @return the output buffer
	 **/
	private static function evalrun()
	{
		if (func_num_args() != 1)
			return null;

		ob_start();
		eval(func_get_arg(0));
		$content = ob_get_contents();
		ob_end_clean();

		return $content;
	}
}
