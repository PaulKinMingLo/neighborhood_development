import { NextRequest, NextResponse } from "next/server";
import { getDevelopmentData } from "@/api/getDevelopmentData";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 120;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;
  const status = searchParams.get("status") || undefined;
  const ward = searchParams.get("ward") || undefined;
  const applicationType = searchParams.get("type") || undefined;

  const filters: Record<string, string> = {};
  if (status && status !== "ALL") {
    filters["STATUS"] = status;
  }
  if (ward && ward !== "ALL") {
    filters["WARD_NUMBER"] = ward;
  }
  if (applicationType && applicationType !== "ALL") {
    filters["APPLICATION_TYPE"] = applicationType;
  }

  try {
    const data = await getDevelopmentData({
      limit,
      offset,
      q,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error in /api/applications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve development applications" },
      { status: 500 }
    );
  }
}

