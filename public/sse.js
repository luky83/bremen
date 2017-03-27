
// Data samples are stored here
var dataSet = [];

document.addEventListener( 'DOMContentLoaded', function () {
	// Run this once after the DOM is loaded
	if (!!window.EventSource) {
		// Good example on using SSE
		// http://www.html5rocks.com/en/tutorials/eventsource/basics/

		var source = new EventSource('/stream');
		source.addEventListener('message', function(e) {
			// e.data is the SSE data, which is a two-character hexadecimal string representing a value
						var data = JSON.parse(e.data);
            handleData(data);
		}, false);
	}
	else {
		console.log('sse not supported');
	}
}, false );


function handleData(data) {
	if (window.Intl && typeof window.Intl === "object") {
		// request a weekday along with a long date
		var options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
		data.lastModified = new Intl.DateTimeFormat('it-IT',options).format(new Date(data.lastModified));
	} else {
		data.lastModified = new Date(data.lastModified).toLocaleString();
	}
	var cssClass;
	var status;
	if (data.status === 0) {
		cssClass = 'success';
		status = 'START';
		imgSrc = '/img/success_dot.png';
	}
	if (data.status === 1) {
		cssClass = 'danger';
		status = 'STOP';
		imgSrc = '/img/danger_dot.png';
	}
	if (data.status === 2) {
		cssClass = 'default';
		status = 'OFF';
		imgSrc = '/img/default_dot.png';
	}

	var panel = document.getElementById(data._id+"-panel");
	panel.className = panel.className.replace( /panel-(default|danger|success)/g , 'panel-'+cssClass);

	var img = document.getElementById(data._id+"-img");
	img.src = imgSrc;

	var statusStr = document.getElementById(data._id+"-status");
	statusStr.className = statusStr.className.replace( /label-(default|danger|success)/g , 'label-'+cssClass);

	statusStr.innerHTML = status;

	var time = document.getElementById(data._id+"-time");
	time.innerHTML = data.lastModified;
}

$.fn.editable.defaults.mode = 'inline';
$(document).ready(function() {
    $('.machine-name').editable();
		$('#username').editable();
});
