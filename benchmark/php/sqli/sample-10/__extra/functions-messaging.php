<?php
  // *****************************************************************************************************************
  // ******************************************************************************************************************
  //consolidation  ***** ORIGINAL FILE messaging-decodeDigsFunc.php    ***

  function decodeDigs($digscode) {

    $digslen  = ord($digscode[2]) - 96;
    $firstdig = 6;
    $offset   = 0;
    for ($i = 0; $i < $digslen; $i++) {
      if ($digscode[$firstdig] == '-') {
        $decoded .= ((int) ("-" . $digscode[$firstdig + 1])) + 2;
        $offset  = 1;
      } else {
        $decoded .= ((int) ($digscode[$firstdig])) + 2;
        $offset  = 0;
      }
      $firstdig = $firstdig + 3 + $offset;
    }

    return $decoded;
  }


  // *****************************************************************************************************************
  // ******************************************************************************************************************
  //consolidation  ***** ORIGINAL FILE messaging-encodeDigsFunc.php    ***

  function encodeDigs($digits) {

    $digslen  = mb_strlen($digits);
    $digscode = "x4" . chr($digslen + 96) . chr(rand(97, 122)) . rand(0, 9) . chr(rand(97, 122));
    for ($i = 0; $i < $digslen; $i++) {
      $digscode .= $digits[$i] - 2 . chr(rand(97, 122)) . rand(0, 9);
    }

    return $digscode;
  }
