require([
  "esri/Map",
  "esri/views/MapView",
  "esri/rest/places",
  "esri/rest/support/FetchPlaceParameters",
  "esri/rest/support/PlacesQueryParameters",
  "esri/geometry/Circle",
  "esri/geometry/Point",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
  "esri/symbols/WebStyleSymbol",
  "esri/config"
  ], (Map, MapView, places, FetchPlaceParameters, PlacesQueryParameters, Circle, Point, Graphic, GraphicsLayer, WebStyleSymbol, esriConfig) => {

  // authorization  used to access basemaps, places, routing services
  esriConfig.apiKey = "AAPKfa57fab7d2cc4663812c6c830290de30z6XS-pzGDH3xdEaiscMHRxuvTaPN3J8zj3HIAKzmr8mBt-hwVFJmjRtXu4DwMc9q";

  let infoPanel;  // Left panel for place information
  let clickPoint;  // Clicked point on the map
  let rexburgPlacesQueryParameters;  // Parameters for queryPlacesNearPoint()
  let activeCategory = "13000";  // Dining
  let highlightSelect;  // Feature selection highlight
  let placesLayer = new GraphicsLayer({  // Layer for places features
    id: "graphicsLayer"
  });
  let bufferLayer = new GraphicsLayer({  // Layer for map buffer
    id: "bufferLayer"
  });

  // Left panel interactions
  const resultPanel = document.getElementById("results");
  const flow = document.getElementById("flow");

  // Circle graphic to represent click location and search radius
  const circleSymbol = {
    type: "simple-fill",
    style: "solid",
    color: [10, 140, 150, 0.1],
    outline: {
      width: 3,
      color: [10, 140, 150],
    },
  };

  // WebStyleSymbols for place features by category
  const dining = new WebStyleSymbol({
    name: "vineyard",
    styleName: "Esri2DPointSymbolsStyle",
  });

  // Map with the GraphicsLayer
  const map = new Map({
    basemap: "streets-navigation-vector",
    layers: [bufferLayer, placesLayer]
  });

  // View with customized highlight options
  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-111.7900, 43.8200],
    zoom: 13,
    highlightOptions: {
      color: [0, 255, 51, 1],
      haloOpacity: 0.9,
      fillOpacity: 0.2,
    },
  });
  
  // View on-click event to capture places search location
  view.on("click", (event) => {
    bufferLayer.removeAll();  // Remove graphics from GraphicsLayer of previous buffer
    placesLayer.removeAll();  // Remove graphics from GraphicsLayer of previous places search
    clickPoint = {};
    clickPoint.type = "point";
    // Convert clicked screen location to longitude and latitude
    clickPoint.longitude = Math.round(event.mapPoint.longitude * 1000) / 1000;
    clickPoint.latitude = Math.round(event.mapPoint.latitude * 1000) / 1000;
    // Pass point to the showPlaces() function
    clickPoint && showPlaces(clickPoint);
  });


  // Display map click search area and pass to places service
  async function showPlaces(clickPoint) {
    // Buffer graphic represents click location and search radius
    const circleGeometry = new Circle({
      center: clickPoint,
      geodesic: true,
      numberOfPoints: 100,
      radius: 300,  // set radius to 500 meters
      radiusUnit: "meters",
    });
    const circleGraphic = new Graphic({
      geometry: circleGeometry,
      symbol: circleSymbol,
    });
    // Add buffer graphic to the view
    bufferLayer.graphics.add(circleGraphic);

    // Pass search area, categories, and API Key to places service
    rexburgPlacesQueryParameters = new PlacesQueryParameters({
      apiKey,
      categoryIds: [activeCategory],
      radius: 500,  // set radius to 500 meters
      point: clickPoint,
    });
    // The results variable represents the PlacesQueryResult
    const results = await places.queryPlacesNearPoint(
      rexburgPlacesQueryParameters
    );
    // Pass the PlacesQueryResult to the tabulatePlaces() function
    tabulatePlaces(results);

  }

  // Investigate the individual PlaceResults from the array of results
  // from the PlacesQueryResult and process them
  function tabulatePlaces(results) {
    resultPanel.innerHTML = "";
    if (infoPanel) infoPanel.remove();
    results.results.forEach((placeResult) => {
      // Pass each result to the addResult() function
      addResult(placeResult);
    });
  }
  // Visualize the places on the map based on category
  // and list them on the left panel with more details
  async function addResult(place) {
    const placePoint = {
      type: "point",
      y: place.location.y,
      x: place.location.x,
    };

    const placeGraphic = new Graphic({
      geometry: placePoint,
    });
    switch (activeCategory) {
      case "13000":
        placeGraphic.symbol = dining;
        break;
      default:
        placeGraphic.symbol = dining;
    }

    // Add each graphic to the GraphicsLayer
    placesLayer.graphics.add(placeGraphic);
    // Fetch more details about each place based
    // on the place ID with all possible fields
    const fetchPlaceParameters = new FetchPlaceParameters({
      apiKey,
      placeId: place.placeId,
      requestedFields: ["all"],
    });

    const infoDiv = document.createElement("calcite-list-item");
    const description = `
${place.categories[0].label} -
${Number((place.distance / 1000).toFixed(1))} km`;
    infoDiv.label = place.name;
    infoDiv.description = description;

    // If a place in the left panel is clicked
    // then open the feature's popup
    infoDiv.addEventListener("click", async () => {
      view.openPopup({
        location: placePoint,
        title: place.name,
        content: "See panel for more details",
      });
      // Highlight the selected place feature
      const layerView = await view.whenLayerView(placesLayer);
      highlightSelect = layerView.highlight(placeGraphic);
      // Move the view to center on the selected place feature
      view.goTo(placeGraphic);
      // Pass the FetchPlaceParameters and the location of the
      // selected place feature to the getDetails() function
      getDetails(fetchPlaceParameters, placePoint);
    });
    resultPanel.appendChild(infoDiv);
  }

  // Get place details and display in the left panel
  async function getDetails(fetchPlaceParameters, placePoint) {
    // Get place details
    const result = await places.fetchPlace(fetchPlaceParameters);
    const placeDetails = result.placeDetails;
    // Move the view to center on the selected place feature
    view.goTo(placePoint);

    // Set-up panel on the left for more place information
    infoPanel = document.createElement("calcite-flow-item");
    flow.appendChild(infoPanel);
    infoPanel.heading = placeDetails.name;
    infoPanel.description = placeDetails.categories[0].label;
    // Pass attributes from each place to the setAttribute() function
    setAttribute("Description", "information", placeDetails.description);
    setAttribute("Address", "map-pin", placeDetails.address.streetAddress);
    setAttribute("Phone", "mobile", placeDetails.contactInfo.telephone);
    setAttribute("Hours", "clock", placeDetails.hours.openingText);
    setAttribute("Rating", "star", placeDetails.rating.user);
    setAttribute("Email", "email-address", placeDetails.contactInfo.email);
    setAttribute(
      "Facebook",
      "speech-bubble-social",
      placeDetails.socialMedia.facebookId ?
      `www.facebook.com/${placeDetails.socialMedia.facebookId}` :
      null
    );
    setAttribute(
      "Twitter",
      "speech-bubbles",
      placeDetails.socialMedia.twitter ?
      `www.twitter.com/${placeDetails.socialMedia.twitter}` :
      null
    );
    setAttribute(
      "Instagram",
      "camera",
      placeDetails.socialMedia.instagram ?
      `www.instagram.com/${placeDetails.socialMedia.instagram}` :
      null
    );
    // If another place is clicked in the left panel, then close
    // the popup and remove the highlight of the previous feature
    infoPanel.addEventListener("calciteFlowItemBack", async () => {
      view.closePopup();
      highlightSelect.remove();
      highlightSelect = null;
    });
  }

  // Take each place attribute and display on left panel
  function setAttribute(heading, icon, validValue) {
    if (validValue) {
      const element = document.createElement("calcite-block");
      element.heading = heading;
      element.description = validValue;
      const attributeIcon = document.createElement("calcite-icon");
      attributeIcon.icon = icon;
      attributeIcon.slot = "icon";
      attributeIcon.scale = "m";
      element.appendChild(attributeIcon);
      infoPanel.appendChild(element);
    }
  }
});
