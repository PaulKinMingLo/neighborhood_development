import Nano from 'nano';

const couchDBUrl =
  process.env.COUCHDB_URL ||
  'http://localhost:5984';

const couchDBUsername = process.env.COUCHDB_USER;

const couchDBPassword = process.env.COUCHDB_PASSWORD;

export const couchDBName = process.env.COUCHDB_DATABASE || 'neighborhood_dev_app_dev';

// /**
//  * Builds a standardized CouchDB URL with Basic Auth credentials if provided.
//  * Normalizes protocol to ensure http/https.
//  */
// export function getCouchDbUrl(): string {
//   let formatted = couchDBUrl.replace(/^couchbase(s)?:\/\//i, 'http$1://');
//   if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
//     formatted = `http://${formatted}`;
//   }

//   const parsed = new URL(formatted);
//   if (couchDBUsername && !parsed.username) {
//     parsed.username = encodeURIComponent(couchDBUsername);
//   }
//   if (couchDBPassword && !parsed.password) {
//     parsed.password = encodeURIComponent(couchDBPassword);
//   }
//   return parsed.toString();
// }

export const nano = Nano(couchDBUrl);
export const db = nano.db.use(couchDBName);

/**
 * Utility to verify DB connectivity and database access.
 */
export async function checkDbConnection(): Promise<{ ok: boolean; message: string; info?: unknown }> {
  try {
    const info = await db.info();
    return { ok: true, message: `Connected to CouchDB database '${couchDBName}'`, info };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `Failed to connect to CouchDB database '${couchDBName}': ${errorMessage}`,
    };
  }
}

export default db;