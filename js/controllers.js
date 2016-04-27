// File controllers aplication

// 1. Main controller ----------------------------------------------------------------------------
	app.controller('mainController',function($scope){
	
		 angular.extend($scope, {
	        center: {
	            lat: -1.259311,
	            lng: -78.524037,
	            zoom: 8
	        },
	        defaults: {
	            scrollWheelZoom: false
	        }
	    });

		$scope.templates = [
			{nombre: 'introduccion', url: 'templates/introduction.html'},
			{nombre: 'indicadores', url: 'templates/indicators.html'}
		];

		$scope.template = $scope.templates[0];

		$scope.comenzar = function(index){
			$scope.template = $scope.templates[index];
		}
	});
