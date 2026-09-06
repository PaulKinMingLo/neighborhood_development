/**
 * Coordinate projection conversion for City of Toronto Open Data.
 *
 * City of Toronto datasets use Modified Transverse Mercator (MTM) Zone 10
 * with the North American Datum 1927 (NAD27 / Clarke 1866 ellipsoid), EPSG:2019.
 *
 * Parameters for MTM Zone 10 NAD27:
 * - Ellipsoid: Clarke 1866 (a = 6378206.4m, e^2 = 0.006768658)
 * - Central Meridian: -79.5 degrees (-79° 30' W)
 * - Scale factor: 0.9999
 * - False Easting: 304,800.0m (1,000,000 feet)
 * - False Northing: 0.0m
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Converts Toronto MTM Zone 10 NAD27 (X, Y) to standard WGS84 (Latitude, Longitude).
 */
export function mtm10ToWgs84(
  x: number | string | null | undefined,
  y: number | string | null | undefined
): LatLng | null {
  if (x === null || x === undefined || y === null || y === undefined) {
    return null;
  }

  const numX = typeof x === "string" ? parseFloat(x) : x;
  const numY = typeof y === "string" ? parseFloat(y) : y;

  if (isNaN(numX) || isNaN(numY) || numX === 0 || numY === 0) {
    return null;
  }

  // Clarke 1866 parameters
  const a = 6378206.4;
  const e2 = 0.006768658;
  const ePrime2 = e2 / (1 - e2);
  const k0 = 0.9999;
  const x0 = 304800.0;
  const y0 = 0.0;
  const lon0 = (-79.5 * Math.PI) / 180.0;

  const xAdj = numX - x0;
  const yAdj = numY - y0;

  const M = yAdj / k0;
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
    ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = ePrime2 * cosPhi1 * cosPhi1;
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = xAdj / (N1 * k0);

  const latRad =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ePrime2) * Math.pow(D, 4)) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ePrime2 - 3 * C1 * C1) *
          Math.pow(D, 6)) /
          720);

  const lonRad =
    lon0 +
    (D -
      ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ePrime2 + 24 * T1 * T1) * Math.pow(D, 5)) /
        120) /
      cosPhi1;

  const lat = (latRad * 180.0) / Math.PI;
  const lng = (lonRad * 180.0) / Math.PI;

  // Validate coordinates are within greater Toronto Area bounding box
  // Lat: 43.4°N to 44.1°N, Lng: -79.8°W to -79.0°W
  if (lat < 43.4 || lat > 44.1 || lng < -79.8 || lng > -79.0) {
    return null;
  }

  return {
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
  };
}

