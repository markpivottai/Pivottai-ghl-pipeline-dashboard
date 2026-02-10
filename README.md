
# Pipeline Performance Dashboard

A modern, professional React dashboard that visualizes sales and marketing KPIs directly from Google Sheets.

## Data Source
The application connects to a Google Sheet via the Google Visualization API.
- **Base Sheet**: `1zL0ZkcCC4K-PoVwlz_mkNWCR22XfPdM1_7k-rkg32Es`
- **Specific Tab (GID)**: `2004389061`
- **Endpoint**: `https://docs.google.com/spreadsheets/d/1zL0ZkcCC4K-PoVwlz_mkNWCR22XfPdM1_7k-rkg32Es/gviz/tq?tqx=out:json&gid=2004389061`

## Key Features
- **Real-time Sync**: Automatically refreshes data every 5 minutes.
- **KPI Metrics**: Total Opportunities, Qualified Conversations, Conversions, Revenue, and Client Load.
- **Visual Analytics**:
  - Monthly Revenue Trend (Line Chart)
  - Weekly Activity Tracking (Bar Chart)
  - Source Performance Analysis (Horizontal Bar Chart)
- **Responsive Design**: Optimized for mobile and desktop viewing.

## Setup
1. **Share your sheet**: Ensure the Google Sheet is shared as "Anyone with the link can view".
2. **Install**: `npm install`
3. **Start**: `npm run start`

## Deployment
Recommended for **Render** (Static Site):
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

## Integration
Ideal for embedding into GoHighLevel or CRM dashboards via iframe.
