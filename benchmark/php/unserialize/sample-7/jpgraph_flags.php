<?php
DEFINE('FLAGSIZE1',1);
DEFINE('FLAGSIZE2',2);
DEFINE('FLAGSIZE3',3);
DEFINE('FLAGSIZE4',4);

class FlagImages {
    private $iFlagSetMap = array(
    FLAGSIZE1 => 'flags_thumb35x35',
    FLAGSIZE2 => 'flags_thumb60x60',
    FLAGSIZE3 => 'flags_thumb100x100',
    FLAGSIZE4 => 'flags'
    );

    private $iFlagData ;
    private $iOrdIdx=array();

    function __construct($aSize=FLAGSIZE1) {
        switch($aSize) {
            case FLAGSIZE1 :
            case FLAGSIZE2 :
            case FLAGSIZE3 :
            case FLAGSIZE4 :
                $file = dirname(__FILE__).'/'.$this->iFlagSetMap[$aSize].'.dat';
                $fp = fopen($file,'rb');
                $rawdata = fread($fp,filesize($file));
                $this->iFlagData = unserialize($rawdata);
                break;
            default:
                JpGraphError::RaiseL(5001,$aSize);
                //('Unknown flag size. ('.$aSize.')');
        }
        $this->iFlagCount = count($this->iCountryNameMap);
    }

}
