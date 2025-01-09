<?php
class Smarty_Template_Compiled
{
	public $exists = null;
	public $filepath = null;
	public $timestamp = null;

	function __construct(Smarty_Internal_Template $_template)
	{

		$source = &$_template->source;
		$smarty = &$_template->smarty;
		$this->filepath = $smarty->getCompileDir();
		if (isset($_template->compile_id)) {
			$this->filepath .= preg_replace('![^\w]+!', '_', $_template->compile_id) .
				($smarty->use_sub_dirs ? DS : '^');
		}
		// if use_sub_dirs, break file into directories
		if ($smarty->use_sub_dirs) {
			$this->filepath .= $source->uid[0] . $source->uid[1] . DS . $source->uid[2] . $source->uid[3] . DS .
				$source->uid[4] . $source->uid[5] . DS;
		}
		$this->filepath .= $source->uid . '_';
		if ($source->isConfig) {
			$this->filepath .= (int) $smarty->config_read_hidden + (int) $smarty->config_booleanize * 2 +
				(int) $smarty->config_overwrite * 4;
		} else {
			$this->filepath .= (int) $smarty->merge_compiled_includes + (int) $smarty->escape_html * 2;
		}
		$this->filepath .= '.' . $source->type;
		$basename = $source->handler->getBasename($source);
		if (!empty($basename)) {
			$this->filepath .= '.' . $basename;
		}
		if ($_template->caching) {
			$this->filepath .= '.cache';
		}
		$this->filepath .= '.php';
		$this->timestamp = $this->exists = is_file($this->filepath);
		if ($this->exists) {
			$this->timestamp = filemtime($this->filepath);
		}
	}

	function loadCompiledTemplate(Smarty_Internal_Template $_smarty_tpl)
	{
		if (function_exists('opcache_invalidate') && strlen(ini_get("opcache.restrict_api")) < 1) {
			opcache_invalidate($this->filepath, true);
		} elseif (function_exists('apc_compile_file')) {
			apc_compile_file($this->filepath);
		}
		if (defined('HHVM_VERSION')) {
			eval("?>" . file_get_contents($this->filepath));
		} else {
			include($this->filepath);
		}
	}
}
