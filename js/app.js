//Creation module angular

var app = angular.module('chaviApp',['ngMaterial','ngRoute','ui-leaflet']);

//Configuration paths url

app.config(function ($routeProvider){
	
	$routeProvider
	
	//Primer Nivel
	.when('/main',{
		templateUrl:'templates/home-chaviApp.html',
		controller: 'mainController',
	})

	.otherwise({
	redirectTo: '/main'
	});
})

