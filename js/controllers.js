// File controllers aplication

// 1. Main controller ----------------------------------------------------------------------------
	app.controller('mainController',function($scope){
	
		 angular.extend($scope, {
	        center: {
	            lat: -1.259311,
	            lng: -78.524037,
	            zoom: 6
	        },
	        defaults: {
	            scrollWheelZoom: false
	        }
	    });
	});
