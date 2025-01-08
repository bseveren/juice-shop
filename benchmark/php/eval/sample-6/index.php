<?php include 'header.php';?>

    <h1>
    <?php
        if (isset($_POST["expression"])){
            $expression = $_POST["expression"];
            $result = eval("return ".$expression.";");

            echo $expression.' = '. $result;
        }
    ?>
    </h1>
<?php include 'footer.php';?>
