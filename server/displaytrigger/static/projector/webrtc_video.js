navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var webrtc_video = {};

// http://stackoverflow.com/questions/12160174/always-accept-webrtc-webcam-request
//  /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --use-fake-ui-for-media-stream

// Display ---------------------------------------------------------------------

(function(external, options){
	options = _.extend({
		selector_holder: '#offscreen_video_feeds',
		fps: 5,
	}, options);
	
	var videos = [];
	
	function errorCallback(error) {
		console.log('error: ', error);
	}
	
	function assignStreamToVideoElement(stream, video_element) {
		if (window.URL) {
			video_element.src = window.URL.createObjectURL(stream);
		} else {
			video_element.src = stream;
		}
	}
	
	function getAllVideoDevices(openStreamSuccessCallback, openStreamErrorCallback) {
		MediaStreamTrack.getSources(function (media_sources) {
			_.each(_.filter(media_sources, function(media_source){return media_source.kind == 'video'}), function(media_source, index, list){
				var constraints = {
					audio: false,
					video: {
						mandatory: {
							minWidth: 640, minHeight: 480,
							maxWidth: 1024, maxHeight: 768,
						},
						optional: [{
							sourceId: media_source.id
						}],
					},
				};
				navigator.getUserMedia(constraints, openStreamSuccessCallback, openStreamErrorCallback);
			});
			
		});
	}
	
	function openNewStream(stream) {
		var $video = $('<video/>');
		$video.attr('autoplay', true);  // http://stackoverflow.com/questions/20822833/only-one-frame-displayed-webrtc-stream
		var video = $video[0];
		assignStreamToVideoElement(stream, video);
		var $canvas = $('<canvas/>');
		var canvas = $canvas[0];
		canvas.width = 320;
		canvas.height = 200;
		var context = canvas.getContext('2d');
		
		videos.push({
			stream: stream,
			canvas: canvas,
			conext: context,
		});
		
		var $container = $(options.selector_holder);
		$container.append($video);
		$container.append($canvas);
		
		function update_video_canvas() {
			if (video.paused || video.ended) {return};
			context.drawImage(video, 0, 0, canvas.width, canvas.height);
			setTimeout(update_video_canvas, Math.floor(1000/options.fps));
		};
		$video.on('play', update_video_canvas);
	}

	function initVideoDevices() {
		getAllVideoDevices(openNewStream, errorCallback);
	}

	external.initVideoDevices = initVideoDevices;
}(
	webrtc_video,{
	}
));
