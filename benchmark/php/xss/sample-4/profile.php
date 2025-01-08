<?php
$isAdmin = (isset($_SESSION['user']['is_admin']) && 1 == $_SESSION['user']['is_admin']);

if(!empty($_GET['id'])) {
    $userId =  $_GET['id'];
}
else {
    error(404, 'User could not be found (No "id" provided).');
}

// find user in database
try {
    if(false !== $userId) {
        $user = $model->getUserData($userId);
        if (count($user) <= 0) {
            error(404, 'User could not be found (Wrong "id" provided)');
        }
    }
}
catch (Exception $ex) {
    error(500, 'Could not query given user from Database', $ex);
}

// find user's threads/posts
try {
    $posts = $model->getPostsByUser($userId);
}
catch(Exception $ex) {
    error(500, 'Could not query posts of given user from Database', $ex);
}

?>
<div class="row">
    <div class="col-lg-12">
        <h1>
            <?php echo $user[0]['username']; ?>'s Profile
            <?php
            if(isset($_SESSION['user']['id']) &&  $userId === $_SESSION['user']['id']) {
                echo '<span class="pull-right"><a href="?page=editprofile" class="btn btn-primary">Edit your profile</a></span>';
            }
            elseif($isAdmin) {
                echo '<span class="pull-right"><a href="?page=editprofile&id=' . $userId . '" class="btn btn-primary">Edit this profile</a></span>';
            }
            ?>
        </h1>
    </div>
</div>
