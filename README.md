# Universal Data Profiler, SQLite & Live Dashboard Studio

A high-performance in-browser data engineering and visual analytics application built with React, TypeScript, Tailwind CSS, Recharts, and WebAssembly SQLite (`sql.js`).

---

## 🌟 Key Features

### 1. Universal Schema Profiler & Type Inferrer
- **Automatic Type Detection**: Classifies columns into Numeric, Categorical, Date/Time, Geographic, Financial, and Key Identifiers.
- **Statistical Summaries**: Computes row count, non-null percentages, unique cardinalities, min/max ranges, averages, and distribution samples.
- **Primary Dimension & Metric Selection**: Configurable primary keys, dimensions, and metrics for tailored dashboard visualizations.

### 2. Embedded In-Memory SQLite Engine
- **WebAssembly SQLite (`sql.js`)**: Real in-memory SQL database initialized automatically with your loaded dataset.
- **Auto-Indexed Tables & Safe Identifiers**: Builds optimized indices on primary dimensions and metric columns.
- **Interactive SQL Workbench**: Execute custom SQL queries (`SELECT`, `GROUP BY`, `ORDER BY`, `WINDOW` functions) with query history, execution timing, and formatted table outputs.
- **Suggested Analytical Queries**: Pre-configured queries for top performers, category aggregation, running totals, and statistical percentiles.
- **SQL Data Dump Export**: Download `.sql` schema definitions with batch insert transactions.

### 3. Shareable Live Executive Dashboard
- **Share Link Generation**: Generate customized direct URLs with URL parameters (`?shared=true&sample=...&theme=...&preset=...`).
- **Targeted Recipient Mode**: Renders a dedicated presentation view focusing on live KPIs, dynamic charts, and interactive filtering with a 1-click transition to the full studio.
- **Dynamic Charting**: Responsive bar charts, area trends, donut distributions, scatter plots, and dual-axis comparison charts powered by Recharts.
- **Universal Multi-Filter Bar**: Real-time text search, categorical multi-select chips, numeric range sliders, and quick presets.

### 4. Multi-Theme Visual Palette Showcase
- Switch between 6 visual themes:
  - **Berry Noir**: Deep dark slate with vivid rose & violet gradients.
  - **Obsidian Gold**: Ultra-luxury dark canvas with warm amber & gold accents.
  - **Cyber Neon**: High-contrast cybernetic palette with electric cyan & emerald highlights.
  - **Sage Emerald**: Organic dark sage with mint & emerald accents.
  - **Slate Modern**: Balanced corporate slate with indigo & sapphire hues.
  - **Arctic Minimal**: Clean high-contrast minimalist light theme with cobalt highlights.

### 5. Multi-Format File Importer & Real-Time Sync
- **Import Formats**: CSV, TSV, JSON, XLSX, and XLS.
- **Multi-Sheet Excel Workbook Inspector**: View and extract specific sheets from complex workbooks.
- **Live Pulse Stream**: Automated real-time dataset updates and simulated transaction streaming with configurable polling intervals.
- **Audit Logging**: Live activity drawer recording all insertions, updates, schema changes, and query runs.

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
The application will start on `http://localhost:3000`.

### Production Build
```bash
npm run build
```

---

## 🛠️ Tech Stack
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite WebAssembly (`sql.js`)
- **Visualizations**: Recharts
- **Icons**: Lucide React
- **Spreadsheet Processing**: SheetJS (`xlsx`) + PapaParse
