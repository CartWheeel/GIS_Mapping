require(["esri/Map", "esri/views/MapView"], (Map, MapView) => {
  const map = new Map({
    basemap: "topo"
  });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    zoom: 15,
    center: [-111.7900, 43.8200] // longitude and latitude of rexburg
  });
});