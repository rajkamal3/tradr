# Import yfinance
import yfinance as yf
import pandas as pd
import sys

# Get CLI args with fallback defaults
args = sys.argv[1:] if len(sys.argv) > 5 else ['HDFCBANK.NS', '2015-01-01', '2025-04-18', '1d']  # Default if no args
ticker, start, end, interval = args

# Fetch daily or hourly data based on interval
data = yf.download(ticker, start=start, end=end, interval=interval, auto_adjust=False)

# Reset index, rename columns
data = data.reset_index()
data.columns = ['Datetime', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume']

# Debug: Columns, head, range, example price hits
print("Columns:", data.columns.tolist())
print("Head:\n", data.head())
print("Low Range:", data["Low"].min(), "to", data["Low"].max())
print("Date Range:", data["Datetime"].min(), "to", data["Datetime"].max())
check_price = 2800  # Adjust for your stock (example)
print(f"Lows near {check_price} INR (±10 INR):", len(data[(data["Low"] >= check_price - 10) & (data["Low"] <= check_price + 10)]))

# Check non-numeric Low
if not pd.api.types.is_numeric_dtype(data["Low"]):
    print("Warning: Low non-numeric:\n", data["Low"].head())

# Save CSV based on interval
output_file = 'stock_data_1h.csv' if interval == '1h' else 'stock_data_1d.csv'
data.to_csv(output_file, index=False)
print(f"Saved to {output_file}")