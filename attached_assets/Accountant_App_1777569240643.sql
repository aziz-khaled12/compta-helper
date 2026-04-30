-- Companies Table (Entity Setup)
CREATE TABLE "companies" (
    "id" UUID PRIMARY KEY,
    "name" VARCHAR(255),
    "nif" VARCHAR(50), -- Numéro d'Identification Fiscale
    "ai" VARCHAR(50),  -- Article d'Imposition
    "capital_initial" DECIMAL(15, 2),
    "created_at" TIMESTAMP
);

-- Fixed Assets (Equipments)
CREATE TABLE "fixed_assets" (
    "id" UUID PRIMARY KEY,
    "company_id" UUID REFERENCES "companies"("id"),
    "label" VARCHAR(255),
    "cost_ht" DECIMAL(15, 2),
    "purchase_date" DATE,
    "life_years" INTEGER, -- e.g., 5 years for industrial equipment
    "residual_value" DECIMAL(15, 2) DEFAULT 0
);

-- Amortization Logs (Monthly automated entries)
CREATE TABLE "amortization_logs" (
    "id" UUID PRIMARY KEY,
    "asset_id" UUID REFERENCES "fixed_assets"("id"),
    "date" DATE,
    "amount" DECIMAL(15, 2) -- e.g., 45,000 DA/month
);

-- Transactions (The Journal)
CREATE TABLE "transactions" (
    "id" UUID PRIMARY KEY,
    "company_id" UUID REFERENCES "companies"("id"),
    "date" DATE,
    "type" VARCHAR(20), -- 'SALE', 'PURCHASE', 'EXPENSE'
    "label" VARCHAR(255),
    "amount_ht" DECIMAL(15, 2),
    "tva_rate" DECIMAL(5, 2) DEFAULT 0.19,
    "amount_ttc" DECIMAL(15, 2),
    "payment_method" VARCHAR(20), -- 'CASH', 'BANK', 'CREDIT'
    "status" VARCHAR(20) -- 'PAID', 'UNPAID', 'PARTIAL'
);

-- Inventory (Stocks)
CREATE TABLE "inventory_items" (
    "id" UUID PRIMARY KEY,
    "company_id" UUID REFERENCES "companies"("id"),
    "name" VARCHAR(255),
    "category" VARCHAR(50) -- 'RAW_MATERIAL', 'FINISHED_GOOD', 'SUPPLY'
);

-- Inventory Logs (Movements)
CREATE TABLE "inventory_logs" (
    "id" UUID PRIMARY KEY,
    "item_id" UUID REFERENCES "inventory_items"("id"),
    "transaction_id" UUID REFERENCES "transactions"("id"), -- Link to Purchase/Sale
    "quantity" DECIMAL(15, 2),
    "direction" VARCHAR(10), -- 'IN' (Purchase), 'OUT' (Consumption/Sale)
    "unit_cost_ht" DECIMAL(15, 2)
);

-- Human Resources
CREATE TABLE "employees" (
    "id" UUID PRIMARY KEY,
    "company_id" UUID REFERENCES "companies"("id"),
    "full_name" VARCHAR(255),
    "family_situation" VARCHAR(50), -- e.g., 'MARRIED_2_CHILDREN'
    "base_salary" DECIMAL(15, 2)
);

-- Payroll (Bulletin de Paie)
CREATE TABLE "payrolls" (
    "id" UUID PRIMARY KEY,
    "employee_id" UUID REFERENCES "employees"("id"),
    "month_year" DATE,
    "gross_salary" DECIMAL(15, 2),
    "cnas_deduction" DECIMAL(15, 2), -- 9% Social Security
    "irg_deduction" DECIMAL(15, 2),  -- IRG scale
    "net_to_pay" DECIMAL(15, 2)
);