// File controllers aplication

// 1. Main controller ----------------------------------------------------------------------------
app.controller('mainController', function($scope, $http, $mdDialog, $mdMedia, $filter){
    // cosas estilosas
    var estilo = {
        color_zona: {
            2: '#AA904A',
            1: '#8A324E',
            3: '#77C24F',
            4: '#4061AC'
        },
        color_sector: {
            "Educación": '#F37D30',
            "Salud": '#64ACA3',
            "Pobreza": '#AD9150',
            "Empleo": '#31656E',
            "Actividad Económica": '#76AB54'
        },
        formato_metrica: function(cantidad, tipo){
            var resultado = "";
            if (tipo == 'porcentaje') {
                resultado = $filter('number')(100*cantidad, 1) + ' %';
            } else if (tipo == 'entero'){
                resultado = $filter('number')(cantidad, 0);
            } else {
                resultado = $filter('number')(cantidad, 1);
            }
            return resultado
        }
    };
    
    // objeto con todo
    var chavimochic = {
        distritos: {},  // contiene la lista de distritos
        raw_data: {},   // contiene los datos crudos
        ambiente: {},   // continee los datos de 'accion por el clima'
        sectores: {},   // contiene las metricas de cada sector
        metricas: {},   // contiene las propiedades de cada metrica
        informacion: {},  // contiene los textos
        
        selector: {},   // contiene los valores de los selectores
        simular: {},    // modelos de las casillas de simular
        
        varianza: {},   // contine la varianza para cada metrica
        resultado: {},  // contiene los Pvalues y quintiles para cada metrica
        calificacion: {}, // contiene el promedio de Pvalues por distrito
        quintiles: {},  // contiene los quintiles de cada sector
        
        distrito: {
            seleccionado: "Selecciona un distrito",
            drop: false,
            sin_seleccionar: false
        },
        metrica_sector: {
            metrica: "",
            sector: ""
        },
        mapa: {
            path: {},
            bounds: {
                "northEast":{"lat":-7.348846969785414,"lng":-77.74749755859375},
                "southWest":{"lat":-8.977323208440273,"lng":-79.99969482421875}
            },
            defaults: {
                keyboard: false,
                dragging: false,
                doubleClickZoom: false,
                scrollWheelZoom: false,
                tap: false,
                touchZoom: false,
                zoomControl: false,
                controls: {
                    layers: {
                        visible: false
                    }
                }
            },
            layers: {
                overlays: {
                    distritos: {
                        name: "Distritos Layer",
                        type: "group",
                        visible: true
                    }
                }
            },
            events: {
                path: {
                    enable: ['click']
                }
            },
            tiles: {
                url: "http://{s}.tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png",
                //url: "http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
                options: {
                    attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    //attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
                }
            }
        },
        
        init: function(raw){
            this.distritos = raw.distritos;
            this.raw_data = raw.raw_data;
            this.ambiente = raw.ambiente;
            this.sectores = raw.sectores;
            this.metricas = raw.metricas;
            this.informacion = raw.informacion;
            
            for (metrica in this.raw_data){
                this.selector[metrica] = {};
                this.simular[metrica] = {};
                for (distrito in this.raw_data[metrica]){
                    this.selector[metrica][distrito] = 'actual';
                    this.simular[metrica][distrito] = false;
                }
            }
            
            for (distrito in this.distritos){
                this.mapa.path[distrito] = {
                    latlngs: this.distritos[distrito].coordinates,
                    stroke: true,
                    color: '#eeeeee',
                    weight: 1,
                    fillColor: estilo.color_zona[this.distritos[distrito].zona],
                    fillOpacity: 0.9,
                    type: 'polygon',
                    layer: 'distritos'
                };
            }
            
            this.calcular();
        },
        
        calcular: function(){
            // varianza
            for (metrica in this.raw_data){
                var sumatoria = 0;
                for (distrito in this.raw_data[metrica]){
                    var raw = this.raw_data[metrica][distrito];
                    var selector = this.selector[metrica][distrito];
                    sumatoria += Math.pow((raw[selector] - raw['optimo']), 2);
                }
                this.varianza[metrica] = Math.pow(sumatoria / Object.keys(this.raw_data[metrica]).length, 0.5);
            }
            
            // cdf            
            for (metrica in this.raw_data){
                this.resultado[metrica] = {};
                for (distrito in this.raw_data[metrica]){
                    var raw = this.raw_data[metrica][distrito];
                    var selector = this.selector[metrica][distrito];
                    var desviacion = this.metricas[metrica].clase * (raw[selector] - raw['optimo']);
                    
                    var varianza = this.varianza[metrica];
                    
                    if (varianza != 0) {
                        var p_value = std_n_cdf(desviacion / varianza);
                    } else {
                        var p_value = std_n_cdf(0);
                    }
                    var quintil = Math.ceil(p_value / 0.2);
                    
                    this.resultado[metrica][distrito] = {
                        p_value: p_value,
                        quintil: quintil
                    };
                }
            }
            
            // Calificacion
            for (distrito in this.distritos){
                var promedio = 0;
                for (metrica in this.metricas){
                    promedio += this.resultado[metrica][distrito].p_value;
                }
                this.calificacion[distrito] = promedio/Object.keys(this.metricas).length;
            }
            
            // Quintiles Sectores
            for (distrito in this.distritos){
                this.quintiles[distrito] = {};
                for (sector in this.sectores){
                    var productoria = 1;
                    for (metrica in this.sectores[sector]){
                        productoria = productoria * this.resultado[metrica][distrito].p_value;
                    }
                    var media_geom = Math.pow(productoria, 1/Object.keys(this.sectores[sector]).length);
                    this.quintiles[distrito][sector] = Math.ceil(media_geom / 0.2);
                }
            }
        },
        
        seleccionar_distrito: function(distrito){
            if (this.distrito.sin_seleccionar){
                this.mapa.path[this.distrito.seleccionado].weight = 1;
            }
            this.distrito.seleccionado = distrito;
            this.mapa.path[distrito].weight = 3;
            this.distrito.sin_seleccionar = true;
            this.distrito.drop = false;
        },
        
        simular_metrica: function(metrica, distrito){
            if(this.selector[metrica][distrito] == 'optimo'){
                this.selector[metrica][distrito] = 'actual';
            } else {
                this.selector[metrica][distrito] = 'optimo';
            }
            this.calcular();
        },
        
        simular_sector: function(sector, distrito){
            for(metrica in this.sectores[sector]){
                this.simular[metrica][distrito] = !this.simular[metrica][distrito];                
                this.simular_metrica(metrica, distrito);
            }
        },
        
        ver_zonas: function(){
            this.metrica_sector.sector = "";
            this.metrica_sector.metrica = "";
            for (distrito in this.distritos){
                this.mapa.path[distrito] = {
                    latlngs: this.distritos[distrito].coordinates,
                    stroke: true,
                    color: '#eeeeee',
                    weight: 1,
                    fillColor: estilo.color_zona[this.distritos[distrito].zona],
                    fillOpacity: 0.9,
                    type: 'polygon',
                    layer: 'distritos'
                };
            }
        },
        
        ver_metrica_mapa: function(metrica, sector){
            this.metrica_sector.sector = "";
            this.metrica_sector.metrica = metrica;
            for (distrito in this.distritos){
                this.mapa.path[distrito].fillColor = estilo.color_sector[sector];
                this.mapa.path[distrito].fillOpacity = 1 - this.resultado[metrica][distrito].p_value;
            }
        },
        
        ver_sector_mapa: function(sector){
            this.metrica_sector.metrica = "";
            this.metrica_sector.sector = sector;
            for (distrito in this.distritos){
                this.mapa.path[distrito].fillColor = estilo.color_sector[sector];
                this.mapa.path[distrito].fillOpacity = this.quintiles[distrito][sector]/5;
            }
        }
    };
    
    $scope.chavimochic = chavimochic;
    $scope.estilo = estilo;
    
    // bajamos los datos
    $http.get('data.json')
    .then(function(res){
        chavimochic.init(res.data);
    });
    

    
    /////////
    $scope.templates = [
        {nombre: 'introduccion', url: 'templates/introduction.html'},
        {nombre: 'indicadores', url: 'templates/indicators.html'}
    ];

    $scope.template = $scope.templates[0];

    $scope.comenzar = function(index){
        $scope.template = $scope.templates[index];
    };
    
    
    
    
    
    // erf function
    function erf(x) {
      // save the sign of x
      var sign = (x >= 0) ? 1 : -1;
      x = Math.abs(x);

      // constants
      var a1 =  0.254829592;
      var a2 = -0.284496736;
      var a3 =  1.421413741;
      var a4 = -1.453152027;
      var a5 =  1.061405429;
      var p  =  0.3275911;

      // A&S formula 7.1.26
      var t = 1.0/(1.0 + p*x);
      var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
      return sign * y; // erf(-x) = -erf(x);
    };
    
    // standard normal cdf
    function std_n_cdf(x) {
        return 0.5 * (1 + erf( x / Math.sqrt(2)) );
    };






    // Lanzador del Modal

    $scope.mostrar_informacion = function(ev, dimension, distrito, informacion, color) {
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;

        $mdDialog.show({
            controller: DialogController,
            templateUrl: 'dialogInformation.tmpl.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            locals: {
                dimension: dimension,
                distrito: distrito,
                informacion: informacion,
                color: color
            },
            clickOutsideToClose:true,
            fullscreen: useFullScreen
        })
        .then(function(answer) {
        $scope.status = 'You said the information was "' + answer + '".';
        }, function() {
            $scope.status = 'You cancelled the dialog.';
        });
    }
    
    
    // eventos del mapa
    $scope.$on('leafletDirectivePath.map.click', function(event, args){
        chavimochic.seleccionar_distrito(args.modelName);
    });
});


function DialogController($scope, $mdDialog, dimension, distrito, informacion, color) {
  $scope.dimension = dimension;
  $scope.distrito = distrito;
  $scope.informacion = informacion;
  $scope.color = color;
    
  $scope.hide = function() {
    $mdDialog.hide();
  };

  $scope.cancel = function() {
    $mdDialog.cancel();
  };

  $scope.answer = function(answer) {
    $mdDialog.hide(answer);
  };
}




app.filter('orderDistritos', function() {
  return function(items, calificacion, zona) {
    var filtered = [];
    angular.forEach(items, function(item, key) {
      if(item.zona == zona){
        item.key = key;
        filtered.push(item);  
      }
    });
    filtered.sort(function (a, b) {
      return (calificacion[a.key] > calificacion[b.key] ? -1 : 1);
    });
    return filtered;
  };
});