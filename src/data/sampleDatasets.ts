import { GenericRecord, SampleDatasetInfo } from '../types';
import { INITIAL_CSV_DATA } from './rawCsv';
import Papa from 'papaparse';

export const SAMPLE_DATASETS: SampleDatasetInfo[] = [
  {
    id: 'payroll_hr',
    name: 'Montgomery County Payroll & HR',
    description: 'Workforce salaries, overtime, longevity bonuses, gender split and pay grades.',
    category: 'Human Resources',
    icon: 'Users',
    rowCount: 200,
  },
  {
    id: 'ecommerce_sales',
    name: 'Global E-Commerce Sales & Orders',
    description: 'Order transactions, product categories, revenue, profit margins, shipping regions and discounts.',
    category: 'Retail & Commerce',
    icon: 'ShoppingBag',
    rowCount: 120,
  },
  {
    id: 'saas_metrics',
    name: 'SaaS Platform & Customer Telemetry',
    description: 'Subscription plans, MRR, retention rate, churn probability, NPS scores and server uptime.',
    category: 'Cloud & Tech',
    icon: 'Activity',
    rowCount: 100,
  },
  {
    id: 'supply_chain',
    name: 'Warehouse Inventory & Logistics',
    description: 'SKU stock levels, reorder points, warehouse facilities, holding costs and supplier ratings.',
    category: 'Operations',
    icon: 'Package',
    rowCount: 90,
  },
];

// Helper to generate E-Commerce dataset
function generateEcommerceData(): GenericRecord[] {
  const categories = ['Electronics', 'Home & Living', 'Apparel', 'Fitness & Outdoor', 'Office Supplies', 'Beauty & Health'];
  const regions = ['North America', 'EMEA', 'Asia Pacific', 'Latin America'];
  const channels = ['Direct Web', 'Marketplace', 'Affiliate', 'Corporate B2B'];
  const statuses = ['Delivered', 'Processing', 'Shipped', 'Returned'];

  const rows: GenericRecord[] = [];
  const baseDate = new Date(2024, 0, 15);

  for (let i = 1; i <= 120; i++) {
    const category = categories[i % categories.length];
    const region = regions[(i * 3) % regions.length];
    const channel = channels[(i * 2) % channels.length];
    const status = statuses[i % statuses.length];

    const quantity = Math.floor((i * 7) % 18) + 1;
    const unitPrice = Number((((i * 37) % 450) + 25).toFixed(2));
    const discount = Number((((i * 5) % 25) / 100).toFixed(2));
    const revenue = Number((quantity * unitPrice * (1 - discount)).toFixed(2));
    const profitMargin = Number((0.15 + ((i * 9) % 35) / 100).toFixed(2));
    const netProfit = Number((revenue * profitMargin).toFixed(2));

    const orderDate = new Date(baseDate.getTime() + i * 86400000 * 2.5);
    const dateStr = orderDate.toISOString().split('T')[0];

    rows.push({
      order_id: `ORD-2024-${1000 + i}`,
      order_date: dateStr,
      customer_segment: i % 3 === 0 ? 'Enterprise B2B' : i % 2 === 0 ? 'Consumer' : 'Small Business',
      product_category: category,
      sales_channel: channel,
      shipping_region: region,
      order_status: status,
      units_sold: quantity,
      unit_price: unitPrice,
      discount_rate: discount,
      gross_revenue: revenue,
      profit_margin: profitMargin,
      net_profit: netProfit,
      customer_rating: (3.5 + ((i * 3) % 15) / 10).toFixed(1),
    });
  }

  return rows;
}

// Helper to generate SaaS dataset
function generateSaasData(): GenericRecord[] {
  const plans = ['Starter Tier', 'Professional', 'Enterprise Pro', 'Custom Scale'];
  const regions = ['US-East', 'US-West', 'EU-Central', 'AP-South'];
  const industries = ['Fintech', 'Healthcare', 'E-Commerce', 'Education', 'Logistics', 'Cybersecurity'];

  const rows: GenericRecord[] = [];
  for (let i = 1; i <= 100; i++) {
    const plan = plans[i % plans.length];
    const region = regions[(i * 2) % regions.length];
    const industry = industries[i % industries.length];

    const seatCount = (i % 4 + 1) * 15 + ((i * 7) % 50);
    const mrr = plan === 'Starter Tier' ? 299 : plan === 'Professional' ? 799 : plan === 'Enterprise Pro' ? 2499 : 5999;
    const arr = mrr * 12;
    const usageHours = Math.floor((i * 123) % 450) + 50;
    const churnRisk = ((i * 13) % 45) / 100;
    const nps = Math.floor((i * 7) % 6) + 5;
    const isAutoRenew = i % 5 !== 0;

    rows.push({
      account_id: `ACC-SAAS-${2000 + i}`,
      organization_name: `${industry} Global ${i}`,
      subscription_plan: plan,
      industry_vertical: industry,
      server_region: region,
      active_seats: seatCount,
      monthly_recurring_revenue: mrr,
      annual_run_rate: arr,
      monthly_compute_hours: usageHours,
      churn_probability: churnRisk,
      nps_score: nps,
      auto_renew_enabled: isAutoRenew,
      sla_uptime_percent: 99.9 - ((i % 10) * 0.05),
    });
  }

  return rows;
}

// Helper to generate Supply Chain dataset
function generateSupplyChainData(): GenericRecord[] {
  const warehouses = ['Central Hub Chicago', 'Rotterdam Port Facility', 'Singapore Logistics Park', 'Dallas Mega Center'];
  const categories = ['Heavy Machinery', 'Electronic Sensors', 'Packaging Materials', 'Thermal Hardware', 'Raw Metals'];
  const suppliers = ['Apex Industrial Corp', 'Nippon Component Ltd', 'EuroMech Systems', 'Pacific Logistics Inc'];

  const rows: GenericRecord[] = [];
  for (let i = 1; i <= 90; i++) {
    const warehouse = warehouses[i % warehouses.length];
    const category = categories[i % categories.length];
    const supplier = suppliers[i % suppliers.length];

    const currentUnits = Math.floor((i * 89) % 1500) + 50;
    const reorderThreshold = Math.floor((i * 45) % 600) + 100;
    const unitCost = Number((((i * 29) % 320) + 15).toFixed(2));
    const totalInventoryValue = Number((currentUnits * unitCost).toFixed(2));
    const leadTimeDays = Math.floor((i * 7) % 28) + 3;
    const supplierRating = Number((3.8 + ((i * 2) % 12) / 10).toFixed(1));

    let status = 'Optimal';
    if (currentUnits < reorderThreshold * 0.5) status = 'Critical Reorder';
    else if (currentUnits < reorderThreshold) status = 'Low Stock';
    else if (currentUnits > reorderThreshold * 2.8) status = 'Overstocked';

    rows.push({
      sku_code: `SKU-${10000 + i}`,
      product_name: `${category} Mod-${i}`,
      category,
      warehouse_facility: warehouse,
      primary_supplier: supplier,
      current_stock_units: currentUnits,
      reorder_point: reorderThreshold,
      unit_cost_usd: unitCost,
      total_holding_value: totalInventoryValue,
      lead_time_days: leadTimeDays,
      supplier_quality_score: supplierRating,
      inventory_status: status,
    });
  }

  return rows;
}

function getPayrollData(): GenericRecord[] {
  const parsed = Papa.parse(INITIAL_CSV_DATA.trim(), { header: true, dynamicTyping: true });
  return parsed.data as GenericRecord[];
}

export interface SampleDataset {
  id: string;
  name: string;
  fileName: string;
  description: string;
  records: GenericRecord[];
}

export const sampleDatasets: SampleDataset[] = [
  {
    id: 'payroll_hr',
    name: 'Montgomery County Payroll & HR',
    fileName: 'Montgomery_Payroll_Sample.csv',
    description: 'Workforce salaries, overtime, longevity bonuses, gender split and pay grades.',
    records: getPayrollData(),
  },
  {
    id: 'ecommerce_sales',
    name: 'Global E-Commerce Sales & Orders',
    fileName: 'Global_Ecommerce_Transactions.xlsx',
    description: 'Order transactions, product categories, revenue, profit margins, shipping regions and discounts.',
    records: generateEcommerceData(),
  },
  {
    id: 'saas_metrics',
    name: 'SaaS Platform & Customer Telemetry',
    fileName: 'SaaS_Customer_Telemetry.json',
    description: 'Subscription plans, MRR, retention rate, churn probability, NPS scores and server uptime.',
    records: generateSaasData(),
  },
  {
    id: 'supply_chain',
    name: 'Warehouse Inventory & Logistics',
    fileName: 'Warehouse_Logistics_Inventory.csv',
    description: 'SKU stock levels, reorder points, warehouse facilities, holding costs and supplier ratings.',
    records: generateSupplyChainData(),
  },
];

export function loadSampleDataset(sampleId: string): { records: GenericRecord[]; datasetName: string } {
  const found = sampleDatasets.find((s) => s.id === sampleId);
  if (found) {
    return { records: found.records, datasetName: found.name };
  }
  return { records: getPayrollData(), datasetName: 'Montgomery County Payroll & HR' };
}
