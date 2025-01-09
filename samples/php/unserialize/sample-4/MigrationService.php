<?php
class MigrationService
{
	public function migrateRelatedItems(): void
	{
		$items = Item::select('id', 'related')->whereNotNull('related')->get();
		foreach ($items as $item) {
			$relatedItemsString = unserialize($item->related);
			$relatedItems = explode(',', $relatedItemsString);
			if ($relatedItems[0] != '') {
				foreach ($relatedItems as $relatedItem) {
					if ($relatedItem != '') {
						$related = Item::where('id', $relatedItem)->first();
						if (!$related) {
							continue;
						}
						ItemRelated::create([
							'item_id' => $item->id,
							'related_to' => $relatedItem,
						]);
					}
				}
			}
		}
	}
}
