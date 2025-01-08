<?php
$action = $_GET['action'];
if ($action == 'show') {
	$post = isset($_POST['postId']) ? $_POST['postId'] : false;
	if ($post) $post = PostRepo::getPost($post);
	if ($post) $post = json_encode($post);
	echo $post;
}
