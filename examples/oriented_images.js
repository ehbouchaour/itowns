/* global itowns, document, renderer, orientedImageGUI  */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = {
    longitude: 2.423814,
    latitude: 48.844882,
    altitude: 100 };

var promises = [];

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, {
    renderer: renderer,
    handleCollision: false,
    sseSubdivisionThreshold: 10,
});

globeView.controls.minDistance = 0;

function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb));

// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
//promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));


var layerIGN = {
    panoramic: {
        northing: 690.513643,
        easting: 732.292932,
        altitude: 52.273318,
        roll: -146.418862,
        pitch: -80.4872,
        heading: -151.352533,
        image: "./orientedImages/StMande_20171109_1_000_CAM24_nodist.jpg",
    },
    camera: {
        size: [2560, 1920],
        focale: 966.2159779935166,
        ppaX: 1303.3106550704085,
        ppaY: 973.3103220398533,
        up: { x: 0, y: 1, z: 0 },
        lookAt: { x: 0, y: 0, z: -1 },
    },
    offset: { x: 657000, y: 6860000, z: -0.4 },
    distance: 10,
    debugScale: 1,
    opacity:0.8,
}

var layerMontBlanc = {
    panoramic: {
        latitude: 45.9228208442959,
        height: 4680.55588294683,
        longitude: 6.83256920100156,
        azimuth: 526.3900321920207,
        roll: 2.1876227239518276,
        tilt: -11.668910605126001,
        azimuth_: 0,
        roll_: 0,
        tilt_: 0,
        image: "./orientedImages/MontBlanc.jpg",    
    },
    camera: {
        size: [6490, 4408],
        focale: 1879.564256099287,
        ppaX: 3245,
        ppaY: 2204,
        up: { x: 0, y: 0, z: -1 },
        lookAt: { x: 0, y: -1, z: 0 },
    },
    distance: 12000,
    debugScale: 4.5,
    opacity:0.8,

}

function updatePlanePositionAndScale(layer) {
    layer.Xreel = (layer.camera.size[0] * layer.distance) / layer.camera.focale ;
    layer.Yreel = (layer.camera.size[1] * layer.distance) / layer.camera.focale;
    layer.ppaXReel = ((layer.camera.ppaX - layer.camera.size[0] / 2) * layer.distance) / layer.camera.focale;
    layer.ppaYReel = (-(layer.camera.ppaY - layer.camera.size[1] / 2) * layer.distance) / layer.camera.focale;
    
    layer.plane.scale.set(layer.Xreel / layer.debugScale , layer.Yreel / layer.debugScale, 1);
    layer.plane.position.set(layer.ppaXReel, layer.ppaYReel, layer.distance);

    layer.plane.updateMatrixWorld();
}

function toCoordinateIGN(layer) {
    return itowns.OrientedImageHelper.parseInfoEastingNorthAltitudeToCoordinate('EPSG:2154', layer.panoramic, layer.offset);
}

function toOrientationIGN(layer) {
    return itowns.OrientedImageHelper.parseMicMacOrientationToMatrix(layer.panoramic);
}

function initPhoto(layer, coordinateConversion, orientationConvertion) {
    var coordView = new itowns.Coordinates(globeView.referenceCrs, 0, 0, 0);
    var coord = coordinateConversion(layer);
    coord.as(globeView.referenceCrs, coordView);
    layer.axis = new itowns.THREE.AxesHelper(1);
    layer.axis.position.copy(coordView.xyz());
    // first set axis basic orientation: Z (blue) look to the sky, Y (green) to the north, X (red) to the east.
    layer.axis.lookAt(coordView.geodesicNormal.clone().add(layer.axis.position));
    globeView.scene.add(layer.axis);

    var cameraBase = new itowns.THREE.PerspectiveCamera(90, 1, 0.2, 0.4);
    layer.axis.add(cameraBase);
    layer.axis.updateMatrixWorld(true);
    cameraBase.up.set( layer.camera.up.x, layer.camera.up.y, layer.camera.up.z );
    cameraBase.lookAt( layer.camera.lookAt.x, layer.camera.lookAt.y, layer.camera.lookAt.z);
    cameraBase.updateMatrixWorld(true);
    cameraBase.updateProjectionMatrix();

    var texture = new itowns.THREE.TextureLoader().load( layer.panoramic.image );
    var geometry = new itowns.THREE.PlaneGeometry( 1, 1, 32 );
    var material = new itowns.THREE.MeshBasicMaterial( {
        map: texture,
        color: 0xffffff,
        side: itowns.THREE.DoubleSide,
        transparent: true, opacity: 1,
    } );
    
    layer.plane = new itowns.THREE.Mesh( geometry, material );

    var orientationNode = new itowns.THREE.AxesHelper(3);
    var rotationMatrix = orientationConvertion(layer);
    orientationNode.quaternion.copy(new itowns.THREE.Quaternion().setFromRotationMatrix(rotationMatrix));
    orientationNode.updateMatrixWorld(); 
    cameraBase.add(orientationNode);

    updatePlanePositionAndScale(layer);

    orientationNode.add(layer.plane);
    layer.plane.rotateX(Math.PI);

    console.log('layerPosition:' ,layer.plane.position);
    console.log('layerScale:' ,layer.plane.scale);

    layer.axis.updateMatrixWorld(true);
    
    var cameraHelper = new itowns.THREE.CameraHelper(cameraBase);
    globeView.scene.add(cameraHelper);
    cameraHelper.updateMatrixWorld(true);
}

initPhoto(layerIGN, toCoordinateIGN, toOrientationIGN);


function toCoordinateSuisse(layer) {
    return itowns.OrientedImageHelper.toCoordGeographic(layer.panoramic);
}

function toOrientationSuisse(layer) {
    return itowns.OrientedImageHelper.parseSuisseOrientationToMatrix(layer.panoramic);
}

initPhoto(layerMontBlanc, toCoordinateSuisse, toOrientationSuisse);


function cibleInit(res) {
    var geometry = new itowns.THREE.SphereGeometry(0.035, 32, 32);
    var material = new itowns.THREE.MeshBasicMaterial({ color: 0xff0000 });
    for (const s of res) {
        const coord = new itowns.Coordinates('EPSG:2154', s.long, s.lat, s.alt);
        var sphere = new itowns.THREE.Mesh(geometry, material);
        coord.as('EPSG:4978').xyz(sphere.position);
        globeView.scene.add(sphere);
        sphere.updateMatrixWorld();
    }
}

var promises = [];

promises.push(itowns.Fetcher.json('./Li3ds/cibles.json', { crossOrigin: '' }));

Promise.all(promises).then((res) => {
    cibleInit(res[0])
});


function colorBuildings(properties) {
    if (properties.id.indexOf('bati_remarquable') === 0) {
        return new itowns.THREE.Color(0x5555ff);
    } else if (properties.id.indexOf('bati_industriel') === 0) {
        return new itowns.THREE.Color(0xff5555);
    }
    return new itowns.THREE.Color(0xeeeeee);
}

function altitudeBuildings(properties) {
    return properties.z_min - properties.hauteur;
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}

globeView.addLayer({
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        color: colorBuildings,
        altitude: altitudeBuildings,
        extrude: extrudeBuildings }),
    // onMeshCreated: function setMaterial(res) { res.children[0].material = result.shaderMat; },
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    protocol: 'wfs',
    version: '2.0.0',
    id: 'WFS Buildings',
    typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
    level: 16,
    projection: 'EPSG:4326',
    // extent: {
    //     west: 2.334,
    //     east: 2.335,
    //     south: 48.849,
    //     north: 48.851,
    // },
    ipr: 'IGN',
    options: {
        mimetype: 'json',
    },
    wireframe: true,
}, globeView.tileLayer);

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
