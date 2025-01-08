<?php
class StringUtil
{
    public static function evaluate($equation, $variables = [])
    {
        krsort($variables);
        $equation = str_replace(array_keys($variables), array_values($variables), $equation);
        $equation = preg_replace('/\bAIK_[a-z0-9]+\b/i', 0, $equation);
        $equation = str_replace(',', '.', $equation);
        $equation = preg_replace('/\s+/', '', $equation);
        $number = '((?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?|pi|π)';
        $functions = '(?:sinh?|cosh?|tanh?|acosh?|asinh?|atanh?|exp|log(10)?|deg2rad|rad2deg|sqrt|pow|abs|intval|ceil|floor|round|(mt_)?rand|gmp_fact)';
        $operators = '[\/*\^\+-,\?\:\>\<\=\&]+';
        $regexp = '/^([+-]?(' . $number . '|' . $functions . '\s*\((?1)+\)|\((?1)+\))(?:' . $operators . '(?1))?)+$/';

        $result = null;
        if (preg_match($regexp, $equation)) {
            $equation = preg_replace('!pi|π!', 'pi()', $equation);
            @$result = eval('return (float) ' . $equation . ';');
            if (is_infinite($result)) {
                $result = 0.0;
            }
        } else {
            $result = false;
        }

	return $result;
    }
}
