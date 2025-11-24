import pandas as pd
import numpy as np

def analyze_eeg_data(filepath):
    print(f"Loading data from {filepath}...")
    try:
        df = pd.read_csv(filepath)
    except FileNotFoundError:
        print("Error: File not found.")
        return

    print(f"Data loaded. Shape: {df.shape}")

    # Check for missing values
    if df.isnull().sum().sum() > 0:
        print("\nWarning: Missing values detected.")
        print(df.isnull().sum())
    else:
        print("\nNo missing values found.")

    # Group by status (0 vs 1)
    # Assuming 0 = Control/Healthy, 1 = Dementia/Alzheimer's (or vice versa, usually 1 is the positive class)
    if 'status' not in df.columns:
        print("Error: 'status' column not found.")
        return

    print("\n--- Class Distribution ---")
    print(df['status'].value_counts(normalize=True))

    print("\n--- Statistical Comparison (Mean & Std Dev) ---")
    # Calculate mean and std for each channel grouped by status
    grouped = df.groupby('status').agg(['mean', 'std'])

    # Transpose for better readability
    stats = grouped.T
    print(stats)

    # Calculate simple effect size (Cohen's d approx) for each channel
    # (Mean1 - Mean0) / pooled_std (simplified here to just difference for quick look)
    print("\n--- Difference in Means (Status 1 - Status 0) ---")
    means = df.groupby('status').mean()
    diff = means.loc[1] - means.loc[0]
    print(diff.sort_values(ascending=False))

    print("\n--- Interpretation Hints ---")
    print("1. Look for channels with large differences in mean amplitude.")
    print("2. Higher standard deviation might indicate more erratic brain activity.")
    print("3. If 'status' 1 represents Dementia, check if specific regions (e.g., Temporal T3/T4, Parietal P3/P4) show significant deviations.")

if __name__ == "__main__":
    analyze_eeg_data('EEG_data_set.csv')
