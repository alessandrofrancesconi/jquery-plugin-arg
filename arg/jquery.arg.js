/*
 * ARG! Automatic Rapid Gallery!
 * jQuery plugin for creating galleries from multiple image folders
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

(function( $ ){

	// Core variables
	var ARG_VERSION = '2.0';
	var SCRIPT_LOCATION = getScriptLocation('jquery.arg.js');
	var GRAPHICS_PATH = SCRIPT_LOCATION+'arg_graphics';
	var PHPFUNCTIONS_PATH = SCRIPT_LOCATION+'arg_scripts/arg_phpFunctions.php';
	var OPEN_ALBUM_PREFIX = 'arg-openAlbum-';
	var ROOT_DIR_ID = 'R';
	
	var thumbnailer_busy = false;
	
	// Init function
	$.fn.arg = function( options ) {
	
		var defaultSettings = {
			// General settings
			'folder' : './',
			'galleryTitle' : '',
			// Graphic settings
			'randomShowcase' : true,
			'backgroundColor' : '#fff',
			'navigatorColor' : '#000',
			'navigatorOpacity' : 0.6,
			'galleryTitleColor' : '#000',
			'galleryFont' : 'Verdana',
			'albumListColor' : '#fff',
			'currentAlbumColor' : '#d5e8ff',
			'thumbWidth' : 150,
			'thumbHeight' : 120,
			'photoBorder' : 2,
			'photoBorderColor' : '#cfcfcf'
		};
		
		if ( !(jQuery.data(document.body, 'popup-initialized') == true) ) {
			// Popup container, added only one time, initially invisible
			var popup = $(''+
				'<div id="arg-popup">'+
					'<div id="arg-popup-content" class="arg-popup-window"></div>'+
					'<div id="arg-popup-mask"></div>'+
				'</div>'
			);
			$('body').prepend(popup);
		
			$('.arg-popup-window .arg-popup-close').click(function (e) {
				e.preventDefault();
				$('#arg-popup-mask, .arg-popup-window').hide();
			});
			$('#arg-popup-mask').click(function () {
				$(this).fadeOut(200);
				$('.arg-popup-window').fadeOut(200);
			});
			
			jQuery.data(document.body, 'popup-initialized', true);
		}
		
		// Starts initializing every gallerizable element
		return this.each(function() {
			var frame = $(this); // For convenience...
			if ( options ) { 
				var frameSettings = $.extend( {} , defaultSettings, options ); // Merge user options into this frame settings
				frameSettings.folder = '../'+(frameSettings.folder).replace(/ /g,'%20'); // White spaces fix for ajax calls
				jQuery.data(frame, 'settings', frameSettings); // Store new settings relative to this frame
			}
			initFrame(frame);
		});
	}
	
	// Initializes a given frame with home showcase and navigator
	function initFrame(frame) {
		// Sets up some status variables related to this frame
		jQuery.data(frame, 'loaded_album', -1);
		jQuery.data(frame, 'navigator_initialized', false);
		jQuery.data(frame, 'navigator_busy', false);
		jQuery.data(frame, 'navigator_control', false);
		
		var frameSettings = jQuery.data(frame, 'settings'); // Gets this frame settings
		
		// Main content element (initially with loading message)
		frame.addClass('arg-frame'); 
		frame.css( {
			'background-color' : frameSettings.backgroundColor,
			'font-family' : frameSettings.galleryFont
		});
		var container = $('<div class="arg-container"><div class="arg-warning"><img src="'+GRAPHICS_PATH+'/arg_loading.gif" alt="Loading gallery..." width="152px" height="110px" /></div></div>');
		frame.append(container); // adds the photo container inside the frame
		
		loadRootShowcase(frame);
	}
	
	// Loads the root view on the given frame, plus the navigator if it's not initialized
	function loadRootShowcase(frame) {
		if ( (jQuery.data(frame, 'loaded_album') == ROOT_DIR_ID) ) return;
		
		var frameSettings = jQuery.data(frame, 'settings'); // Gets this frame settings
		var loadNavigator = !(jQuery.data(frame, 'navigator_initialized'));
		var navigator = null;
		if ( loadNavigator ) {
			// Creates navigator element
			navigator = $(''+
				'<div class="arg-navigator">' + 
					'<div class="arg-navigatorTitle">Albums</div>' + 
					'<ul class="arg-navigatorList"></ul>' +
					'<img class="arg-aboutIcon" src="'+GRAPHICS_PATH+'/arg_about.png" alt="About ARG!" width="25px" height="25px" />' +
				'</div>'
			);
			navigator.css('background-color', frameSettings.navigatorColor);
			navigator.fadeTo(0, frameSettings.navigatorOpacity);
			navigator.hover(function() { 
				openNavigator(frame);
			}, function () {
				closeNavigator(frame);
			});
		}

		var postData = 'action=getAlbumList&dir='+frameSettings.folder+'&random='+frameSettings.randomShowcase+'&width='+frameSettings.thumbWidth+'&height='+frameSettings.thumbHeight;
		
		$.ajax({
			type: 'POST',
			url: PHPFUNCTIONS_PATH,
			data: postData,
			dataType: 'xml',
			cache: !frameSettings.randomShowcase,
			success: function(xml){
				$('.arg-container', frame).hide();
				jQuery.data(frame, 'loaded_album', ROOT_DIR_ID);
				if ( loadNavigator ) $('.arg-navigatorList', navigator).append('<li class="arg-openAlbum" id="arg-openAlbum-R">Home</li>');
				$('.arg-container', frame).html('<div class="arg-preview"><div class="arg-galleryTitle">'+frameSettings.galleryTitle+'</div>');
				$('.arg-galleryTitle', frame).css('color', frameSettings.galleryTitleColor);
				
				$(xml).find('album').each(function() {
					var id  = $(this).attr('id');
					var title = $(this).attr('title');
					var preview = $(this).attr('preview');
					
					if ( loadNavigator ) $('.arg-navigatorList', navigator).append('<li class="arg-openAlbum" id="arg-openAlbum-'+ id +'">&nbsp;&nbsp;'+ title +'</li>');
					$('.arg-container .arg-preview', frame).append('<img class="arg-openAlbum" id="arg-openAlbum-'+ id +'" src="'+ preview +'" title="'+ title +'" width="'+ frameSettings.thumbWidth +'px" height="'+ frameSettings.thumbHeight +'px" alt="'+ title +'" />');
				});
				$('.arg-container', frame).append('</div>');
				$('.arg-preview img', frame).css({
					'border' : (frameSettings.photoBorder+2)+'px solid '+frameSettings.photoBorderColor
				});
				
				if ( loadNavigator ) {
					frame.prepend(navigator);
					$('img.arg-aboutIcon', frame).unbind();
					$('img.arg-aboutIcon', frame).click(function() {
						showAbout(frame);
					});
					jQuery.data(frame, 'navigator_initialized', true);
				}
				
				// Mouse bindings
				$('.arg-openAlbum', frame).unbind();
				$('.arg-preview img', frame).mouseenter(function() {
					$(this).css('border', (frameSettings.photoBorder+2)+'px solid '+frameSettings.navigatorColor);
				}).mouseleave(function() {
					$(this).css('border', (frameSettings.photoBorder+2)+'px solid '+frameSettings.photoBorderColor);
				});
				$('.arg-openAlbum', frame).click(function() {
					$('li.arg-openAlbum', frame).css({'color' : frameSettings.albumListColor, 'font-weight' : 'normal'});
					$(this).css({'color' : frameSettings.currentAlbumColor, 'font-weight' : 'bold'});
					
					var selected_album = $(this).attr('id').substring(OPEN_ALBUM_PREFIX.length, $(this).attr('id').length);
					if ( selected_album == ROOT_DIR_ID ) loadRootShowcase(frame);
					else loadAlbum(frame, selected_album);
				});		
				$('.arg-container', frame).fadeIn(400);
			},
			error: function(){
				printWarning('Error initializing root showcase :(', frame);
			}
		});
	}
	
	// Loads an album into a frame
	function loadAlbum(frame, albumId) {
		if ( (albumId == jQuery.data(frame, 'loaded_album')) || (albumId == ROOT_DIR_ID) ) return;
		
		var frameSettings = jQuery.data(frame, 'settings'); // Gets this frame settings
		var postData = 'action=getThumbs&folderId='+albumId+'&currentDir='+frameSettings.folder+'&width='+frameSettings.thumbWidth+'&height='+frameSettings.thumbHeight;
		
		$.ajax({
			type: 'POST',
			url: PHPFUNCTIONS_PATH,
			data: postData,
			dataType: 'xml',
			cache: true,
			beforeSend: function(){
				$('.arg-container', frame).html('<div class="arg-warning"><img src="'+GRAPHICS_PATH+'/arg_loading.gif" alt="Loading gallery..." width="152px" height="110px" /></div>');
			},
			success: function(xml){
				jQuery.data(frame, 'loaded_album', albumId);
				$('.arg-container', frame).hide();
				$('.arg-container', frame).html('<div class="arg-preview">');
				$(xml).find('thumb').each(function() {
					var title = $(this).attr('title');
					var preview = $(this).attr('src');
					var original = $(this).attr('original');
					
					$('.arg-container .arg-preview', frame).append('<img class="arg-openPhoto" id="'+ original +'" src="'+ preview +'" title="'+ title +'" width="'+ frameSettings.thumbWidth +'px" height="'+ frameSettings.thumbHeight +'px" alt="'+ title +'" />');
				});
				$('.arg-container', frame).append('</div>');
				$('.arg-preview img', frame).css({
					'border' : frameSettings.photoBorder+'px solid '+frameSettings.photoBorderColor
				});
				
				// Mouse bindings
				$('.arg-preview img', frame).mouseenter(function() {
					$(this).css('border', (frameSettings.photoBorder)+'px solid '+frameSettings.navigatorColor);
				}).mouseleave(function() {
					$(this).css('border', (frameSettings.photoBorder)+'px solid '+frameSettings.photoBorderColor);
				}).click(function() {
					showImage($(this));
				});
				
				$('.arg-openAlbum', frame).css({'color' : frameSettings.albumListColor, 'font-weight' : 'normal'});
				$('#'+OPEN_ALBUM_PREFIX+albumId, frame).css({'color' : frameSettings.currentAlbumColor, 'font-weight' : 'bold'});
				$('.arg-container', frame).fadeIn(400);
			},
			error: function(){
				printWarning('Error opening album :(', frame);
			}
		});
	}
	
	// Animates the navigator opening in a given frame
	function openNavigator(frame) {
		if ( jQuery.data(frame, 'navigator_control') ) return;
		
		jQuery.data(frame, 'navigator_busy', true);
		var maxHeight = $('.arg-navigatorTitle', frame).height() + $('.arg-navigatorList', frame).height() + $('.arg-aboutIcon', frame).height() + 15;
		$('.arg-navigator', frame).animate({ opacity: 1, height: maxHeight }, 300, function() { 
			jQuery.data(frame, 'navigator_busy', false);
			jQuery.data(frame, 'navigator_control', true);
		});
	}

	// Animates the navigator closing in a given frame
	function closeNavigator(frame) {
		if ( !(jQuery.data(frame, 'navigator_control')) ) return;
		
		jQuery.data(frame, 'navigator_busy', true);
		$('.arg-navigator', frame).animate({ opacity: jQuery.data(frame, 'settings').navigatorOpacity, height: '30px' }, 300, function() { 
			jQuery.data(frame, 'navigator_busy', false);
			jQuery.data(frame, 'navigator_control', false);
		});
	}
	
	// Shows a popup displaying the selected image, scaled to fit the screen if larger
	function showImage(imageObj) {
		var winW = $(window).width();
		var winH = $(window).height();
		
		var image = $(''+
			'<div class="arg-popup-image">' + 
				'<img src="'+GRAPHICS_PATH+'/arg_loading_small.gif" alt="Loading image" width="69px" height="50px" />' +
			'</div>'
		);
		
		var maskHeight = $(document).height();
		var maskWidth = $(window).width();
		
		$('#arg-popup-mask').css({'width' : maskWidth, 'height' : maskHeight});
		   
		$('#arg-popup-mask').fadeTo(200, 0.5);  
		
		$('#arg-popup-content').html('<div class="arg-popup-image">'+image.html()+'</div>');
		$('#arg-popup-content').css( {
			'top' : (winH/2-$('#arg-popup-content').height()/2)+$(window).scrollTop(),
			'left': winW/2-$('#arg-popup-content').width()/2
		});
		$('#arg-popup-content').fadeIn(200);
		
		var loadedImage = new Image();
		loadedImage.name = imageObj.attr('title');
		loadedImage.onload = function() {
			var scaleFact;
			if ( loadedImage.width > winW-100 || loadedImage.height > winH-100 )
				scaleFact = Math.min(winW-100 / loadedImage.width, (winH-100) / loadedImage.height);
			else scaleFact = 1;
			
			var scaledW = Math.round(loadedImage.width*scaleFact);
			var scaledH = Math.round(loadedImage.height*scaleFact);
			
			$('.arg-popup-image').html('<img src="'+ imageObj.attr('id') +'" width="'+ scaledW +'px" height="'+ scaledH +'px" alt="'+ imageObj.attr('title') +'" title="'+ imageObj.attr('title') +'" />');
			$('#arg-popup-content').css( {
				'top' : (winH/2-$('#arg-popup-content').height()/2)+$(window).scrollTop(),
				'left': winW/2-$('#arg-popup-content').width()/2
			});
		};
		loadedImage.onerror = function() {			
			var maskHeight = $(document).height();
			var maskWidth = $(window).width();
			
			$('.arg-popup-image').html('<div class="arg-popup-error">Can\'t load fullsize image :(</div>');
			$('#arg-popup-content').css( {
				'top' : (winH/2-$('#arg-popup-content').height()/2)+$(window).scrollTop(),
				'left': winW/2-$('#arg-popup-content').width()/2
			});
		};
		loadedImage.src = imageObj.attr('id');
	}
	
	// Shows a popup displaying the about window
	function showAbout(frame) {
		var about = $(''+
			'<div class="arg-aboutBox">' + 
				'<img src="'+GRAPHICS_PATH+'/arg_logo_small.png" alt="" width="142px" height="91px" /><br />' +
				'<span class="arg-aboutTitle">ARG! Automatic Rapid Gallery!</span><br />' +
				'Version '+ARG_VERSION+'<br /><br />' +
				'Created by <a href="http://www.alessandrofrancesconi.it/projects/arg" target="_blank">Alessandro Francesconi</a><br /><br />' +
				'<div style="font-size: 10px; font-style: italic">This plugin uses <a href="http://phpthumb.gxdlabs.com/" target="_blank">PHP Thumb</a> for thumbnails generation.<br />Many thanks to the authors ;)</div>' +
			'</div>'
		);
		
		closeNavigator(frame);
		
		var maskHeight = $(document).height();
		var maskWidth = $(window).width();
		
		$('#arg-popup-mask').css({'width' : maskWidth, 'height' : maskHeight});
		   
		$('#arg-popup-mask').fadeTo(200, 0.5);  
		
		var winW = $(window).width();
		var winH = $(window).height();
		$('#arg-popup-content').html('<div class="arg-aboutBox">'+about.html()+'</div>');
		$('#arg-popup-content').css( {
			'top' : (winH/2-$('#arg-popup-content').height()/2)+$(window).scrollTop(),
			'left': winW/2-$('#arg-popup-content').width()/2
		});
		$('#arg-popup-content').fadeIn(200);
	}
	
	// Prints a warning message inside the given frame
	function printWarning(message, frame) {
		closeNavigator(frame);
		$('.arg-container', frame).html('<div class="arg-warning">'+message+'</div>');
	}
	
	// Finds the location of an included script file
	function getScriptLocation(scriptName) {
		var scripts = document.getElementsByTagName('script');
		var find = false;
		var i = 0;
		var location = '';
		while (!find && i < scripts.length) {
			if ( scripts[i].src.toLowerCase().indexOf(scriptName.toLowerCase()) != -1 ) {
				location = scripts[i].src;
				find = true;
			}
			i++;
		}
		
		return location.substring(0, location.lastIndexOf('/')+1);
	}
})( jQuery );