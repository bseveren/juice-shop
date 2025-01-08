<?php
namespace App\Http\Controllers;

class WebhookController extends Controller
{
     private $publicKey = <<<EOT
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn5SX3yNNiBc3BdUB8V2v
zHC3rJhdbl3Co8jDqwCAWnj+7+05zK27y61WzK/HuCXZvlAvOJt6eHAyQ6hTh301
G4dtVXSbsB1N0oRF8Nux0YpY5BjBIvym2oS1Pu1xg4yXzPGjdU7PwAQzEYdLiRfE
NkOMdQ2o1b4YRqOezOQ5VaqrR4f8bB5em6+YVKUDYAtlte6XaJ6dxG9bRoMQpzGT
zier8dnBsrm2SLFABKByx8hZ2zVlomuRL9pYshJadHjlOXmI5RF10sCrEOvwVTxI
q1vTvaLvqX0fTHgLxXBqo1NL1kRi5hEuQvtvHJUv3LwxMoBO5au93A79l0pa565S
BQIDAQAB
-----END PUBLIC KEY-----
EOT;

    public function paddleSubscription()
    {
        $public_key = openssl_get_publickey($this->publicKey);
        $signature = base64_decode($_POST['p_signature']);
        $fields = $_POST;
        unset($fields['p_signature']);
        ksort($fields);
        foreach ($fields as $k => $v) {
            if (! in_array(gettype($v), ['object', 'array'])) {
                $fields[$k] = "$v";
            }
        }

        $data = serialize($fields);
        $ok = openssl_verify($data, $signature, $public_key, OPENSSL_ALGO_SHA1);
        if ($ok != 1) {
            return response('Verification failed', 403);
        }

        $payment = unserialize($data);
        if ($payment['alert_name'] == 'payment_succeeded') {
            return response()->json([
                'status' => 'Payment succeeded',
            ], 200);
        }
        return response()->json([
            'status' => 'Payment Failed',
        ], 200);
    }
}
