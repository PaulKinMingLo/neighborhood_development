import { NextResponse } from "next/server";
import { getNeighbourhoodsGeoJSON } from "@/api/getDevelopmentData";

export async function GET() {
  try {
    const geojson = await getNeighbourhoodsGeoJSON();
    if (!geojson) {
      return NextResponse.json(
        { success: false, error: "Neighbourhood data unavailable" },
        { status: 502 }
      );
    }

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error("Error in /api/neighbourhoods:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

