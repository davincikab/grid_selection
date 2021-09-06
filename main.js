
var selectionControl = document.getElementById("selection-control");
var collapseToggler = document.getElementById("toggle-collapse");
var collapseContainer = document.getElementById("collapse-container");
var countDiv = document.getElementById("count-div");
var totalPrice = document.getElementById("total-price");
var toggleIcon = document.getElementById("toggler-icon");
var togglerButton = document.getElementById("info-toggler");

collapseToggler.onclick = function(e) {
    collapseContainer.classList.toggle('open');
}

// map code
mapboxgl.accessToken = 'pk.eyJ1IjoiZGF1ZGk5NyIsImEiOiJjanJtY3B1bjYwZ3F2NGFvOXZ1a29iMmp6In0.9ZdvuGInodgDk7cv-KlujA';

var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/outdoors-v11', // style URL
    center: [-0.11548324969248824, 51.49251551092894], 
    zoom: 18 // starting zoom
});


map.on('load', function(e) {
    // tile layer
    map.addSource('grid-tile', {
        type:'vector',
        url:"mapbox://daudi97.9s5pn4u0"
    });

    map.addLayer({
        id:'grid-polygon',
        source:'grid-tile',
        'source-layer':'grid-585g4n',
        type:'fill',
        paint:{
            'fill-color':'#000',
            'fill-opacity':0.4
        }
    });

    map.addLayer({
        id:'grid-layer',
        source:'grid-tile',
        'source-layer':'grid-585g4n',
        type:'line',
        paint:{
            'line-color':'#000',
            'line-width':1
        }
    });

    map.addLayer({
        id:'grid-label',
        source:'grid-tile',
        'source-layer':'grid-585g4n',
        type:'symbol',
        layout: {
            'text-field': ['get', 'use'],
            'text-font': ['Lato Regular', 'Arial Unicode MS Bold'],
            'text-size': 12
        },
        paint: {
            'text-color':'#fff'
        }
    });

    // selected grid layer
    map.addSource('selected-grid', {
        type:'geojson',
        data:{"type":"FeatureCollection", "features":[]}
    });

    map.addLayer({
        id:'selected-grid-layer',
        source:'selected-grid',
        type:'fill',
        paint:{
            'fill-color':'green',
            'fill-opacity':0.7
        }
    });

    // selected grid layer
    map.addSource('bbox', {
        type:'geojson',
        data:{"type":"FeatureCollection", "features":[]}
    });

    map.addLayer({
        id:'bbox-layer',
        source:'bbox',
        type:'fill',
        paint:{
            'fill-color':'red',
            'fill-opacity':0.0
        }
    });

    // map events
    map.on('click', "grid-polygon", function(e) {
        console.log(e.features);
        if(e.features[0]) {
            let feature = e.features[0];
            updateSelection(feature);

            let isSelected = gridLayer.isSelected(feature);

            if(!isSelected) {
                // add to selection
                gridLayer.updateGrids(feature);
            } else {
                gridLayer.unSelectGrid(feature);
            }

            updateSelection();
        }

    });

    map.on('mousemove', "grid-polygon", function(e) {
        // console.log(e);
        if (e.shiftKey) {
            /*shift is down*/
            console.log("Shift is pressed");
        }

        if(pressedKeys['16'] && e.features.length > 0) {
            let feature = e.features[0];
            console.log("Mouse move features");
            console.log(mousemoveFeatures);

            let moveFeature = mousemoveFeatures.find(mfeature => mfeature.properties.id == feature.properties.id);
            if(!moveFeature) {
                mousemoveFeatures.push(feature);
            }
            

            let fc = turf.featureCollection(mousemoveFeatures);
            var bbox = turf.bbox(fc);
            console.log(bbox);

            let bboxPoly = turf.bboxPolygon(bbox);

           
            map.getSource('bbox').setData(bboxPoly);

            let sw = map.project(bbox.slice(2,));
            let ne =  map.project(bbox.slice(0,2));

            let queryFeatures = map.queryRenderedFeatures(
                [sw, ne],
                {layers: ['grid-polygon']}
            );

            console.log(queryFeatures);

            queryFeatures.forEach(qFeature => {
                // check if the grid id selected
                let isSelected = gridLayer.isSelected(qFeature);
                let isWithin = turf.booleanWithin(qFeature, bboxPoly);

                if(!isSelected && isWithin) {
                    // add to selection
                    gridLayer.updateGrids(qFeature);

                    updateSelection();
                }
 
            });
           
            
        }
    });


    map.on('mouseover', 'selected-grid-layer', function(e) {
        // update the 
        map.getCanvas().style.cursor = "pointer";
    }); 

    map.on('mouseout', 'selected-grid-layer', function(e) {
        map.getCanvas().style.cursor = "";
    });

    
    map.on('mouseover', 'grid-polygon', function(e) {
        // update the 
        map.getCanvas().style.cursor = "pointer";
    });

    map.on('mouseout', 'grid-polygon', function(e) {
        map.getCanvas().style.cursor = "";
    });
});


var pressedKeys = {};
var mousemoveFeatures = [];
window.onkeyup = function(e) { 
    pressedKeys[e.keyCode] = false; 
    // console.log(pressedKeys);
    if(e.keyCode == 16) {
        mousemoveFeatures = [];
    }
}
window.onkeydown = function(e) { 
    pressedKeys[e.keyCode] = true; 
    // console.log(pressedKeys);
}

var GridLayer = function() {
    this.selectedGrids = [];

    this.getSelectedGrid = function() {
        return this.selectedGrids;
    }

    this.updateGrids = function(newGrid) {
        let grids = [...this.selectedGrids];
        grids.push(newGrid);

        this.selectedGrids = JSON.parse(JSON.stringify(grids));
    }

    this.setSelctedGrids = function(grids) {
        this.selectedGrids = [...grids];
    }

    this.isSelected = function(gridItem) {
        return this.selectedGrids.find(grid => grid.properties.id == gridItem.properties.id);
    }

    this.unSelectGrid = function(gridItem) {
        let grids = this.selectedGrids.filter(grid => {
            if(grid.properties.id == gridItem.properties.id) {
                return false;
            }

            return grid;
        });

        this.selectedGrids = JSON.parse(JSON.stringify(grids));
    }

    this.getGeojson = function() {
        let geojson = {"type":"FeatureCollection", "features":[]};
        console.log(this.selectedGrids);

        geojson.features = JSON.parse(JSON.stringify(this.selectedGrids));
        return geojson;
    }
}

let gridLayer = new GridLayer();

function updateSelection() {
    // get grids
    let features = gridLayer.getSelectedGrid();
    let geojson = gridLayer.getGeojson();

    // update the selected grid source
    map.getSource('selected-grid').setData(geojson);

    // update the selection control
    updateSelectionCount(features);
    updateCollapseItems(features);
}

function updateCollapseItems(features) {
    // update the total price
    let prices = features.length * 59.909;
    totalPrice.innerHTML = `$ ${prices}`;
}

function updateSelectionCount(features) {
    let count = features.length;

    countDiv.innerHTML = `${count}/750`;

    if(count == 0) {
        clearSelection.classList.add("text-muted");
        clearSelection.classList.remove('text-danger');
    } else {
        clearSelection.classList.remove("text-muted");
        clearSelection.classList.add('text-danger');
    }
}


// clear the selection
var clearSelection = document.getElementById("clear-selection");
clearSelection.onclick = function(e) {
    gridLayer.setSelctedGrids([]);

     // get grids
     let features = gridLayer.getSelectedGrid();
     let geojson = gridLayer.getGeojson();

     // update the selected grid source
     map.getSource('selected-grid').setData(geojson);
     map.getSource('bbox').setData(turf.featureCollection([]));

     // update the selection control
     updateSelectionCount(features);
     updateCollapseItems(features);
}

// toggle the selection control
togglerButton.onclick = function(e) {
    if(selectionControl.classList.contains('compress')) {
        selectionControl.classList.remove('compress');
        toggleIcon.innerHTML = '<i class="fa fa-compress-alt"></i>'
    } else {
        selectionControl.classList.add('compress');
        toggleIcon.innerHTML = '<i class="fa fa-expand-alt"></i>'
    }
}