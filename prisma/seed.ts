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
  const site1 = await prisma.site.create({
    data: {
      tenantId: tenant.id,
      projectId: project1.id,
      name: "Karen Main House",
      address: "Plot 123, Karen Road",
      siteManagerId: createdUsers["SITE_MANAGER1"],
    },
  });

  const site2 = await prisma.site.create({
    data: {
      tenantId: tenant.id,
      projectId: project2.id,
      name: "Block A",
      address: "Kisamis Road, Block A",
      siteManagerId: createdUsers["SITE_MANAGER1"],
    },
  });

  const site3 = await prisma.site.create({
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

  // 7. Create item catalog
  const catalogItems = [
    { name: "Cement (Bamburi)", unit: "bags", category: "building materials", price: 750 },
    { name: "River Sand", unit: "tonnes", category: "building materials", price: 2500 },
    { name: "Ballast", unit: "tonnes", category: "building materials", price: 3000 },
    { name: "Steel Bars (Y12)", unit: "pieces", category: "steel", price: 850 },
    { name: "Steel Bars (Y16)", unit: "pieces", category: "steel", price: 1200 },
    { name: "Timber (2x4)", unit: "pieces", category: "timber", price: 450 },
    { name: "Plywood (18mm)", unit: "sheets", category: "timber", price: 2800 },
    { name: "Roofing Sheets (G30)", unit: "pieces", category: "roofing", price: 1500 },
    { name: "PVC Pipes (4 inch)", unit: "pieces", category: "plumbing", price: 1200 },
    { name: "Electrical Cable (2.5mm)", unit: "rolls", category: "electrical", price: 6500 },
    { name: "Paint (Dulux, 20L)", unit: "tins", category: "finishing", price: 8500 },
    { name: "Nails (4 inch)", unit: "kg", category: "hardware", price: 200 },
  ];

  for (const item of catalogItems) {
    await prisma.itemCatalog.create({
      data: {
        tenantId: tenant.id,
        name: item.name,
        defaultUnit: item.unit,
        category: item.category,
        averagePrice: item.price,
      },
    });
  }
  console.log("Catalog items created:", catalogItems.length);

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
