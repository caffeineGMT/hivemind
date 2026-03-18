# Cost Tracking Dashboard - Implementation Summary

## Overview

Built a comprehensive cost tracking dashboard for monitoring API usage, token consumption, and cost breakdown per agent/task. This is for owner visibility, NOT for billing/monetization purposes.

## Features Implemented

### 1. **Core Cost Metrics**
- **Total Spend**: Lifetime API costs across all agents
- **Monthly Spend**: Current month costs with budget percentage
- **Daily Burn Rate**: Average daily spend with last 24-hour tracking
- **Projected Monthly**: Forecasted end-of-month costs based on current usage
- **Total Tokens**: Aggregate token usage across input/output/cache

### 2. **Efficiency Analytics**
- **Average Cost per Task**: Cost efficiency metric per completed task
- **Cost per 1K Tokens**: Standardized cost measurement for token usage
- **Average Tokens per Session**: Session efficiency tracking
- **Average Duration per Session**: Performance metric in seconds

### 3. **Time-Based Analysis**
- **Multi-Period Views**: 7-day, 30-day, 90-day, and all-time filters
- **Period-over-Period Comparison**: Shows trending (up/down) vs previous period
- **Cost Trend Chart**: Daily cost visualization with 7-day forecast
- **Hourly Usage Pattern**: 24-hour breakdown showing peak usage times

### 4. **Agent & Task Breakdown**
- **Cost by Agent**: Bar chart and pie chart showing per-agent spending
- **Top Tasks by Cost**: Horizontal bar chart of most expensive tasks
- **Cost Summary Table**: Sessions, tokens, and costs per agent
- **Task-Level Tracking**: Detailed cost attribution per task ID

### 5. **Model Analytics**
- **Model Usage Breakdown**: Shows which Claude models are being used
- **Model Cost Distribution**: Cost percentage per model
- **Model Efficiency**: Tokens and sessions per model

### 6. **Token Usage Visualization**
- **Stacked Area Chart**: Input tokens, output tokens, cache reads by agent
- **Token Type Breakdown**: Separates input/output/cache consumption
- **Total Token Metrics**: Aggregate counts across all operations

### 7. **Budget Management**
- **Budget Configuration**: Set monthly budget and alert thresholds
- **Budget Alerts**: Warning (80%+) and critical (100%+) notifications
- **Budget Progress**: Real-time percentage tracking
- **Projected vs Budget**: Comparison of forecast against limits

### 8. **Data Export**
- **Enhanced CSV Export**: Includes summary, efficiency metrics, and detailed logs
- **Comprehensive Headers**: All token types, costs, duration, model info
- **Timestamped Files**: Automatic naming with company ID and date

### 9. **Recent Activity Log**
- **Last 20 API Calls**: Detailed table with all metrics
- **Per-Call Breakdown**: Input/output/cache tokens, cost, agent, task
- **Timestamp Tracking**: Full datetime for each API call
- **Model Information**: Shows which model was used for each call

## Technical Implementation

### Database Schema (`cost_log` table)
```sql
CREATE TABLE cost_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  task_id TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  num_turns INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### API Endpoints

#### GET `/api/companies/:id/costs`
Returns comprehensive cost data:
- `summary`: Cost summary by agent
- `totals`: Aggregate totals across all time
- `recent`: Last 50 cost entries
- `taskCosts`: Top 20 tasks by cost
- `budget`: Budget configuration if set
- `monthlySpend`: Current month total

#### POST `/api/companies/:id/budget`
Set monthly budget and alert threshold:
```json
{
  "monthlyBudget": 100.00,
  "alertThreshold": 0.8
}
```

#### GET `/api/companies/:id/costs/range`
Query costs by date range:
```
?startDate=2026-01-01&endDate=2026-03-18
```

### Database Functions
- `logCost()`: Log cost entry after agent API calls
- `getCostSummary()`: Aggregate costs by agent
- `getCostTotals()`: Overall totals
- `getCostsByCompany()`: Recent entries for a company
- `getCostsByTask()`: Costs grouped by task
- `getCostsByDateRange()`: Time-based queries
- `getCurrentMonthCosts()`: Month-to-date spending
- `setBudget()`: Configure budget limits
- `getBudget()`: Retrieve budget config

### Cost Logging Integration
Costs are automatically logged after every agent API call in `orchestrator.js`:
- CEO planning sessions
- CTO task refinement
- Designer spec generation
- CMO marketing strategy
- Engineer task execution
- Nudge responses

Each log entry includes:
- Input tokens, output tokens, cache tokens
- Total cost in USD (based on Claude pricing)
- Session duration in milliseconds
- Number of conversation turns
- Model identifier (claude-3-5-sonnet, etc.)

## UI Components

### File: `ui/src/pages/Costs.tsx`
- React component with TanStack Query for data fetching
- Recharts for all visualizations
- Responsive design with Tailwind CSS
- Real-time updates via WebSocket

### Charts Used
- **Line Chart**: Cost trend with forecast
- **Bar Chart**: Cost by agent, hourly patterns
- **Pie Chart**: Cost distribution
- **Area Chart**: Token usage breakdown (stacked)

### State Management
- Time period selector (7d/30d/90d/all)
- Budget modal for configuration
- Period comparison toggle
- CSV export handler

## Key Features

### 1. Budget Alerts
Automatically warns when:
- Spending reaches 80% of monthly budget (warning)
- Spending exceeds 100% of monthly budget (critical)

### 2. Forecasting
Uses simple linear regression on historical data to project:
- End-of-month spending
- Next 7 days cost trend

### 3. Efficiency Metrics
Calculates:
- Cost per completed task
- Cost per 1,000 tokens
- Average tokens per API session
- Average session duration

### 4. Period Comparison
Shows trend vs previous period:
- Last 7 days vs previous 7 days
- Last 30 days vs previous 30 days
- Last 90 days vs previous 90 days
- Green (spending down) or red (spending up) indicators

## Usage

### View Cost Dashboard
1. Navigate to the Costs page in the UI
2. Select company from the dropdown
3. Choose time period (7d, 30d, 90d, all)
4. View metrics, charts, and recent activity

### Set Budget
1. Click "Budget" button in top right
2. Enter monthly budget (USD)
3. Set alert threshold percentage (default 80%)
4. Click "Set Budget"

### Export Data
1. Click "Export CSV" button
2. Downloads comprehensive report including:
   - Summary metrics
   - Efficiency calculations
   - All detailed logs with timestamps

## Data Flow

1. **Agent makes API call** → Claude API
2. **Usage data returned** → Input/output/cache tokens, cost
3. **Cost logged** → `db.logCost()` inserts into `cost_log` table
4. **WebSocket broadcast** → `cost_updated` event sent to UI
5. **UI updates** → React Query invalidates and refetches cost data
6. **Charts refresh** → All visualizations update automatically

## Performance

- Database queries use indexes on `company_id` and `created_at`
- Recent logs limited to 50 entries for fast loading
- Task costs limited to top 20 by spending
- Efficient aggregation using SQL GROUP BY
- Memoized calculations in React components

## Owner Visibility Features

All features designed for internal monitoring, NOT customer billing:
- No payment processing integration
- No invoicing or receipts
- No customer-facing cost data
- Focus on operational efficiency
- Budget tracking for cost control
- Usage patterns for optimization

## Future Enhancements (Not Implemented)

Potential additions:
- Cost alerts via email/Slack
- Weekly/monthly cost reports
- Cost optimization suggestions
- Agent performance benchmarking
- Custom date range selector
- Cost breakdown by project
- Multi-currency support
- Cost allocation tags

## Testing

Recommended tests:
1. Generate sample cost data via agent runs
2. Verify budget alerts trigger correctly
3. Test CSV export with various date ranges
4. Validate period comparison calculations
5. Check chart rendering with edge cases (no data, single data point)

## Deployment

No special deployment steps required:
- Database migration runs automatically on startup
- UI builds with `npm run build` in `/ui` directory
- Server serves static UI files from `/ui/dist`
- Access dashboard at `http://localhost:3100`

## Monitoring

The dashboard itself is the monitoring tool. Key metrics to watch:
- Daily burn rate trending up unexpectedly
- Certain agents consuming disproportionate tokens
- Tasks with unusually high costs
- Budget approaching limits
- Model usage distribution changes

## Conclusion

The cost tracking dashboard provides comprehensive visibility into AI agent API costs. It enables:
- Real-time cost monitoring
- Budget management and alerts
- Efficiency optimization
- Trend analysis and forecasting
- Detailed logging and export

All features are designed for owner/operator visibility and cost control, not for customer billing or monetization.
