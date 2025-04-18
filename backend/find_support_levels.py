# Import libraries
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import sys
import os

# Set UTF-8 encoding for output
import sys
sys.stdout.reconfigure(encoding='utf-8')

try:
    # Get CLI arg with fallback default
    args = sys.argv[1:] if len(sys.argv) > 1 else ['1d']  # Default to '1d' if no arg
    interval = args[0]

    # Load data
    input_file = 'stock_data_1h.csv' if interval == '1h' else 'stock_data_1d.csv'
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"{input_file} not found. Run fetch_data.py first.")
    data = pd.read_csv(input_file)

    # Convert Datetime
    data["Datetime"] = pd.to_datetime(data["Datetime"])

    # Check columns
    required = ["Low", "Close", "High", "Open", "Volume", "Datetime"]
    if not all(col in data.columns for col in required):
        raise ValueError(f"Missing columns: {required}. Available: {data.columns.tolist()}")

    # Check non-numeric
    for col in ["Low", "Close", "High", "Open", "Volume"]:
        if not pd.api.types.is_numeric_dtype(data[col]):
            raise ValueError(f"{col} is non-numeric:\n{data[col].head()}")

    # Find bounce points (Low with >=5% rise in 30 days)
    bounce_prices = []
    bounce_datetimes = []
    min_rise = 0.05  # 5% rise
    look_ahead = 30  # 30 days (~1.5 months)
    for i in range(len(data) - look_ahead):
        current_low = data["Low"].iloc[i]
        future_highs = data["High"].iloc[i + 1:i + look_ahead + 1]
        if len(future_highs) > 0 and future_highs.max() >= current_low * (1 + min_rise):
            bounce_prices.append(current_low)
            bounce_datetimes.append(data["Datetime"].iloc[i])

    # Debug: Bounce points, data, example price
    check_price = 2800  # Adjust for your stock
    print(f"Found {len(bounce_prices)} bounce points with >=5% rise")
    print("Sample data:\n", data[["Datetime", "Low", "Close", "High"]].head())
    print("Sample bounces (first 5):")
    for dt, price in list(zip(bounce_datetimes, bounce_prices))[:5]:
        print(f"Datetime: {dt}, Low: {price:.2f}")
    print(f"Bounces near {check_price} INR (+/-10 INR):", 
          len([p for p in bounce_prices if check_price - 10 <= p <= check_price + 10]))

    # Cluster bounces
    if not bounce_prices:
        raise ValueError("No bounces with >=5% rise. Check data or adjust parameters.")
    bounce_prices = np.array(bounce_prices).reshape(-1, 1)
    n_clusters = min(15, len(bounce_prices))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    kmeans.fit(bounce_prices)

    # Get support levels
    levels = kmeans.cluster_centers_.flatten()
    levels = np.sort(levels)

    # Aggregate close levels into ranges (within 2%, force min range)
    range_threshold = 0.02  # 2% max range
    min_range = 0.005  # 0.5% min range
    support_ranges = []
    current_range = [levels[0], levels[0], 0]  # [min, max, bounce_count]
    for level in levels:
        bounce_count = 0
        for i in range(len(data) - look_ahead):
            current_low = data["Low"].iloc[i]
            future_highs = data["High"].iloc[i + 1:i + look_ahead + 1]
            if (abs(current_low - level) / level <= 0.0015 and
                len(future_highs) > 0 and future_highs.max() >= current_low * (1 + min_rise)):
                bounce_count += 1
        if bounce_count >= 2:
            if (level - current_range[0]) / current_range[0] <= range_threshold:
                current_range[1] = max(current_range[1], level)
                current_range[2] += bounce_count
            else:
                if current_range[1] - current_range[0] < current_range[0] * min_range:
                    current_range[1] = current_range[0] * (1 + min_range)
                support_ranges.append(current_range)
                current_range = [level, level, bounce_count]
    if current_range[1] - current_range[0] < current_range[0] * min_range:
        current_range[1] = current_range[0] * (1 + min_range)
    support_ranges.append(current_range)

    # Debug: All ranges
    print("All support ranges:")
    for i, (min_level, max_level, count) in enumerate(support_ranges):
        print(f"Range {i+1}: {min_level:.2f}-{max_level:.2f} INR (Bounced {count} times with >=5% rise)")

    # Print support ranges with 2+ bounces
    print("\nSupport Ranges (1D, >=5% Rise):")
    strong_ranges = []
    for i, (min_level, max_level, count) in enumerate(support_ranges):
        if count >= 2:
            print(f"Support Range {i+1}: {min_level:.2f}-{max_level:.2f} INR (Bounced {count} times with >=5% rise)")
            strong_ranges.append((min_level, max_level, count))

except Exception as e:
    print(f"Error in find_support_levels.py: {str(e)}")
    raise