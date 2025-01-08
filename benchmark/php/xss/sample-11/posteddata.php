	<table border="1" cellspacing="0" id="outputSample">
		<colgroup><col width="120"></colgroup>
		<thead>
			<tr>
				<th>Field&nbsp;Name</th>
				<th>Value</th>
			</tr>
		</thead>
<?php

if ( isset( $_POST ) )
	$postArray = &$_POST ;			// 4.1.0 or later, use $_POST
else
	$postArray = &$HTTP_POST_VARS ;	// prior to 4.1.0, use HTTP_POST_VARS

foreach ( $postArray as $sForm => $value )
{
	$postedValue = htmlspecialchars( $value ) ;
?>
		<tr>
			<th style="vertical-align: top"><?php echo $sForm?></th>
			<td><pre class="samples"><?php echo $postedValue?></pre></td>
		</tr>
	<?php
}
?>
	</table>
