$( document ).ready(function() {
	var userval = '';
	var servicesval = '';
	var categoryval = '';
	var locationval = '';

    var gettoday = new Date();
	var dd = gettoday.getDate();
	var mm = gettoday.getMonth()+1; //January is 0!
	var yyyy = gettoday.getFullYear();

	today = yyyy+'-'+mm+'-'+dd;

	$('select.dropdown').dropdown();
	$('.combobox').combobox();

	$('#date_start').datetimepicker({
		format: 'YYYY-MM-DD'
	});

	$('#date_end').datetimepicker({
		format: 'YYYY-MM-DD'
	});

	jQuery(document).ajaxStart(function () {
		//show ajax indicator
		ajaxindicatorstart('loading data.. please wait..');
	}).ajaxStop(function () {
		//hide ajax indicator
		ajaxindicatorstop();
	});

	firstStart = 1;

	$("#date_start").on("dp.change", function(e) {
        var date_start = $('#date_start').val();
		var date_end = $('#date_end').val();
		$.ajax({
			url: "createSession.php",
			data: { map_dateStart: date_start },
			success: function () {

				var users = $('#userlist option:selected');
		        var userval = [];
		        $(users).each(function(index, user){
		            userval.push([$(this).val()]);
		        });
				userval = userval.join("|");


				var services = $('#servicelist option:selected');
		        var servicesval = [];
		        $(services).each(function(index, service){
		            servicesval.push([$(this).val()]);
		        });
				servicesval = servicesval.join("|");

		        var categories = $('#categorielist option:selected');
		        var categoryval = [];
		        $(categories).each(function(index, category){
		            categoryval.push([$(this).val()]);
		        });
				categoryval = categoryval.join("|");

		        var locations = $('#locationlist option:selected');
		        var locationval = [];
		        $(locations).each(function(index, location){
		            locationval.push([$(this).val()]);
		        });
				locationval = locationval.join("|");

				load(date_start,date_end,userval,servicesval,categoryval,locationval);
			}
		})

		//Cookies.set('map_dateStart', date_start);


    });


	$("#date_end").on("dp.change", function(e) {
        var date_start = $('#date_start').val();
		var date_end = $('#date_end').val();
		$.ajax({
			url: "createSession.php",
			data: { map_dateEnd: date_end },
			success: function () {

				var users = $('#userlist option:selected');
		        var userval = [];
		        $(users).each(function(index, user){
		            userval.push([$(this).val()]);
		        });
				userval = userval.join("|");


				var services = $('#servicelist option:selected');
		        var servicesval = [];
		        $(services).each(function(index, service){

function load(date_start,date_end,user,service,category,location){
	var customIcons = {
      1: {
        icon: 'images/1.png'
      },
      2: {
        icon: 'images/2.png'
      },
      3: {
        icon: 'images/3.png'
      },
      4: {
        icon: 'images/4.png'
      },
      5: {
        icon: 'images/5.png'
      },
      6: {
        icon: 'images/6.png'
      },
      7: {
        icon: 'images/7.png'
      },
      8: {
        icon: 'images/8.png'
      },
      9: {
        icon: 'images/9.png'
      },
      10: {
        icon: 'images/10.png'
      },
      nocolor: {
        icon: ''
      },
      incident: {
        icon: 'images/2.png'
      },
      '' : {
	   	icon: 'images/3.png'
      }
    };

	var gm = google.maps;
	var map = new gm.Map(document.getElementById("map"), {
    	center: new google.maps.LatLng(52.000895, 4.374047),
		zoom: 12,
//		mapTypeId: 'roadmap'
        mapTypeId: "satellite",
        rotateControl: true,
        tilt: 0,

  	});
  	var geocoder = new google.maps.Geocoder();

  	document.getElementById('submit').addEventListener('click', function() {
		geocodeAddress(geocoder, map);
    });
  	var infoWindow = new google.maps.InfoWindow;
  	var oms = new OverlappingMarkerSpiderfier(map);
  	var bounds = new google.maps.LatLngBounds();

  	if (firstStart == 0){
		// Change this depending on the name of your PHP file
		downloadUrl("createXML.php?date_start="+date_start+"&date_end="+date_end+"&user="+String(user)+"&service="+String(service)+"&category="+String(category)+"&location="+String(location) , function(data) {
			var xml = data.responseXML;
		    var markers = xml.documentElement.getElementsByTagName("marker");
		    markerCount = markers.length;
		    counter.innerHTML = markerCount + " results";
		    for (var i = 0; i < markers.length; i++) {
		    	var name = markers[i].getAttribute("name");
				var address = markers[i].getAttribute("address");
				var type = markers[i].getAttribute("type");
				var datetime = markers[i].getAttribute("datetime");
				var point = new google.maps.LatLng(
		        	parseFloat(markers[i].getAttribute("lat")),
					parseFloat(markers[i].getAttribute("lng"))
				);
				var icon = markers[i].getAttribute("icon");
				if (icon == ''){
					var icon = customIcons[type] || {};
					var marker = new google.maps.Marker({
						map: map,
						position: point,
						icon: icon.icon
			      	});
				} else {
					var marker = new google.maps.Marker({
						map: map,
						position: point,
						icon: '../../mapIcons/'+icon
			      	});
				}
				var html = "<P STYLE='font-size: 8px;'>" + datetime +"</P><P STYLE='font-size: 12px;'>" + address + "<b><br/>" + name +"</b></P>";
		      	oms.addMarker(marker);
			  	bindInfoWindow(marker, map, infoWindow, html);
		    }
		    map.panTo(point);
			map.setZoom(13);
		});
	} else {


       		  	

		$.ajax({
			type: "POST",
			dataType: "json",
			url: 'getDateStart.php',
			cache: false,
			success: function(data) {
		        dateStart = JSON.stringify(data);
		        dateStart = dateStart.replace(/['"]+/g, '');

		        $.ajax({
					type: "POST",
					dataType: "json",
					url: 'getDateEnd.php',
					cache: false,
					success: function(data) {
				        dateEnd = JSON.stringify(data);
				        dateEnd = dateEnd.replace(/['"]+/g, '');

				        downloadUrl("createXML.php?date_start="+dateStart+"&date_end="+dateEnd+"&user=all&service=all&category=all&location=all" , function(data) {
							var xml = data.responseXML;
						    var markers = xml.documentElement.getElementsByTagName("marker");
						    markerCount = markers.length;
						    counter.innerHTML = markerCount + " results found";
						    for (var i = 0; i < markers.length; i++) {
						    	var name = markers[i].getAttribute("name");
								var address = markers[i].getAttribute("address");
								var type = markers[i].getAttribute("type");
								var datetime = markers[i].getAttribute("datetime");
								var point = new google.maps.LatLng(
						        	parseFloat(markers[i].getAttribute("lat")),
									parseFloat(markers[i].getAttribute("lng"))
								);
								var icon = markers[i].getAttribute("icon");
								if (icon == ''){
									var icon = customIcons[type] || {};
									var marker = new google.maps.Marker({
										map: map,
										position: point,
										icon: icon.icon
							      	});
								} else {
									var marker = new google.maps.Marker({
										map: map,
										position: point,
										icon: '../../mapIcons/'+icon
							      	});
								}
								var html = "<P STYLE='font-size: 8px;'>" + datetime +"</P><P STYLE='font-size: 12px;'>" + address + "<b><br/>" + name +"</b></P>";
						      	oms.addMarker(marker);
							  	bindInfoWindow(marker, map, infoWindow, html);
							  	
							  	
							  	// draw poly
							  	

							  	

