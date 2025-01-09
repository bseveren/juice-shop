<?php
$id=intval($_POST['id']);
$sql="SELECT * FROM product WHERE id ='$id'";
$query=mysqli_query($conn,$sql);
$product=mysqli_fetch_array($query);
$unitPrice = floatval($product['price']);

echo '  <span>'.$product['name'].' ('.$unitPrice.'$)</span><br>
		<div class="checkout-total">
                      <p id="total-price">TOTAL PRICE: '.$_POST['quantity']*$unitPrice.'$</p>
                      <button id="check-out" type="submit" name="buy">Order</button>
        </div>';
