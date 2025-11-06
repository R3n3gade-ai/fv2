import boto3
from botocore.config import Config
import gzip
import os
import shutil
import pandas as pd
from datetime import datetime, date, timedelta
import psycopg2
import pytz
from io import StringIO, TextIOWrapper

# Database connection parameters
DB_HOST = "localhost"
DB_NAME = "flowtrade"
DB_USER = "postgres"
DB_PASSWORD = "flowtrade"
eastern = pytz.timezone('US/Eastern')

# Initialize S3 client
session = boto3.Session(
   aws_access_key_id='37ae2024-1390-4dce-9296-8a35d5b7970e',
   aws_secret_access_key='JQQnSbCMEG0w9ftVedjyDtVRQxb5eLPy',
)

s3 = session.client(
    's3',
    endpoint_url='https://files.polygon.io',
    config=Config(signature_version='s3v4'),
)
# Configuration
bucket_name = 'flatfiles'

def download_file(object_key, local_gz_path):
    """Download the .gz file from S3."""
    print('Downloading file from S3...')
    s3.download_file(bucket_name, object_key, local_gz_path)
    print('File downloaded successfully.')

# Function to load data using COPY
def load_data_with_copy_stream(new_csv_path):
    """
    Loads data from a DataFrame into TimescaleDB using the COPY command and StringIO.

    Args:
        df (pd.DataFrame): The DataFrame containing the data to load.
    """
    print('load_data_with_copy_stream...')
    try:
        # Connect to the database
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        
        with open(new_csv_path, 'r') as csv_file:
            cursor.copy_expert(
                """
                COPY trades (time, ticker, conditions, correction, exchange, id, participant_timestamp, price, sequence_number, sip_timestamp, size, tape, trf_id, trf_timestamp)
                FROM STDIN WITH CSV HEADER DELIMITER ','
                """,
                csv_file
            )

        # Commit the transaction
        conn.commit()
        print("Data loaded successfully using COPY.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Close the connection
        if conn:
            cursor.close()
            conn.close()

def delete_files(local_gz_path, local_csv_path, new_csv_path):
    """Delete the downloaded and extracted files."""
    print('Deleting files...')
    os.remove(local_gz_path)
    os.remove(local_csv_path)
    os.remove(new_csv_path)
    print('Files deleted successfully.')

# Function to check if a timestamp is within NYSE trading hours
def is_nyse_trading_hours(timestamp):
    """
    Checks if a timestamp falls within NYSE trading hours, accounting for daylight saving time.

    Args:
        timestamp (datetime): A datetime object in UTC.

    Returns:
        bool: True if the timestamp is within NYSE trading hours, False otherwise.
    """
    # Define the Eastern Time zone (automatically handles DST)
    eastern = pytz.timezone('US/Eastern')

    # Convert the timestamp to Eastern Time
    timestamp_et = timestamp.astimezone(eastern)

    # Define NYSE trading hours as timezone-aware datetime objects
    market_open = timestamp_et.replace(hour=9, minute=30, second=0, microsecond=0)  # 9:30 AM ET
    market_close = timestamp_et.replace(hour=16, minute=0, second=0, microsecond=0)  # 4:00 PM ET

    # Check if the timestamp is within trading hours
    return market_open <= timestamp_et < market_close

def process_csv(input_file_path, output_file_path, partition_date):
    """
    Processes a CSV file by adding a `partition_date` column and writes the modified data to a new CSV file.

    Args:
        input_file_path (str): Path to the input CSV file.
        output_file_path (str): Path to the output CSV file.
        partition_date (str): The partition date to add (e.g., '2025-01-31').
    """
    rows = []

    try:
        # Step 1: Read the CSV file in chunks
        dtypes = {
            'ticker': 'str',
            'conditions': 'str',
            'correction': 'int64',
            'exchange': 'int64',
            'id': 'str',
            'participant_timestamp': 'int64',
            'price': 'float64',
            'sequence_number': 'int64',
            'sip_timestamp': 'int64',
            'size': 'int64',
            'tape': 'int64',
            'trf_id': 'int64',
            'trf_timestamp': 'int64',
        }

        # Step 1: Read the CSV file in chunks
        chunk_size = 10000000  # Process 1 million rows at a time
        chunks = pd.read_csv(input_file_path, chunksize=chunk_size, dtype=dtypes)

        # Step 2: Process each chunk and write to the output file
        for i, chunk in enumerate(chunks):
            chunk['time'] = partition_date

            # Write the chunk to the output file
            if i == 0:
                # Write header for the first chunk
                chunk.to_csv(output_file_path, index=False, mode='w')
            else:
                # Append subsequent chunks without header
                chunk.to_csv(output_file_path, index=False, mode='a', header=False)

            print(f'Processed chunk {i + 1}')

        print(f'CSV file with partition_date column created successfully: {output_file_path}')
    except Exception as e:
        print(f'Error processing CSV: {e}')
        
def extract_file(local_gz_path, local_csv_path):
    """Extract the .gz file."""
    print('Extracting .gz file...')
    with gzip.open(local_gz_path, 'rb') as gz_file:
        with open(local_csv_path, 'wb') as csv_file:
            shutil.copyfileobj(gz_file, csv_file)
    print('File extracted successfully.')

def main():
    start_date = date(2025, 2, 14)  # Start date of the loop
    end_date = date(2025, 2, 14)    # End date of the loop

    current_date = start_date
    while current_date <= end_date:
        year = current_date.year
        month = f"{current_date.month:02}"
        day = f"{current_date.day:02}"
        file_name = f'{year}-{month}-{day}.csv.gz'
        object_key = f'us_stocks_sip/trades_v1/{year}/{month}/{file_name}'
        local_gz_path = f'./{file_name}'
        local_csv_path = f'./{year}-{month}-{day}.csv'
        new_csv_path = f'./{year}-{month}-{day}-new.csv'

        print(f"Processing data for: {year}-{month}-{day}")

        try:
            download_file(object_key, local_gz_path)
            extract_file(local_gz_path, local_csv_path)
            process_csv(local_csv_path,new_csv_path,f'{year}-{month}-{day}')
            load_data_with_copy_stream(new_csv_path)
            delete_files(local_gz_path, local_csv_path, new_csv_path)
            print(f'Completed successfully for: {year}-{month}-{day}')

        except Exception as e:
            print(f'Error processing {year}-{month}-{day}: {e}')

        current_date += timedelta(days=1)  # Increment to the next day

# Run the script
if __name__ == '__main__':
    main()
