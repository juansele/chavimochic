// File controllers aplication

// 1. Main controller ----------------------------------------------------------------------------
app.controller('mainController', function($scope, $http){
    // objeto con todo
    var chavimochic = {
        distritos: {},  // contiene la lista de distritos
        raw_data: {},   // contiene los datos crudos
        ambiente: {},   // continee los datos de 'accion por el clima'
        sectores: {},   // contiene las metricas de cada sector
        metricas: {},   // contiene las propiedades de cada metrica
        
        selector: {},   // contiene los valores de los selectores
        
        varianza: {},   // contine la varianza para cada metrica
        resultado: {},  // contiene los Pvalues y quintiles para cada metrica
        quintiles: {},  // contiene los quintiles de cada sector
        
        mapa: {
            path: {},
            center: {
                lat: -1.259311,
                lng: -78.524037,
                zoom: 8
            },
            defaults: {
                scrollWheelZoom: false
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
            events = {
                path: {
                    enable: ['click']
                }
            }
        },
        
        init: function(raw){
            this.distritos = raw.distritos;
            this.raw_data = raw.raw_data;
            this.ambiente = raw.ambiente;
            this.sectores = raw.sectores;
            this.metricas = raw.metricas;
            
            for (metrica in this.raw_data){
                this.selector[metrica] = {};
                for (distrito in this.raw_data[metrica]){
                    this.selector[metrica][distrito] = 'actual';
                }
            }
            
            for (distrito in this.distritos){
                this.mapa.path[distrito] = {
                    latlngs: this.distritos[distrito].coordinates,
                    stroke: false,
                    fillColor: '#ff69b4',
                    fillOpacity: 0.4,
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
        }
    };
    
    $scope.chavimochic = chavimochic;
    
    // bajamos los datos
    $http.get('data.json')
    .then(function(res){
        chavimochic.init(res.data);
    });
    

    
    /////////
    angular.extend($scope, {
        center: {
            lat: -10.280419,
            lng: -76.408341,
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
    
    
    // eventos del mapa
    $scope.$on('leafletDirectivePath.map.click', function(event, args){
        console.log(event, args);
    });
});

