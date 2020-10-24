import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { deviceCategories } from '../common/deviceCategories';

let readyListeners = [];

const onMapReady = listener => {
  if (!readyListeners) {
    listener();
  } else {
    readyListeners.push(listener);
  }
};

const loadImage = (url) => {
  return new Promise(imageLoaded => {
    const image = new Image();
    image.onload = () => imageLoaded(image);
    image.src = url;
  });
};

const loadIcon = async (key, background, url) => {
  const image = await loadImage(url);
  const pixelRatio = window.devicePixelRatio;

  const canvas = document.createElement('canvas');
  canvas.width = background.width * pixelRatio;
  canvas.height = background.height * pixelRatio;
  canvas.style.width = `${background.width}px`;
  canvas.style.height = `${background.height}px`;

  const context = canvas.getContext('2d');
  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  const iconRatio = 0.5;
  const imageWidth = canvas.width * iconRatio;
  const imageHeight = canvas.height * iconRatio;
  context.drawImage(image, (canvas.width - imageWidth) / 2, (canvas.height - imageHeight) / 2, imageWidth, imageHeight);

  map.addImage(key, context.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio });
};

const layerClickCallbacks = {};
const layerMouseEnterCallbacks = {};
const layerMauseLeaveCallbacks = {};

const addLayer = (id, source, icon, text, onClick) => {
  const layer = {
    'id': id,
    'type': 'symbol',
    'source': source,
    'layout': {
      'icon-image': icon,
      'icon-allow-overlap': true,
    },
  };
  if (text) {
    layer.layout = {
      ...layer.layout,
      'text-field': text,
      'text-allow-overlap': true,
      'text-anchor': 'bottom',
      'text-offset': [0, -2],
      'text-font': ['Roboto Regular'],
      'text-size': 12,
    }
    layer.paint = {
      'text-halo-color': 'white',
      'text-halo-width': 1,
    }
  }
  map.addLayer(layer);

  layerClickCallbacks[id] = onClick;
  map.on('click', id, onClick);

  layerMouseEnterCallbacks[id] = () => {
    map.getCanvas().style.cursor = 'pointer';
  };
  map.on('mouseenter', id, layerMouseEnterCallbacks[id]);

  layerMauseLeaveCallbacks[id] = () => {
    map.getCanvas().style.cursor = '';
  };
  map.on('mouseleave', id, layerMauseLeaveCallbacks[id]);
}

const removeLayer = (id, source) => {
  const popups = element.getElementsByClassName('mapboxgl-popup');
  if (popups.length) {
      popups[0].remove();
  }

  map.off('click', id, layerClickCallbacks[id]);
  delete layerClickCallbacks[id];

  map.off('mouseenter', id, layerMouseEnterCallbacks[id]);
  delete layerMouseEnterCallbacks[id];

  map.off('mouseleave', id, layerMauseLeaveCallbacks[id]);
  delete layerMauseLeaveCallbacks[id];

  map.removeLayer(id);
  map.removeSource(source);
}

const calculateBounds = features => {
  if (features && features.length) {
    const first = features[0].geometry.coordinates;
    const bounds = [[...first], [...first]];
    for (let feature of features) {
      const longitude = feature.geometry.coordinates[0]
      const latitude = feature.geometry.coordinates[1]
      if (longitude < bounds[0][0]) {
        bounds[0][0] = longitude;
      } else if (longitude > bounds[1][0]) {
        bounds[1][0] = longitude;
      }
      if (latitude < bounds[0][1]) {
        bounds[0][1] = latitude;
      } else if (latitude > bounds[1][1]) {
        bounds[1][1] = latitude;
      }
    }
    return bounds;
  } else {
    return null;
  }
}

const element = document.createElement('div');
element.style.width = '100%';
element.style.height = '100%';

const map = new mapboxgl.Map({
  container: element,
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: '© <a target="_top" rel="noopener" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    glyphs: 'https://cdn.traccar.com/map/fonts/{fontstack}/{range}.pbf',
    layers: [{
      id: 'osm',
      type: 'raster',
      source: 'osm',
    }],
  },
});

map.addControl(new mapboxgl.NavigationControl());

map.on('load', async () => {
  const background = await loadImage('images/background.svg');
  await Promise.all(deviceCategories.map(async category => loadIcon(category, background, `images/icon/${category}.svg`)));
  if (readyListeners) {
    readyListeners.forEach(listener => listener());
    readyListeners = null;
  }
});

export default {
  element,
  map,
  onMapReady,
  addLayer,
  removeLayer,
  calculateBounds,
};
