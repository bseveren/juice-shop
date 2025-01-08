<?php
class PHPExcel_CachedObjectStorage_Memcache extends PHPExcel_CachedObjectStorage_CacheBase implements PHPExcel_CachedObjectStorage_ICache
{
    /**
     * Prefix used to uniquely identify cache data for this worksheet
     *
     * @var string
     */
    private $cachePrefix = null;
    /**
     * Cache timeout
     *
     * @var integer
     */
    private $cacheTime = 600;
    /**
     * Get cell at a specific coordinate
     *
     * @param     string             $pCoord        Coordinate of the cell
     * @throws     PHPExcel_Exception
     * @return     PHPExcel_Cell     Cell that was found, or null if not found
     */
    public function getCacheData($pCoord)
    {
        if ($pCoord === $this->currentObjectID) {
            return $this->currentObject;
        }
        $this->storeData();

        //    Check if the entry that has been requested actually exists
        if (parent::isDataSet($pCoord)) {
            $obj = $this->memcache->get($this->cachePrefix . $pCoord . '.cache');
            if ($obj === false) {
                //    Entry no longer exists in Memcache, so clear it from the cache array
                parent::deleteCacheData($pCoord);
                throw new PHPExcel_Exception("Cell entry {$pCoord} no longer exists in MemCache");
            }
        } else {
            //    Return null if requested entry doesn't exist in cache
            return null;
        }

        //    Set current entry to the requested entry
        $this->currentObjectID = $pCoord;
        $this->currentObject = unserialize($obj);
        //    Re-attach this as the cell's parent
        $this->currentObject->attach($this);

        //    Return requested entry
        return $this->currentObject;
    }
}
