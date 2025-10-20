function tiledOverlay(url, extent=null, attributions=null) {
  return new ol.layer.Tile({
    source: new ol.source.XYZ({
      url,
      maxZoom: 18,
      crossOrigin: 'anonymous',
      attributions,
    }),
    extent
  });
}

function tileExtentFromCoords(zoom, minX, maxX, minY, maxY) {
  const n = Math.pow(2, zoom);
  const lon1 = (minX / n) * 360 - 180;
  const lon2 = ((maxX + 1) / n) * 360 - 180;
  const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (maxY + 1) / n))) * 180 / Math.PI;
  const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * minY / n))) * 180 / Math.PI;
  return ol.proj.transformExtent([lon1, lat1, lon2, lat2], 'EPSG:4326', 'EPSG:3301');
}

function pointLayer(url, labelField, attributions=null) {
  return new ol.layer.Vector({
    source: new ol.source.Vector({
      url: url,
      format: new ol.format.GeoJSON({
        dataProjection: 'EPSG:3301',
        featureProjection: 'EPSG:3301'
      }),
      attributions: attributions
    }),
    declutter: true,
    style: function(feature, resolution) {
      const name = feature.get(labelField);
      const type = feature.get('type');
      const textVisible =
        (type === 'küla' && resolution > 3) ||
        (type === 'talu'    && resolution <= 3) ||
        (!type && resolution < 5);
      return new ol.style.Style({
        text: (name && textVisible) ? new ol.style.Text({
          text: name,
          font: (type === 'küla' ? 'bold 13px' : '11px') + ' "Noto Sans", Arial, sans-serif',
          fill: new ol.style.Fill({ color: '#222' }),
          stroke: new ol.style.Stroke({ color: 'rgba(255, 255, 255, 0.6)', width: 3 })
        }) : undefined
      });
    }
  });
}

function setOverlay(which) {
  overlay1799.setVisible(which === '1799');
  overlay1866.setVisible(which === '1866');
  overlay1956.setVisible(which === '1956');
  current.setVisible(which === 'current');
  base.setVisible(which !== 'current');
  document.getElementById('opacity-group').style.display = (which === 'current') ? 'none' : 'block';
}

function setOpacity(o) {
  overlay1799.setOpacity(o);
  overlay1866.setOpacity(o);
  overlay1956.setOpacity(o);
}



// Define EPSG:3301 projection and register it with OpenLayers
proj4.defs("EPSG:3301", "+proj=lcc +lat_1=59.33333333333334 +lat_2=58 +lat_0=57.51755393055556 +lon_0=24 +x_0=500000 +y_0=6375000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
ol.proj.proj4.register(proj4);

// Define the extent for EPSG:3301 (Estonia bounds)
const estoniaExtent = [40500, 5993000, 1064500, 7017000];
ol.proj.get('EPSG:3301').setExtent(estoniaExtent);

// Create LEST tile grid based on EPSG:3301 CRS
function createLESTTileGrid() {
  const projection = ol.proj.get('EPSG:3301');
  const projectionExtent = projection.getExtent();
  const size = ol.extent.getWidth(projectionExtent) / 256;
  const resolutions = new Array(15);
  const matrixIds = new Array(15);

  for (let z = 0; z < 15; ++z) {
    // Generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
  }

  return new ol.tilegrid.WMTS({
    origin: ol.extent.getTopLeft(projectionExtent),
    resolutions,
    matrixIds
  });
}

const elevation = new ol.layer.Tile({
    source: new ol.source.WMTS({
        url: 'https://tiles.maaamet.ee/tm/wmts',
        layer: 'vreljeef',
        matrixSet: 'LEST',
        format: 'image/png',
        projection: 'EPSG:3301',
        version: '1.1.1',
        service: 'WMTS',
        tileGrid: createLESTTileGrid(),
        attributions: 'Aluskaart: <a href="https://www.maaruum.ee">Maa- ja Ruumiamet</a>'
    })
})

const hybrid = new ol.layer.Tile({
    source: new ol.source.WMTS({
        url: 'https://tiles.maaamet.ee/tm/wmts',
        layer: 'hybriid',
        matrixSet: 'LEST',
        format: 'image/png',
        projection: 'EPSG:3301',
        version: '1.1.1',
        service: 'WMTS',
        tileGrid: createLESTTileGrid(),
        attributions: 'Aluskaart: <a href="https://www.maaruum.ee">Maa- ja Ruumiamet</a>'
    })
})

const ortho = new ol.layer.Tile({
    source: new ol.source.WMTS({
        url: 'https://tiles.maaamet.ee/tm/wmts/1.0.0/WMTSCapabilities.xml',
        layer: 'foto', // Orthophoto
        matrixSet: 'LEST',
        format: 'image/jpeg',
        projection: 'EPSG:3301',
        tileGrid: createLESTTileGrid(),
        attributions: 'Ortofoto: <a href="https://www.maaruum.ee">Maa- ja Ruumiamet</a>'
    })
});

const hist1956 = new ol.layer.Image({
    source: new ol.source.ImageWMS({
        url: 'https://teenus.maaamet.ee/ows/wms-ajalooline-fotoplaan?',
        params: {
            'LAYERS': 'fotoplaan_o10_1',
            'FORMAT': 'image/png',
            'VERSION': '1.1.1'
        },
        crossOrigin: 'anonymous',
        projection: 'EPSG:3301',
        attributions: '1956. a fotoplaan: <a href="https://www.maaruum.ee">Maa- ja Ruumiamet</a>'
    }),
    // Limit to Igaküla area to improve loading performance
    extent: [445400, 6494113, 452528, 6498500]
});


const hist1799 = tiledOverlay(
  './tiles-1799/{z}/{x}/{y}.png',
  tileExtentFromCoords(14, 9241, 9246, 4881, 4885),
  '1799. a kaart: <a href="https://www.ra.ee/kaardid/index.php/et/map/view?id=24511&page=4">EAA.2072.3.359</a>/<a href="https://www.ra.ee/kaardid/index.php/et/map/view?id=24078">EAA.2072.3.366</a>'
);
const hist1866 = tiledOverlay(
  './tiles-1866/{z}/{x}/{y}.png',
  tileExtentFromCoords(14, 9242, 9245, 4881, 4883),
  '1866. a kaart: <a href="https://www.ra.ee/kaardid/index.php/en/map/view?id=6516">EAA.3724.5.2294</a>'
);

const pts1799 = pointLayer('./points-1799.geojson', 'name', '1799. a talunimed: <a href="http://ylo.rehepapp.com/Muhu/K%C3%BClad/Igak%C3%BCla/Igak%C3%BCla.html">Ülo Rehepapp</a>');
const pts1866 = pointLayer('./points-1866.geojson', 'name');
const pts1956 = pointLayer('./points-1956.geojson', 'name');
const pts2025 = pointLayer('./points-2025.geojson', 'name');

const overlay1799 = new ol.layer.Group({ layers: [hist1799, pts1799], visible: false });
const overlay1866 = new ol.layer.Group({ layers: [hist1866, pts1866], visible: false });
const overlay1956 = new ol.layer.Group({ layers: [hist1956, pts1956], visible: false });
const base = new ol.layer.Group({ layers: [elevation, hybrid] });
const current = new ol.layer.Group({ layers: [ortho, pts2025] , visible: false });

const map = new ol.Map({
  target: 'map',
  layers: [
    base,
    current,
    overlay1799,
    overlay1866,
    overlay1956,
  ],
  view: new ol.View({
    extent: [432955, 6487056, 481532, 6506172],
    center: [448583, 6496283],
    projection: ol.proj.get('EPSG:3301'),
    resolution: 1,
  })
});

document.getElementById('opacity').addEventListener('input', e => setOpacity(parseFloat(e.target.value)));
document.querySelectorAll('input[name="overlay"]').forEach(r => {
  r.addEventListener('change', e => setOverlay(e.target.value));
});
document.getElementById('contact-link').addEventListener('click', function(e) {
    e.preventDefault();
    const user = 'mattias';
    const domain = 'igaküla.ee';
    const email = user + '@' + domain;
    window.location.href = 'mailto:' + email + '?subject=Igaküla ajalookaart';
});
document.getElementById('current-year').textContent = new Date().getFullYear();
setOverlay('1799');
setOpacity(1);