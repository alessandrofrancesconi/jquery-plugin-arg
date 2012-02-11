<?php
	/*
	 * ARG! Automatic Rapid Gallery!
	 * jQuery plugin for creating galleries from multiple image folders
	 * 
	 *				** PHP FUNCTIONS **
	 *
	 * Examples and documentation at: http://www.alessandrofrancesconi.it/projects/arg
	 * 
	 * Copyright (c) 2011 Alessandro Francesconi
	 * 
	 * Version: 2.0 (3rd of October 2011)
	 * Requires: 
	 * 	- jQuery v1.4.3+ (latest is better)
	 *	- PHP 5+, GD (or iMagick)
	 *
	 * Licensed under the MIT license:
	 *   http://www.opensource.org/licenses/mit-license.php
	 */

	require_once 'ThumbLib.inc.php';
	
	$relative_dir = substr($_SERVER['PHP_SELF'], 0, strrpos($_SERVER['PHP_SELF'], 'arg_phpFunctions.php'));
	$supported_ext = "{*.jpg,*.JPG,*.jpeg,*.JPEG,*.gif,*.GIF,*.png,*.PNG}";
	$excluded_folders = "{.,..,_thumbs,cgi-bin}";
	$image_options = array('jpegQuality' => 75, 'preserveAlpha' => true, 'preserveTransparency' => true);
	
	if ( isset($_POST["action"]) ) {
		header('Content-type: text/xml');
		if ( $_POST["action"] == "getAlbumList" && isset($_POST["dir"]) && isset($_POST["random"]) && isset($_POST["width"]) && isset($_POST["height"]) ) {
			getAlbumList($_POST["dir"], $_POST["random"],$_POST["width"], $_POST["height"]);
		}
		else if ( $_POST["action"] == "getThumbs" && isset($_POST["currentDir"]) && isset($_POST["folderId"]) && isset($_POST["width"]) && isset($_POST["height"])) {
			getThumbs($_POST["currentDir"], $_POST["folderId"], $_POST["width"], $_POST["height"]); 
		}
	}
	else return;
	
	function getResizedImage($file, $width, $height) {
		global $excluded_folders, $supported_ext;
		$excluded_folders_array = explode(",", substr($excluded_folders, 1, -1));		
		$supported_ext_array = explode(",*.", substr($supported_ext, 3, -1));
		
		$isSafeMode = ini_get('safe_mode');
		
		$thumbFile = dirname($file).'/_thumbs/'.basename($file);
		$thumbDir = dirname($file).'/_thumbs';
		if (file_exists($thumbFile)) {
			$size = getimagesize($thumbFile);
			if ( !$isSafeMode && (($size[0] != $width) || ($size[1] != $height)) ) {
				$thumbFile = createThumb($file, $width, $height, $thumbFile);
			}
			return $thumbFile;
		}
		else {
			if (!$isSafeMode) {
				if (!is_dir($thumbDir))	{
					mkdir($thumbDir, 0777);
				}
				$thumbFile = createThumb($file, $width, $height, $thumbFile);
				return $thumbFile;
			}
			else return $file;
		}
	}
	
	function createThumb($original, $width, $height, $thumb) {
		global $image_options;
		
		$newThumb = PhpThumbFactory::create($original, $image_options);
		$newThumb->adaptiveResize($width, $height);
		$newThumb->save($thumb);
		return $thumb;
	}
	
	function getAlbumList($dir = '.',  $random = "false", $width = 150, $height = 120) {
		global $relative_dir, $supported_ext;
		
		$albumsInDir = glob("$dir/*", GLOB_ONLYDIR);
		echo ("<ARGalbums>");
		for ($i = 0; $i < count($albumsInDir); $i++){
			$last_folder_pos = strrpos($albumsInDir[$i], '/')+1;
			$title = substr($albumsInDir[$i], $last_folder_pos, strlen($albumsInDir[$i]));
			
			$showcaseImages = glob("$albumsInDir[$i]/$supported_ext", GLOB_BRACE);
			$showcaseImagesIndex = 0;
			if ($random == "true") $showcaseImagesIndex = array_rand($showcaseImages, 1);
			
			$thumb = getResizedImage($showcaseImages[$showcaseImagesIndex], $width, $height);
			echo("<album id = \"$i\" title = \"$title\" preview = \"$relative_dir$thumb\" />");
		}
		echo ("</ARGalbums>");
	}
	
	function getThumbs($dir = '.', $albumId = 0, $width = 150, $height = 120) {
		global $relative_dir, $supported_ext;
		
		$albumsInDir = glob("$dir/*", GLOB_ONLYDIR);
		$photosInAlbum = glob("$albumsInDir[$albumId]/$supported_ext", GLOB_BRACE);
		echo ("<ARGthumbs>");
		for ($i = 0; $i < count($photosInAlbum); $i++){
			$filename = substr($photosInAlbum[$i], strrpos($photosInAlbum[$i], '/')+1, strlen($photosInAlbum[$i]));
			$extension_pos = strrpos($filename, '.');
			$title = substr($filename, 0, $extension_pos);
			
			$thumb = getResizedImage($photosInAlbum[$i], $width, $height);
			echo ("<thumb title = \"$title\" src = \"$relative_dir$thumb\" original = \"$relative_dir$albumsInDir[$albumId]/$filename\" alt=\"$title\" />");
		}
		echo ("</ARGthumbs>");
	}

?>