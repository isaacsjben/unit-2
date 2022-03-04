var map;

function createMap(){
    map = L.map('map').setView([53, 5], 4);
//L.tileLayer: Instantiates a tile layer object given a URL template and optionally an options object.
L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	subdomains: 'abcd',
	minZoom: 4,
	maxZoom: 6,
	ext: 'png'
//.addTo: Adds the layer to the given map or layer group.
}).addTo(map);

getData(map)
};

function calculateMinValue(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each city
    for(var country of data.features){
        //loop through each year
        for(var year = 1986; year <= 2014; year+=1){
            if (country.properties["seats_"+ String(year)]){  
            //get population for current year
              var value = country.properties["seats_"+ String(year)];
              //add value to array
              if (value){
              allValues.push(value);
              }
            }
        }
    }
    //get minimum value of our array
    var minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius

    return radius;
};

function onEachFeature(feature, layer) {
    //no property named popupContent; instead, create html string with all properties
    var popupContent = "";
    if (feature.properties) {
        //loop to add feature property names and values to html string
        for (var property in feature.properties){
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    };
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    console.log(attribute);
    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    var popupContent = "<p><b>Country:</b> " + feature.properties.Country + "</p>";
    
    //add formatted attribute to popup content string
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Seats in " + year + ":</b> " + feature.properties[attribute] + "</p>";
    
    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-options.radius) 
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
              //access feature properties
              var props = layer.feature.properties;

              //update each feature's radius based on new attribute values
              var radius = calcPropRadius(props[attribute]);
              layer.setRadius(radius);
  
              //add country to popup content string
              var popupContent = "<p><b>Country:</b> " + props.Country + "</p>";
  
              //add formatted attribute to panel content string
              var year = attribute.split("_")[1];
              popupContent += "<p><b>Seats in " + year + ":</b> " + props[attribute] + "</p>";
  
              //update popup content            
              popup = layer.getPopup();            
              popup.setContent(popupContent).update();
        };
    });
};

//Create new sequence controls
function createSequenceControls(){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse"/button>');
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);
    //set slider attributes
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;
    //add step buttons
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward"/button>');
    //replace button content with images
    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/backward.png'>")
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/forward.png'>")
    //click listener for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;

            //increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //if past the last attribute, wrap around to first attribute
                index = index > 6 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //if past the first attribute, wrap around to last attribute
                index = index < 0 ? 6 : index;
            };

            //update slider
            document.querySelector('.range-slider').value = index;
            //pass new attribute to update symbols
            updatePropSymbols(attributes[index]);
        })
        
    })
    //input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){            
        //get the new index value
        var index = this.value;
        //pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });
};

//build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("seats") > -1){
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes);

    return attributes;
};

//function to retrieve the data and place it on the map
function getData(map){
    //load the data
    fetch("data/Europe-ParliamentData.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){          
            //create an attributes array
            var attributes = processData(json);  
            //calculate minimum data value
            minValue = calculateMinValue(json);
            createPropSymbols(json, attributes);
            createSequenceControls();
        });
};

console.log()

document.addEventListener('DOMContentLoaded',createMap)