export interface DevelopmentApplication {
  id: number;
  applicationNumber: string;
  applicationType: string;
  status: string;
  dateSubmitted: string;
  address: string;
  description: string;
  wardNumber: string;
  wardName: string;
  postal: string;
  applicationUrl?: string;
  meetingDate?: string | null;
  meetingTime?: string | null;
  meetingLocation?: string | null;
  plannerName?: string | null;
  plannerPhone?: string | null;
  plannerEmail?: string | null;

  // WGS84 Geo coordinates for mapping
  latitude: number | null;
  longitude: number | null;

  // Raw coordinates
  x?: string | null;
  y?: string | null;

  // Backwards-compatible aliases for uppercase fields if needed by existing code
  _id?: string;
  _rev?: string;
  APPLICATION_NUMBER?: string;
  APPLICATION_TYPE?: string;
  APPLICATION_STATUS?: string;
  STATUS?: string;
  APPLICATION_DATE?: string;
  ADDRESS?: string;
  DESCRIPTION?: string;
  WARD?: string;
  LATITUDE?: string;
  LONGITUDE?: string;
}

export interface CKANRawRecord {
  _id: number;
  "APPLICATION#"?: string;
  APPLICATION_TYPE: string;
  STATUS: string;
  DATE_SUBMITTED: string;
  STREET_NUM?: string;
  STREET_NAME?: string;
  STREET_TYPE?: string;
  STREET_DIRECTION?: string;
  POSTAL?: string;
  DESCRIPTION?: string;
  X?: string | null;
  Y?: string | null;
  REFERENCE_FILE?: string | null;
  FOLDERRSN?: string | null;
  WARD_NUMBER?: string | null;
  WARD_NAME?: string | null;
  COMMUNITY_MEETING_DATE?: string | null;
  COMMUNITY_MEETING_TIME?: string | null;
  COMMUNITY_MEETING_LOCATION?: string | null;
  APPLICATION_URL?: string | null;
  CONTACT_NAME?: string | null;
  CONTACT_PHONE?: string | null;
  CONTACT_EMAIL?: string | null;
  PARENT_FOLDER_NUMBER?: string | null;
  [key: string]: unknown;
}

export interface CKANDatastoreResponse {
  help: string;
  success: boolean;
  result: {
    resource_id: string;
    fields: Array<{ id: string; type: string; info?: Record<string, unknown> }>;
    records: CKANRawRecord[];
    total: number;
    limit: number;
    sort?: string;
    _links?: {
      start?: string;
      next?: string;
    };
  };
}

export interface ApplicationFilters {
  searchTerm?: string;
  status?: string;
  applicationType?: string;
  ward?: string;
  year?: string;
}

export interface NeighbourhoodFeature {
  type: "Feature";
  id?: number | string;
  properties: {
    _id?: number;
    AREA_ID?: number | string;
    AREA_NAME?: string;
    AREA_SHORT_CODE?: string;
    AREA_ATTR_ID?: number | string;
    [key: string]: unknown;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface NeighbourhoodGeoJSON {
  type: "FeatureCollection";
  features: NeighbourhoodFeature[];
}