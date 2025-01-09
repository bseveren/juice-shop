<?php

// get content of directory
try {
    $rootPath = ROOT_PATH . '/../docs/';
    $path = './';
    if (isset($_GET['path']) && !empty($_GET['path']) && file_exists($rootPath . $_GET['path'])) {
        $path = $_GET['path'];
    }

    // make sure last char is a /
    if($path[strlen($path) - 1] !== '/') {
        $path .= '/';
    }

    $globList = glob($rootPath . $path . '*');
}
catch(Exception $ex) {
    error(500, 'Could not get content of directory', $ex);
}

?>

<div class="row">
    <div class="col-lg-3">
        <h1>Documentation</h1><hr/>
        <ul class="list-group">
            <?php
            if($path !== './') {
                echo '<li class="list-group-item">' . icon('folder-close') . ' <strong><a href="?page=documentation&path=' . dirname($path) . '/">..</a></strong></li>';
            }
            $files = array();
            // output directories
            foreach ($globList as $item) {
                if(is_dir($item)) {
                    echo '<li class="list-group-item">' . icon('folder-close') . ' <strong><a href="?page=documentation&path=' . $path . basename($item) . '/">' . basename($item) . '</a></strong></li>';
                }
                else {
                    $files[] = $item;
                }
            }

            // output files
            foreach ($files as $file) {
                echo '<li class="list-group-item">' . icon('file') . ' <strong><a href="?page=documentation&path=' . $path .'&file=' . basename($file) . '">' . basename($file) . '</a></strong></li>';
            }
            ?>
        </ul>
    </div>
</div>
