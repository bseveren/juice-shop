<?php
$docs = array(
    'readme'         => array( 'type' => 'markdown', 'legend' => 'Read Me', 'file' => 'README.md' ),
    'PDF'            => array( 'type' => 'html' ,'legend' => 'PDF Guide', 'file' => 'docs/pdf.html' ),
    'changelog'      => array( 'type' => 'markdown', 'legend' => 'Change Log', 'file' => 'CHANGELOG.md' ),
    'copying'        => array( 'type' => 'markdown', 'legend' => 'Copying', 'file' => 'COPYING.txt' ),
);

$selectedDocId = isset( $_GET[ 'doc' ] ) ? $_GET[ 'doc' ] : '';

$readFile = $selectedDocId;

$instructions = file_get_contents( DVWA_WEB_PAGE_TO_ROOT.$readFile );
