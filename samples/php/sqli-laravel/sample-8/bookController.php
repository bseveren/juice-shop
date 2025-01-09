<?php
class BookController extends Controller {
    use GeneratesUniqueHashes;

    private function newHash($manager_id = 0, $customer_id = 0): string
    {
        if (!is_numeric($manager_id) || $manager_id === 0) {
            $manager_id = 'NULL';
        }
        if (
            (is_numeric($manager_id) && $manager_id > 0) ||
            (!is_numeric($customer_id) || $customer_id === 0)
        ){
            $customer_id = 'NULL';
        }
        BookModel::query()->insert(values: [
            'hash' => $hash = $this->generateUniqueHash(table: 'book'),
            'manager_id' => DB::raw($manager_id),
            'customer_id' => DB::raw($customer_id),
            'created_at' => DB::raw('now()'),
        ]);
        return $hash;

}
