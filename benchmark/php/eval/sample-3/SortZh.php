<?php
class SortChineseStrings
{
	private $_zhSymbols = array();
	private $_langFile = APPLICATION_PATH . '/configs/zh.txt';

	public function __construct($lang)
	{
		if ($lang == 'zh') {
			$zhSymbols = null;
			eval(file_get_contents($this->_langFile));
			$this->_zhSymbols = $zhSymbols;
		}
	}

	public function SortChineseStrings($a, $b)
	{
		if (!empty($this->_zhSymbols)) {
			return array_search($a, $this->_zhSymbols) < array_search($b, $this->_zhSymbols);
		}
		return null;
	}
}
