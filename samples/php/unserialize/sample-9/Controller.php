<?php
class EntityController extends Controller
{
    protected static $entObj;
    public function __construct()
    {
        self::$entObj = new Entity();
    }
    public function updateTokenData(Request $request)
    {
        $entity = self::$entObj->getEntity($request->entity_id);
        $tokenData = unserialize($request->token_data);
        $service = PaymentService::create($tokenData['service']);
        $token = $service->getTokenDescriptor($tokenData);
        $entity->update([
            'token_data' => $token,
        ]);
		$entity->token_data = $token;

        return view('Entity::updateTokenData', ['entity' => $entity]);
    }
}
