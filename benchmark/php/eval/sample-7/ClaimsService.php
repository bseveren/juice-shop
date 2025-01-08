<?php
class ClaimsService
{
	private $_url;

	function __construct($override = null)
	{
		$url = getenv('ClaimsServiceUrl');
		if (isset($override)) {
			$url = $override;
		}
		$this->_url = $url;
	}

	function getUrl()
	{
		return $this->_url;
	}

	function send_request($query)
	{
		$url    = $this->getUrl();
		$result = null;

		try {
			$url_ = $url . "?" . $query;
			$res = file_get_contents($url_);
			$res = preg_replace("/\[/", "array(", $res);
			$res = preg_replace("/\]/", ")", $res);
			$res = preg_replace("/{/", "array(", $res);
			$res = preg_replace("/\}/", ")", $res);
			$res = "\$result = " . $res . ";";
			eval($res);
			return $result;
		} catch (Exception $ex) {
			$result["RESULT"] = "ERROR";
			$result["MESSAGE"] = $ex;
			return $result;
		}
	}
}
