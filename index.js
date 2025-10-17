// 1) Base map: Maa-amet TMS @3857 (GMC)
const baseFoto = new ol.layer.Tile({
  title: 'Maa-amet ortofoto',
  source: new ol.source.XYZ({
    url: 'https://tiles.maaamet.ee/tm/tms/1.0.0/foto@GMC/{z}/{x}/{-y}.jpg',
    maxZoom: 18,
    crossOrigin: 'anonymous',
    attributions: 'Aluskaart: <a href="https://www.maaamet.ee/">Maa-amet</a>'
  })
});

const baseHybrid = new ol.layer.Tile({
  title: 'Maa-amet hübriid',
  source: new ol.source.XYZ({
    url: 'https://tiles.maaamet.ee/tm/tms/1.0.0/hybriid@GMC/{z}/{x}/{-y}.png',
    maxZoom: 18,
    crossOrigin: 'anonymous'
  })
});

// 2) Historic tiled rasters (XYZ)
function tiledOverlay(url, opacity=1, extent=null, attributions=null) {
  return new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: url,
      maxZoom: 18,
      crossOrigin: 'anonymous',
      attributions: attributions
    }),
    opacity,
    extent: extent  // Limit tile requests to this area
  });
}

// Calculate extent from tile coordinates (Web Mercator tile scheme)
function tileExtentFromCoords(zoom, minX, maxX, minY, maxY) {
  const n = Math.pow(2, zoom);
  const lon1 = (minX / n) * 360 - 180;
  const lon2 = ((maxX + 1) / n) * 360 - 180;
  const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (maxY + 1) / n))) * 180 / Math.PI;
  const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * minY / n))) * 180 / Math.PI;
  return ol.proj.transformExtent([lon1, lat1, lon2, lat2], 'EPSG:4326', 'EPSG:3857');
}

// Define extent based on your actual tile coverage at zoom 14:
// X range: 9241-9246, Y range: 4881-4885
const hist1799 = tiledOverlay(
  './tiles-1799/{z}/{x}/{y}.png',
  0.7,
  tileExtentFromCoords(14, 9241, 9246, 4881, 4885),
  '1799 kaart: <a href="https://www.ra.ee/kaardid/index.php/et/map/view?id=24511&page=4">EAA.2072.3.359</a>/<a href="https://www.ra.ee/kaardid/index.php/et/map/view?id=24078">EAA.2072.3.366</a>'
);

// 3) Points (GeoJSON)
function pointLayer(url, labelField, attributions=null) {
  return new ol.layer.Vector({
    source: new ol.source.Vector({
      url: url,
      format: new ol.format.GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
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

const pts1799 = pointLayer('./points-1799.geojson', 'name', '1799 talunimed: <a href="http://ylo.rehepapp.com/Muhu/K%C3%BClad/Igak%C3%BCla/Igak%C3%BCla.html">Ülo Rehepapp</a>');

// 4) Group each period: raster + points together, and keep groups exclusive
const overlay1799 = new ol.layer.Group({ layers: [hist1799, pts1799], visible: false });

// Define the bounding box for the restricted area
const boundingBox = ol.proj.transformExtent([23.0, 58.5, 23.5, 58.7], 'EPSG:4326', 'EPSG:3857');

const map = new ol.Map({
  target: 'map',
  layers: [baseFoto, baseHybrid, overlay1799],
  view: new ol.View({
    center: ol.proj.fromLonLat([23.116, 58.602]),
    minZoom: 12,
    maxZoom: 18,
    zoom: 16,
    extent: boundingBox  // Restrict view to this bounding box
  })
});

function setOverlay(which) {
  overlay1799.setVisible(which === '1799');
  baseHybrid.setVisible(which === 'none');

  // Show/hide opacity control based on selection
  const opacityGroup = document.getElementById('opacity-group');
  opacityGroup.style.display = (which === 'none') ? 'none' : 'block';
}
document.querySelectorAll('input[name="overlay"]').forEach(r => {
  r.addEventListener('change', e => setOverlay(e.target.value));
});

// 6) UI: opacity slider (affects only the rasters, not the point labels)
const opacityInput = document.getElementById('opacity');
function setOpacity(o) {
  hist1799.setOpacity(o);
}

opacityInput.addEventListener('input', e => setOpacity(parseFloat(e.target.value)));
setOverlay('1799');
setOpacity(1);