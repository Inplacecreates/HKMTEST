import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission("settings:manage");

    const settings = await prisma.appSettings.findUnique({
      where: { tenantId: user.tenantId },
    });

    // Return defaults if no settings record yet
    if (!settings) {
      return NextResponse.json({
        companyName: null,
        tradingName: null,
        kraPin: null,
        vatNumber: null,
        logoUrl: null,
        phone: null,
        email: null,
        website: null,
        address: null,
        postalAddress: null,
        defaultCurrency: "KES",
        dateFormat: "DD/MM/YYYY",
        fiscalYearStartMonth: 1,
        defaultPaymentTerms: "Net 30",
        emailOnReqStatus: true,
        emailOnBudgetAlert: true,
        emailOnDelivery: true,
        inAppNotifications: true,
        whatsappNumber: null,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requirePermission("settings:manage");
    const body = await request.json();

    const allowed = [
      "companyName",
      "tradingName",
      "kraPin",
      "vatNumber",
      "logoUrl",
      "phone",
      "email",
      "website",
      "address",
      "postalAddress",
      "defaultCurrency",
      "dateFormat",
      "fiscalYearStartMonth",
      "defaultPaymentTerms",
      "emailOnReqStatus",
      "emailOnBudgetAlert",
      "emailOnDelivery",
      "inAppNotifications",
      "whatsappNumber",
    ];

    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key];
      }
    }

    const settings = await prisma.appSettings.upsert({
      where: { tenantId: user.tenantId },
      update: data,
      create: {
        tenantId: user.tenantId,
        ...data,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
