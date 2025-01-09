<?php
$actual_link = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
$result = mysqli_query($conn, 'select count(id) as total from product');
$total = mysqli_fetch_assoc($result)['total'];
$total_page = 1 + ($total-1)/10;
$current_page = $_REQUEST['page'];
?>
<div class="pagination">
	<?php
	if ($current_page > 1 && $total_page > 1) {
		echo '<a href="' . $actual_link . '?page=' . ($current_page - 1) . '">&lt;</a>  ';
	}
	for ($i = 1; $i <= $total_page; $i++) {
		if ($i == $current_page) {
			echo '<a id="currentpage" href="' . $actual_link . '&page=' . $i . '">' . $i . '</a>  ';
		} else {
			echo '<a href="' . $actual_link . '?page=' . $i . '">' . $i . '</a>  ';
		}
	}
	if ($current_page < $total_page && $total_page > 1) {
		echo '<a href="' . $actual_link . '?page=' . ($current_page + 1) . '">&gt;</a>  ';
	}
	?>
</div>
