import { PrismaClient } from "@prisma/client";
import { calculateMonthlyLimit } from "../../lib/calculations";

const prisma = new PrismaClient();

const CATEGORY_NAMES = [
  "Supermarket",
  "Fuel",
  "Health",
  "Pharmacy",
  "Delivery",
  "Streaming",
  "Education",
  "Clothing",
  "Services",
  "Travel",
  "Taxes",
  "Entertainment",
  "Home",
  "Other",
];

async function main() {
  await prisma.alertEvent.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.alertThreshold.deleteMany();
  await prisma.monthlyBudgetConfig.deleteMany();
  await prisma.statementImport.deleteMany();
  await prisma.reconciliationResult.deleteMany();
  await prisma.creditCard.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { name: "Demo User" },
  });

  const categories = await Promise.all(
    CATEGORY_NAMES.map((name) =>
      prisma.category.create({ data: { name, active: true } }),
    ),
  );
  const byName = (n: string) => categories.find((c) => c.name === n)!;

  const cards = await Promise.all([
    prisma.creditCard.create({
      data: {
        userId: user.id,
        bank: "Chase",
        name: "Sapphire Preferred",
        brand: "Visa",
        last4: "4242",
        closingDay: 12,
        dueDay: 3,
        active: true,
      },
    }),
    prisma.creditCard.create({
      data: {
        userId: user.id,
        bank: "Amex",
        name: "Gold Card",
        brand: "Amex",
        last4: "1001",
        closingDay: 8,
        dueDay: 18,
        active: true,
      },
    }),
    prisma.creditCard.create({
      data: {
        userId: user.id,
        bank: "Capital One",
        name: "Quicksilver",
        brand: "Mastercard",
        last4: "8899",
        closingDay: 20,
        dueDay: 15,
        active: true,
      },
    }),
  ]);

  const months: { month: number; year: number }[] = [
    { month: 2, year: 2026 },
    { month: 3, year: 2026 },
    { month: 4, year: 2026 },
  ];

  const thresholdSeed = [60, 70, 80, 90, 100].map((percentage) => ({
    percentage,
    enabled: true,
  }));

  for (const { month, year } of months) {
    const income = 8000;
    const allowedPercentage = 30;
    const manual = month === 2 ? 2200 : null;
    const computedCardLimit = calculateMonthlyLimit({
      monthlyIncome: income,
      allowedPercentage,
      manualCardLimit: manual,
    });

    const config = await prisma.monthlyBudgetConfig.create({
      data: {
        userId: user.id,
        month,
        year,
        monthlyIncome: income,
        allowedPercentage,
        manualCardLimit: manual,
        computedCardLimit,
        alertThresholds: { create: thresholdSeed },
      },
    });

    const spendBase = month === 1 ? 0.85 : month === 2 ? 1.05 : 0.72;
    const totalTarget = computedCardLimit * spendBase;

    const splits = [
      { cat: "Supermarket", ratio: 0.28 },
      { cat: "Fuel", ratio: 0.08 },
      { cat: "Entertainment", ratio: 0.12 },
      { cat: "Home", ratio: 0.1 },
      { cat: "Delivery", ratio: 0.09 },
      { cat: "Health", ratio: 0.07 },
      { cat: "Travel", ratio: 0.14 },
      { cat: "Other", ratio: 0.12 },
    ];

    let allocated = 0;
    for (let i = 0; i < splits.length; i++) {
      const s = splits[i]!;
      const isLast = i === splits.length - 1;
      const amount = isLast ? Math.max(0, totalTarget - allocated) : totalTarget * s.ratio;
      allocated += amount;
      await prisma.expense.create({
        data: {
          transactionDate: new Date(year, month - 1, 5 + i * 2),
          postedMonth: month,
          postedYear: year,
          amount: Math.round(amount * 100) / 100,
          description: `${s.cat} spend`,
          merchant: s.cat,
          installments: 1,
          sourceType: "manual",
          reconciliationStatus: "pending",
          cardId: cards[i % cards.length]!.id,
          categoryId: byName(s.cat).id,
        },
      });
    }

    const pct = (totalTarget / computedCardLimit) * 100;
    const crossed = [60, 70, 80, 90, 100].filter((p) => pct >= p);
    for (const p of crossed.slice(-2)) {
      await prisma.alertEvent.create({
        data: {
          userId: user.id,
          month,
          year,
          alertKind: "threshold",
          thresholdPercentage: p,
          message: `${p}% of monthly budget reached`,
        },
      });
    }

    await prisma.reconciliationResult.create({
      data: {
        userId: user.id,
        month,
        year,
        matchedCount: 12,
        unmatchedManualCount: 1,
        unmatchedImportedCount: 0,
      },
    });
  }

  await prisma.statementImport.create({
    data: {
      userId: user.id,
      cardId: cards[0]!.id,
      bank: "Chase",
      fileName: "statement_2026-03.pdf",
      importMonth: 3,
      importYear: 2026,
      status: "completed",
      paymentDueDate: new Date(2026, 3, 3), // abril: vencimiento ejemplo
      rowCount: 0,
    },
  });

  console.log("Seed OK — user id:", user.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
