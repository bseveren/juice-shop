<?php

/** PHPExcel root directory */
if (!defined('PHPEXCEL_ROOT')) {
    define('PHPEXCEL_ROOT', dirname(__FILE__) . '/');
    require(PHPEXCEL_ROOT . 'PHPExcel/Autoloader.php');
}

/**
 * PHPExcel
 *
 * Copyright (c) 2006 - 2015 PHPExcel
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * @category   PHPExcel
 * @package    PHPExcel
 * @copyright  Copyright (c) 2006 - 2015 PHPExcel (http://www.codeplex.com/PHPExcel)
 * @license    http://www.gnu.org/licenses/old-licenses/lgpl-2.1.txt    LGPL
 * @version    ##VERSION##, ##DATE##
 */
class PHPExcel
{
    /**
     * Unique ID
     *
     * @var string
     */
    private $uniqueID;

    /**
     * Document properties
     *
     * @var PHPExcel_DocumentProperties
     */
    private $properties;

    /**
     * Document security
     *
     * @var PHPExcel_DocumentSecurity
     */
    private $security;

    /**
     * Collection of Worksheet objects
     *
     * @var PHPExcel_Worksheet[]
     */
    private $workSheetCollection = array();

    /**
     * Calculation Engine
     *
     * @var PHPExcel_Calculation
     */
    private $calculationEngine;

    /**
     * Active sheet index
     *
     * @var integer
     */
    private $activeSheetIndex = 0;

    /**
     * Named ranges
     *
     * @var PHPExcel_NamedRange[]
     */
    private $namedRanges = array();

    /**
     * CellXf supervisor
     *
     * @var PHPExcel_Style
     */
    private $cellXfSupervisor;

    /**
     * CellXf collection
     *
     * @var PHPExcel_Style[]
     */
    private $cellXfCollection = array();

    /**
     * CellStyleXf collection
     *
     * @var PHPExcel_Style[]
     */
    private $cellStyleXfCollection = array();

    /**
    * hasMacros : this workbook have macros ?
    *
    * @var bool
    */
    private $hasMacros = false;

    /**
    * macrosCode : all macros code (the vbaProject.bin file, this include form, code,  etc.), null if no macro
    *
    * @var binary
    */
    private $macrosCode;
    /**
    * macrosCertificate : if macros are signed, contains vbaProjectSignature.bin file, null if not signed
    *
    * @var binary
    */
    private $macrosCertificate;

    /**
    * ribbonXMLData : null if workbook is'nt Excel 2007 or not contain a customized UI
    *
    * @var null|string
    */
    private $ribbonXMLData;

    /**
    * ribbonBinObjects : null if workbook is'nt Excel 2007 or not contain embedded objects (picture(s)) for Ribbon Elements
    * ignored if $ribbonXMLData is null
    *
    * @var null|array
    */
    private $ribbonBinObjects;

    /**
     * Copy workbook (!= clone!)
     *
     * @return PHPExcel
     */
    public function copy()
    {
        $copied = clone $this;

        $worksheetCount = count($this->workSheetCollection);
        for ($i = 0; $i < $worksheetCount; ++$i) {
            $this->workSheetCollection[$i] = $this->workSheetCollection[$i]->copy();
            $this->workSheetCollection[$i]->rebindParent($this);
        }

        return $copied;
    }

    /**
     * Implement PHP __clone to create a deep clone, not just a shallow copy.
     */
    public function __clone()
    {
        foreach ($this as $key => $val) {
            if (is_object($val) || (is_array($val))) {
                $this->{$key} = unserialize(serialize($val));
            }
        }
    }
}
