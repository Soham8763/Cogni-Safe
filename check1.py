import pandas as pd

# Load your data
df = pd.read_csv('EEG_data_set.csv')

# Check status distribution
print("Status distribution:")
print(df['status'].value_counts())
print("\nUnique status values:", df['status'].unique())

# If there are different status values, check patterns
if len(df['status'].unique()) > 1:
    print("\n✅ GOOD! You have multiple classes")
    for status in df['status'].unique():
        print(f"Status {status}: {len(df[df['status'] == status])} samples")
else:
    print("\n⚠️ WARNING: Only one status value - need multiple classes!")