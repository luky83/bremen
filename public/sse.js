
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

	var lastModified;
	var lastUpdated;

	if ( data.lastModified != null) {
		lastModified = moment(data.lastModified);
		var el = document.getElementById(data._id+"-changed");
		el.innerHTML = lastModified.calendar();
		$('#'+data._id+"-changed").attr('data-original-title', lastModified.format("ddd D MMM YYYY, H:mm:ss"));
	}
	if ( data.lastUpdated != null) {
		lastUpdated = moment(data.lastUpdated);
		var el = document.getElementById(data._id+"-updated");
		el.innerHTML = lastUpdated.format("H:mm:ss");
		$('#'+data._id+"-updated").attr('data-original-title', 'Ultimo aggiornamento<br>' + lastModified.format("ddd D MMM YYYY, H:mm:ss"));
	} 
}
