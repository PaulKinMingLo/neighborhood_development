import {
  DevelopmentApplication,
  CKANDatastoreResponse,
  CKANRawRecord,
  NeighbourhoodGeoJSON,
} from "../types/development";
import { mtm10ToWgs84 } from "../utils/coordinates";

const CKAN_BASE_URL = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action";
const DEVELOPMENT_RESOURCE_ID = "8907d8ed-c515-4ce9-b674-9f8c6eefcf0d";
const NEIGHBOURHOODS_GEOJSON_URL =
  "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/fc443770-ef0a-4025-9c2c-2cb558bfab00/resource/0719053b-28b7-48ea-b863-068823a93aaa/download/neighbourhoods-4326.geojson";

/**
 * Formats a clean street address string from constituent fields.
 */
function formatAddress(record: CKANRawRecord): string {
  const parts = [
    record.STREET_NUM?.trim(),
    record.STREET_NAME?.trim(),
    record.STREET_TYPE?.trim(),
    record.STREET_DIRECTION?.trim(),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : "Address Unspecified";
}

/**
 * Maps raw CKAN record into normalized DevelopmentApplication model.
 */
export function transformCKANRecord(record: CKANRawRecord): DevelopmentApplication {
  const address = formatAddress(record);
  const coords = mtm10ToWgs84(record.X, record.Y);

  const appNumber = record["APPLICATION#"] || `DEV-${record._id}`;
  const appType = record.APPLICATION_TYPE || "General";
  const status = record.STATUS || "Under Review";
  const dateSubmitted = record.DATE_SUBMITTED || new Date().toISOString();
  const description = record.DESCRIPTION || "No detailed description provided.";
  const wardNumber = record.WARD_NUMBER || "";
  const wardName = record.WARD_NAME || (wardNumber ? `Ward ${wardNumber}` : "Toronto");
  const postal = record.POSTAL?.trim() || "";

  return {
    id: record._id,
    applicationNumber: appNumber,
    applicationType: appType,
    status: status,
    dateSubmitted: dateSubmitted,
    address: address,
    description: description,
    wardNumber: wardNumber,
    wardName: wardName,
    postal: postal,
    applicationUrl: record.APPLICATION_URL || undefined,
    meetingDate: record.COMMUNITY_MEETING_DATE || null,
    meetingTime: record.COMMUNITY_MEETING_TIME || null,
    meetingLocation: record.COMMUNITY_MEETING_LOCATION || null,
    plannerName: record.CONTACT_NAME || null,
    plannerPhone: record.CONTACT_PHONE || null,
    plannerEmail: record.CONTACT_EMAIL || null,

    latitude: coords ? coords.lat : null,
    longitude: coords ? coords.lng : null,
    x: record.X || null,
    y: record.Y || null,

    // Backward compatibility aliases
    _id: record._id,
    APPLICATION_NUMBER: appNumber,
    APPLICATION_TYPE: appType,
    APPLICATION_STATUS: status,
    STATUS: status,
    APPLICATION_DATE: dateSubmitted,
    ADDRESS: address,
    DESCRIPTION: description,
    WARD: wardName,
    LATITUDE: coords ? coords.lat.toString() : "",
    LONGITUDE: coords ? coords.lng.toString() : "",
  };
}

export interface FetchOptions {
  limit?: number;
  offset?: number;
  q?: string;
  filters?: Record<string, string>;
  sort?: string;
  year?: string;
}

/**
 * Retrieves Development Applications from Open Data Toronto CKAN Datastore.
 */
export async function getDevelopmentData(
  options: FetchOptions = {}
): Promise<DevelopmentApplication[]> {
  const limit = options.limit ?? 120;
  const sort = options.sort ?? "DATE_SUBMITTED desc";

  const params = new URLSearchParams({
    id: DEVELOPMENT_RESOURCE_ID,
    limit: limit.toString(),
    sort: sort,
  });

  if (options.offset) {
    params.set("offset", options.offset.toString());
  }

  if (options.q && options.q.trim()) {
    params.set("q", options.q.trim());
  }

  if (options.filters && Object.keys(options.filters).length > 0) {
    params.set("filters", JSON.stringify(options.filters));
  }

  const endpoint = `${CKAN_BASE_URL}/datastore_search?${params.toString()}`;

  try {
    const response = await fetch(endpoint, {
      next: { revalidate: 1800 }, // Cache on server for 30 minutes
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Open Data Toronto API returned status ${response.status}`);
    }

    const data: CKANDatastoreResponse = await response.json();

    if (!data.success || !data.result || !Array.isArray(data.result.records)) {
      throw new Error("Invalid response format from Open Data Toronto CKAN API");
    }

    let records = data.result.records.map(transformCKANRecord);

    if (options.year && options.year !== "ALL") {
      records = records.filter((app) => {
        if (!app.dateSubmitted) return false;
        const match = app.dateSubmitted.match(/^(\d{4})/);
        const appYear = match
          ? match[1]
          : (!isNaN(new Date(app.dateSubmitted).getTime())
          ? new Date(app.dateSubmitted).getFullYear().toString()
          : null);
        return appYear === options.year;
      });
    }

    return records;
  } catch (error) {
    console.error("Failed to fetch Development Applications from Open Data Toronto:", error);
    // Return sample prototype applications as fallback
    return getFallbackApplications(options.year);
  }
}

/**
 * Retrieves Toronto Neighbourhood Boundaries GeoJSON.
 */
export async function getNeighbourhoodsGeoJSON(): Promise<NeighbourhoodGeoJSON | null> {
  try {
    const response = await fetch(NEIGHBOURHOODS_GEOJSON_URL, {
      next: { revalidate: 86400 }, // Cache for 24 hours
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch neighbourhoods GeoJSON: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Toronto Neighbourhoods GeoJSON:", error);
    return null;
  }
}

/**
 * Curated fallback data for offline prototyping and test resilience.
 */
function getFallbackApplications(year?: string): DevelopmentApplication[] {
  const fallbackRaw: CKANRawRecord[] = [
    {
      _id: 101,
      "APPLICATION#": "23 110245 STE 10 OZ",
      APPLICATION_TYPE: "OZ",
      STATUS: "Under Review",
      DATE_SUBMITTED: "2023-11-12T00:00:00",
      STREET_NUM: "664",
      STREET_NAME: "YONGE",
      STREET_TYPE: "ST",
      STREET_DIRECTION: " ",
      POSTAL: "M4Y",
      X: "314002.763",
      Y: "4836132.728",
      DESCRIPTION:
        "Zoning By-law Amendment for a 75-storey mixed-use building containing 548 residential dwelling units with retail at grade.",
      WARD_NUMBER: "13",
      WARD_NAME: "Toronto Centre",
      APPLICATION_URL: "http://app.toronto.ca/AIC/index.do",
      CONTACT_NAME: "Sarah Jenkins",
      CONTACT_PHONE: "416-392-1234",
      CONTACT_EMAIL: "sarah.jenkins@toronto.ca",
    },
    {
      _id: 102,
      "APPLICATION#": "24 115890 WET 03 SA",
      APPLICATION_TYPE: "SA",
      STATUS: "Application Received",
      DATE_SUBMITTED: "2024-06-01T00:00:00",
      STREET_NUM: "2900",
      STREET_NAME: "BLOOR",
      STREET_TYPE: "ST",
      STREET_DIRECTION: "W",
      POSTAL: "M8X",
      X: "305120.500",
      Y: "4834850.200",
      DESCRIPTION:
        "Site Plan Control Application for an 8-storey mid-rise residential building with ground floor commercial space.",
      WARD_NUMBER: "03",
      WARD_NAME: "Etobicoke-Lakeshore",
      APPLICATION_URL: "http://app.toronto.ca/AIC/index.do",
      CONTACT_NAME: "Mark Henderson",
      CONTACT_PHONE: "416-394-5678",
      CONTACT_EMAIL: "mark.henderson@toronto.ca",
    },
    {
      _id: 103,
      "APPLICATION#": "24 120400 ESC 23 MV",
      APPLICATION_TYPE: "MV",
      STATUS: "Hearing Scheduled",
      DATE_SUBMITTED: "2024-06-15T00:00:00",
      STREET_NUM: "28",
      STREET_NAME: "MAC FROST",
      STREET_TYPE: "WAY",
      STREET_DIRECTION: " ",
      POSTAL: "M1B",
      X: "326384.932",
      Y: "4855334.869",
      DESCRIPTION:
        "Minor Variance to construct 14 semi-detached dwelling units and 23 street townhouses.",
      WARD_NUMBER: "23",
      WARD_NAME: "Scarborough North",
      COMMUNITY_MEETING_DATE: "2024-09-20T00:00:00",
      COMMUNITY_MEETING_TIME: "7:00pm",
      COMMUNITY_MEETING_LOCATION: "Community Recreation Centre",
      APPLICATION_URL: "http://app.toronto.ca/AIC/index.do",
      CONTACT_NAME: "David Zhang",
      CONTACT_PHONE: "416-396-8899",
      CONTACT_EMAIL: "david.zhang@toronto.ca",
    },
    {
      _id: 104,
      "APPLICATION#": "25 130120 NY 18 OZ",
      APPLICATION_TYPE: "OZ",
      STATUS: "Under Review",
      DATE_SUBMITTED: "2025-01-20T00:00:00",
      STREET_NUM: "5000",
      STREET_NAME: "YONGE",
      STREET_TYPE: "ST",
      STREET_DIRECTION: " ",
      POSTAL: "M2N",
      X: "313550.000",
      Y: "4847200.000",
      DESCRIPTION:
        "Proposed dual-tower development (38 and 42 storeys) featuring 800 residential units and a new publicly accessible park.",
      WARD_NUMBER: "18",
      WARD_NAME: "Willowdale",
      APPLICATION_URL: "http://app.toronto.ca/AIC/index.do",
      CONTACT_NAME: "Elena Rostova",
      CONTACT_PHONE: "416-395-4321",
      CONTACT_EMAIL: "elena.rostova@toronto.ca",
    },
    {
      _id: 105,
      "APPLICATION#": "24 135800 TEY 19 CD",
      APPLICATION_TYPE: "CD",
      STATUS: "Approved",
      DATE_SUBMITTED: "2024-07-18T00:00:00",
      STREET_NUM: "150",
      STREET_NAME: "QUEEN",
      STREET_TYPE: "ST",
      STREET_DIRECTION: "E",
      POSTAL: "M5A",
      X: "315200.000",
      Y: "4834200.000",
      DESCRIPTION:
        "Draft Plan of Condominium for a 24-storey residential building with 310 residential units.",
      WARD_NUMBER: "13",
      WARD_NAME: "Toronto Centre",
      APPLICATION_URL: "http://app.toronto.ca/AIC/index.do",
      CONTACT_NAME: "Michael Vance",
      CONTACT_PHONE: "416-392-7788",
      CONTACT_EMAIL: "michael.vance@toronto.ca",
    },
  ];

  const apps = fallbackRaw.map(transformCKANRecord);

  if (year && year !== "ALL") {
    return apps.filter((app) => {
      if (!app.dateSubmitted) return false;
      const match = app.dateSubmitted.match(/^(\d{4})/);
      const appYear = match
        ? match[1]
        : (!isNaN(new Date(app.dateSubmitted).getTime())
        ? new Date(app.dateSubmitted).getFullYear().toString()
        : null);
      return appYear === year;
    });
  }

  return apps;
}