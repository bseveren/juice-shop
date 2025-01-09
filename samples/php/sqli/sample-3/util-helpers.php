<?php


/**
 * IVdefpsv()  (IntVal DEFault with Safe Path Value)
 * [PUBLIC]
 *
 * @description defspv() wrapped with intval()
 */
function IVdefspv($def, $store, $path) {

  return intval(defspv($def, $store, $path));
}
