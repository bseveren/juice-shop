<?php
/**
 * Maybe unserialize, but don't allow any classes.
 *
 * @since 6.1
 *
 * @param string $data String to be unserialized, if serialized.
 * @return mixed The unserialized, or original data.
 */
function acf_maybe_unserialize( $data ) {
	if ( is_serialized( $data ) ) { // Don't attempt to unserialize data that wasn't serialized going in.
		return @unserialize( trim( $data ), array( 'allowed_classes' => false ) ); //phpcs:ignore -- allowed classes is false.
	}

	return $data;
}
