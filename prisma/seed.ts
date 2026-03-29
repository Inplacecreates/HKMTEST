import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding HKM Construction demo data...");

  // 1. Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "hkm-construction" },
    update: {},
    create: {
      name: "HKM Construction",
      slug: "hkm-construction",
      primaryColor: "#f97316",
      secondaryColor: "#1e3a5f",
      currency: "KES",
      timezone: "Africa/Nairobi",
    },
  });
  console.log("Tenant created:", tenant.name);

  // 2. Create users (NOTE: These need matching Supabase auth accounts)
  const users = [
    { email: "ceo@hkm.co.ke", fullName: "Hassan Kimani", role: "CEO" as const, phone: "+254700000001" },
    { email: "pm@hkm.co.ke", fullName: "Mary Wanjiku", role: "PROJECT_MANAGER" as const, phone: "+254700000002" },
    { email: "qs@hkm.co.ke", fullName: "Peter Ochieng", role: "QS" as const, phone: "+254700000003" },
    { email: "architect@hkm.co.ke", fullName: "Grace Akinyi", role: "ARCHITECT" as const, phone: "+254700000004" },
    { email: "driver@hkm.co.ke", fullName: "James Mwangi", role: "DRIVER" as const, phone: "+254700000005" },
    { email: "site1@hkm.co.ke", fullName: "David Omondi", role: "SITE_MANAGER" as const, phone: "+254700000006" },
    { email: "site2@hkm.co.ke", fullName: "Joseph Kipchoge", role: "SITE_MANAGER" as const, phone: "+254700000007" },
  ];

  const createdUsers: Record<string, string> = {};
  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: user.email } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        whatsappNumber: user.phone,
      },
    });
    createdUsers[user.role + (user.email.includes("site1") ? "1" : user.email.includes("site2") ? "2" : "")] = created.id;
    console.log(`  User: ${user.fullName} (${user.role})`);
  }

  // 3. Create projects
  const project1 = await prisma.project.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "KRN" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Karen Residence",
      code: "KRN",
      clientName: "John Kamau",
      clientPhone: "+254711111111",
      clientEmail: "john@example.com",
      address: "Karen, Nairobi",
      description: "4-bedroom residential house with pool",
      status: "ACTIVE",
      totalBudget: 15000000,
      allocatedBudget: 8000000,
      startDate: new Date("2026-01-15"),
      targetEndDate: new Date("2026-09-30"),
      createdBy: createdUsers["CEO"],
    },
  });

  const project2 = await prisma.project.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "KSR" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Kisamis Road Apartments",
      code: "KSR",
      clientName: "Wambui Enterprises",
      clientPhone: "+254722222222",
      address: "Kisamis Road, Ngong",
      description: "8-unit apartment complex",
      status: "ACTIVE",
      totalBudget: 45000000,
      allocatedBudget: 20000000,
      startDate: new Date("2025-11-01"),
      targetEndDate: new Date("2027-03-31"),
      createdBy: createdUsers["CEO"],
    },
  });

  const project3 = await prisma.project.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "LVN" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Lavington Office Block",
      code: "LVN",
      clientName: "Nairobi Holdings Ltd",
      clientPhone: "+254733333333",
      address: "Lavington, Nairobi",
      description: "3-storey commercial office building",
      status: "PLANNING",
      totalBudget: 80000000,
      startDate: new Date("2026-06-01"),
      targetEndDate: new Date("2028-01-31"),
      createdBy: createdUsers["CEO"],
    },
  });

  console.log("Projects created:", [project1.name, project2.name, project3.name].join(", "));

  // 4. Create budget categories for each project
  for (const projectId of [project1.id, project2.id, project3.id]) {
    for (const category of ["materials", "labor", "equipment", "overhead"]) {
      await prisma.projectBudget.upsert({
        where: { projectId_category: { projectId, category } },
        update: {},
        create: { projectId, category },
      });
    }
  }

  // 5. Create sites
  const existingSite1 = await prisma.site.findFirst({
    where: { tenantId: tenant.id, projectId: project1.id, name: "Karen Main House" },
  });
  const site1 = existingSite1 ?? await prisma.site.create({
    data: {
      tenantId: tenant.id,
      projectId: project1.id,
      name: "Karen Main House",
      address: "Plot 123, Karen Road",
      siteManagerId: createdUsers["SITE_MANAGER1"],
    },
  });

  const existingSite2 = await prisma.site.findFirst({
    where: { tenantId: tenant.id, projectId: project2.id, name: "Block A" },
  });
  const site2 = existingSite2 ?? await prisma.site.create({
    data: {
      tenantId: tenant.id,
      projectId: project2.id,
      name: "Block A",
      address: "Kisamis Road, Block A",
      siteManagerId: createdUsers["SITE_MANAGER1"],
    },
  });

  const existingSite3 = await prisma.site.findFirst({
    where: { tenantId: tenant.id, projectId: project2.id, name: "Block B" },
  });
  const site3 = existingSite3 ?? await prisma.site.create({
    data: {
      tenantId: tenant.id,
      projectId: project2.id,
      name: "Block B",
      address: "Kisamis Road, Block B",
      siteManagerId: createdUsers["SITE_MANAGER2"],
    },
  });

  console.log("Sites created:", [site1.name, site2.name, site3.name].join(", "));

  // 6. Create suppliers
  const suppliers = [
    { name: "Bamburi Cement", contact: "Sales Team", phone: "+254700100100", categories: ["cement", "building materials"] },
    { name: "Mabati Rolling Mills", contact: "John", phone: "+254700200200", categories: ["roofing", "steel"] },
    { name: "Nairobi Timber Supplies", contact: "Wekesa", phone: "+254700300300", categories: ["timber", "plywood"] },
    { name: "City Plumbing", contact: "Otieno", phone: "+254700400400", categories: ["plumbing", "pipes"] },
    { name: "Kenya Electrical Supplies", contact: "Njoroge", phone: "+254700500500", categories: ["electrical", "wiring"] },
  ];

  for (const supplier of suppliers) {
    await prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        name: supplier.name,
        contactPerson: supplier.contact,
        phone: supplier.phone,
        categories: supplier.categories,
      },
    });
  }
  console.log("Suppliers created:", suppliers.length);

  // 7. Create item catalog — comprehensive Kenyan construction materials
  const catalogItems = [
    // --- Concrete & Masonry ---
    { name: "Cement (Bamburi OPC 42.5R)", sku: "CEM-BAM-42", unit: "bags", category: "Concrete & Masonry", price: 760 },
    { name: "Cement (Savannah OPC 42.5R)", sku: "CEM-SAV-42", unit: "bags", category: "Concrete & Masonry", price: 740 },
    { name: "Cement (National OPC 42.5R)", sku: "CEM-NAT-42", unit: "bags", category: "Concrete & Masonry", price: 720 },
    { name: "River Sand (Fine)", sku: "SAND-RIV-F", unit: "tonnes", category: "Concrete & Masonry", price: 2800 },
    { name: "Sharp Sand (Coarse)", sku: "SAND-SHP-C", unit: "tonnes", category: "Concrete & Masonry", price: 2400 },
    { name: "Ballast (20mm Crushed Stone)", sku: "BAL-20MM", unit: "tonnes", category: "Concrete & Masonry", price: 3200 },
    { name: "Ballast (40mm Crushed Stone)", sku: "BAL-40MM", unit: "tonnes", category: "Concrete & Masonry", price: 3000 },
    { name: "Hollow Blocks (6 inch)", sku: "BLK-HOL-6", unit: "pieces", category: "Concrete & Masonry", price: 75 },
    { name: "Hollow Blocks (4 inch)", sku: "BLK-HOL-4", unit: "pieces", category: "Concrete & Masonry", price: 55 },
    { name: "Burnt Bricks", sku: "BRK-BNT", unit: "pieces", category: "Concrete & Masonry", price: 18 },
    { name: "Precast Lintel (1.2m)", sku: "LNT-1200", unit: "pieces", category: "Concrete & Masonry", price: 350 },
    { name: "Precast Lintel (1.5m)", sku: "LNT-1500", unit: "pieces", category: "Concrete & Masonry", price: 450 },
    { name: "Precast Lintel (2.4m)", sku: "LNT-2400", unit: "pieces", category: "Concrete & Masonry", price: 720 },
    { name: "Binding Wire", sku: "WIR-BND", unit: "kg", category: "Concrete & Masonry", price: 180 },
    { name: "Concrete Spacers (25mm)", sku: "SPC-25", unit: "bags", category: "Concrete & Masonry", price: 400 },

    // --- Steel & Ironmongery ---
    { name: "Rebar Y8 (12m)", sku: "RBR-Y8", unit: "pieces", category: "Steel & Ironmongery", price: 380 },
    { name: "Rebar Y10 (12m)", sku: "RBR-Y10", unit: "pieces", category: "Steel & Ironmongery", price: 580 },
    { name: "Rebar Y12 (12m)", sku: "RBR-Y12", unit: "pieces", category: "Steel & Ironmongery", price: 850 },
    { name: "Rebar Y16 (12m)", sku: "RBR-Y16", unit: "pieces", category: "Steel & Ironmongery", price: 1450 },
    { name: "Rebar Y20 (12m)", sku: "RBR-Y20", unit: "pieces", category: "Steel & Ironmongery", price: 2250 },
    { name: "Rebar Y25 (12m)", sku: "RBR-Y25", unit: "pieces", category: "Steel & Ironmongery", price: 3500 },
    { name: "BRC Mesh A142 (2.4x4.8m)", sku: "BRC-A142", unit: "sheets", category: "Steel & Ironmongery", price: 3800 },
    { name: "MS Flat Bar 50x6mm (6m)", sku: "FLT-50X6", unit: "pieces", category: "Steel & Ironmongery", price: 950 },
    { name: "Angle Iron 50x50x5mm (6m)", sku: "ANG-50X50", unit: "pieces", category: "Steel & Ironmongery", price: 1100 },
    { name: "Bolts & Nuts (M12 Set)", sku: "BLT-M12", unit: "pieces", category: "Steel & Ironmongery", price: 45 },
    { name: "Gate Hinges (Heavy Duty)", sku: "HNG-GT-HD", unit: "pairs", category: "Steel & Ironmongery", price: 650 },
    { name: "Padlock (Long Shackle)", sku: "PDL-LS", unit: "pieces", category: "Steel & Ironmongery", price: 850 },

    // --- Timber & Board ---
    { name: "Timber 2x2 (3.6m)", sku: "TIM-2X2", unit: "pieces", category: "Timber & Board", price: 280 },
    { name: "Timber 2x4 (3.6m)", sku: "TIM-2X4", unit: "pieces", category: "Timber & Board", price: 480 },
    { name: "Timber 2x6 (3.6m)", sku: "TIM-2X6", unit: "pieces", category: "Timber & Board", price: 720 },
    { name: "Timber 3x3 (3.6m)", sku: "TIM-3X3", unit: "pieces", category: "Timber & Board", price: 620 },
    { name: "Plywood 9mm (2.44x1.22m)", sku: "PLY-9MM", unit: "sheets", category: "Timber & Board", price: 2200 },
    { name: "Plywood 12mm (2.44x1.22m)", sku: "PLY-12MM", unit: "sheets", category: "Timber & Board", price: 2600 },
    { name: "Plywood 18mm (2.44x1.22m)", sku: "PLY-18MM", unit: "sheets", category: "Timber & Board", price: 3200 },
    { name: "Shuttering Plywood 18mm", sku: "PLY-SHT-18", unit: "sheets", category: "Timber & Board", price: 2800 },
    { name: "Hardboard 3mm (2.44x1.22m)", sku: "HBD-3MM", unit: "sheets", category: "Timber & Board", price: 900 },
    { name: "MDF Board 12mm (2.44x1.22m)", sku: "MDF-12MM", unit: "sheets", category: "Timber & Board", price: 2400 },

    // --- Roofing ---
    { name: "Mabati Sheets G28 (3m)", sku: "MBT-G28-3M", unit: "pieces", category: "Roofing", price: 1950 },
    { name: "Mabati Sheets G30 (3m)", sku: "MBT-G30-3M", unit: "pieces", category: "Roofing", price: 1650 },
    { name: "Mabati Sheets G32 (3m)", sku: "MBT-G32-3M", unit: "pieces", category: "Roofing", price: 1400 },
    { name: "Mabati Ridge Cap (3m)", sku: "MBT-RDG-3M", unit: "pieces", category: "Roofing", price: 750 },
    { name: "Roofing Nails (2 inch)", sku: "NAL-RF-2", unit: "kg", category: "Roofing", price: 220 },
    { name: "Roof Bolts (75mm)", sku: "BLT-RF-75", unit: "boxes", category: "Roofing", price: 650 },
    { name: "Polycarbonate Sheet Clear (2x6m)", sku: "PCB-CLR-2X6", unit: "sheets", category: "Roofing", price: 4500 },
    { name: "Timber Roof Truss (6m Span)", sku: "TRS-TIM-6M", unit: "sets", category: "Roofing", price: 12000 },
    { name: "Fascia Board (3m)", sku: "FSC-3M", unit: "pieces", category: "Roofing", price: 480 },

    // --- Plumbing ---
    { name: "PVC Pipe 3/4 inch (6m)", sku: "PVC-075-6M", unit: "pieces", category: "Plumbing", price: 480 },
    { name: "PVC Pipe 1 inch (6m)", sku: "PVC-1-6M", unit: "pieces", category: "Plumbing", price: 680 },
    { name: "PVC Pipe 2 inch (6m)", sku: "PVC-2-6M", unit: "pieces", category: "Plumbing", price: 950 },
    { name: "PVC Pipe 4 inch (6m)", sku: "PVC-4-6M", unit: "pieces", category: "Plumbing", price: 1350 },
    { name: "PPR Pipe 20mm (4m)", sku: "PPR-20-4M", unit: "pieces", category: "Plumbing", price: 550 },
    { name: "PPR Pipe 25mm (4m)", sku: "PPR-25-4M", unit: "pieces", category: "Plumbing", price: 750 },
    { name: "PVC Elbow 4 inch", sku: "ELB-PVC-4", unit: "pieces", category: "Plumbing", price: 180 },
    { name: "PVC Tee 4 inch", sku: "TEE-PVC-4", unit: "pieces", category: "Plumbing", price: 220 },
    { name: "Ball Valve 3/4 inch", sku: "VLV-BAL-075", unit: "pieces", category: "Plumbing", price: 650 },
    { name: "Gate Valve 1 inch", sku: "VLV-GT-1", unit: "pieces", category: "Plumbing", price: 950 },
    { name: "Pillar Tap (Chrome)", sku: "TAP-PIL-CHR", unit: "pieces", category: "Plumbing", price: 1200 },
    { name: "Water Tank 500L (Roto)", sku: "TNK-500L", unit: "pieces", category: "Plumbing", price: 6500 },
    { name: "Water Tank 1000L (Roto)", sku: "TNK-1000L", unit: "pieces", category: "Plumbing", price: 11000 },
    { name: "Manhole Cover (600x600mm)", sku: "MNH-600", unit: "pieces", category: "Plumbing", price: 4800 },

    // --- Electrical ---
    { name: "Cable 1.5mm Single Core (100m)", sku: "CAB-1.5-100", unit: "rolls", category: "Electrical", price: 3200 },
    { name: "Cable 2.5mm Single Core (100m)", sku: "CAB-2.5-100", unit: "rolls", category: "Electrical", price: 5500 },
    { name: "Cable 4mm Single Core (100m)", sku: "CAB-4-100", unit: "rolls", category: "Electrical", price: 8800 },
    { name: "Cable 6mm Single Core (100m)", sku: "CAB-6-100", unit: "rolls", category: "Electrical", price: 12500 },
    { name: "Cable 10mm Single Core (100m)", sku: "CAB-10-100", unit: "rolls", category: "Electrical", price: 19000 },
    { name: "Conduit Pipe 20mm (3m)", sku: "CDT-20-3M", unit: "pieces", category: "Electrical", price: 120 },
    { name: "DB Box 8-Way Surface", sku: "DB-8W-SRF", unit: "pieces", category: "Electrical", price: 2800 },
    { name: "MCB 20A Single Pole", sku: "MCB-20A-1P", unit: "pieces", category: "Electrical", price: 850 },
    { name: "MCB 32A Single Pole", sku: "MCB-32A-1P", unit: "pieces", category: "Electrical", price: 1100 },
    { name: "Switch 1-Gang (Surface)", sku: "SWT-1G-SRF", unit: "pieces", category: "Electrical", price: 350 },
    { name: "Socket 2-Gang (Surface)", sku: "SKT-2G-SRF", unit: "pieces", category: "Electrical", price: 650 },
    { name: "Bulkhead Light E27", sku: "LGT-BLK-E27", unit: "pieces", category: "Electrical", price: 1200 },
    { name: "LED Flood Light 50W", sku: "LGT-FLD-50W", unit: "pieces", category: "Electrical", price: 3500 },

    // --- Finishes ---
    { name: "Primer Paint (20L)", sku: "PNT-PRM-20", unit: "tins", category: "Finishes", price: 4500 },
    { name: "Emulsion Paint White (20L)", sku: "PNT-EMU-W20", unit: "tins", category: "Finishes", price: 5800 },
    { name: "Gloss Paint (4L)", sku: "PNT-GLS-4", unit: "tins", category: "Finishes", price: 2200 },
    { name: "Texture Paint (20L)", sku: "PNT-TXT-20", unit: "tins", category: "Finishes", price: 7500 },
    { name: "Floor Tiles (60x60cm, per box)", sku: "TLE-FLR-60", unit: "boxes", category: "Finishes", price: 3200 },
    { name: "Wall Tiles (30x45cm, per box)", sku: "TLE-WLL-30", unit: "boxes", category: "Finishes", price: 2400 },
    { name: "Tile Adhesive (20kg)", sku: "ADH-TLE-20", unit: "bags", category: "Finishes", price: 650 },
    { name: "Tile Grout White (5kg)", sku: "GRT-TLE-W5", unit: "bags", category: "Finishes", price: 450 },
    { name: "POP (Plaster of Paris, 40kg)", sku: "POP-40KG", unit: "bags", category: "Finishes", price: 550 },
    { name: "Wall Putty (40kg)", sku: "PUT-WLL-40", unit: "bags", category: "Finishes", price: 1800 },

    // --- Doors & Windows ---
    { name: "Steel Door (900x2100mm)", sku: "DR-STL-900", unit: "pieces", category: "Doors & Windows", price: 28000 },
    { name: "Wooden Door (900x2100mm)", sku: "DR-WD-900", unit: "pieces", category: "Doors & Windows", price: 18000 },
    { name: "Aluminium Window (1200x1000mm)", sku: "WIN-ALU-12X10", unit: "pieces", category: "Doors & Windows", price: 14000 },
    { name: "Steel Door Frame (900mm)", sku: "FRM-DR-STL-900", unit: "pieces", category: "Doors & Windows", price: 5500 },
    { name: "Door Handle (Lever, Chrome)", sku: "HDL-LVR-CHR", unit: "pieces", category: "Doors & Windows", price: 1800 },
    { name: "Door Hinges (100mm, Set of 3)", sku: "HNG-DR-100", unit: "sets", category: "Doors & Windows", price: 550 },

    // --- Consumables ---
    { name: "Nails 2 inch (1kg)", sku: "NAL-2IN-1K", unit: "kg", category: "Consumables", price: 180 },
    { name: "Nails 3 inch (1kg)", sku: "NAL-3IN-1K", unit: "kg", category: "Consumables", price: 190 },
    { name: "Nails 4 inch (1kg)", sku: "NAL-4IN-1K", unit: "kg", category: "Consumables", price: 200 },
    { name: "Wood Screws Assorted (200pcs)", sku: "SCR-WD-AST", unit: "boxes", category: "Consumables", price: 550 },
    { name: "Sandpaper P80 (Sheet)", sku: "SDP-P80", unit: "pieces", category: "Consumables", price: 55 },
    { name: "Masking Tape 50mm", sku: "TPE-MSK-50", unit: "rolls", category: "Consumables", price: 180 },
    { name: "Silicone Sealant Clear (300ml)", sku: "SLN-CLR-300", unit: "pieces", category: "Consumables", price: 450 },
    { name: "PVC Glue 250ml", sku: "GLU-PVC-250", unit: "pieces", category: "Consumables", price: 280 },
    { name: "Contact Cement 1L", sku: "GLU-CCT-1L", unit: "pieces", category: "Consumables", price: 750 },
    { name: "Pipe Wrap Tape (PTFE)", sku: "TPE-PTFE", unit: "rolls", category: "Consumables", price: 80 },
  ];

  for (const item of catalogItems) {
    await prisma.itemCatalog.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: item.name } },
      update: {
        defaultUnit: item.unit,
        category: item.category,
        averagePrice: item.price,
        sku: item.sku,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        name: item.name,
        defaultUnit: item.unit,
        category: item.category,
        averagePrice: item.price,
        sku: item.sku,
        isActive: true,
      },
    });
  }
  console.log("Catalog items created/updated:", catalogItems.length);

  console.log("\nSeed complete! Demo data ready for HKM Construction.");
  console.log("\nDemo accounts (create in Supabase Auth with password 'hkm12345'):");
  for (const user of users) {
    console.log(`  ${user.email} - ${user.fullName} (${user.role})`);
  }
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
