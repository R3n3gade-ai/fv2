import boto3
from botocore.config import Config
import gzip
import os
import shutil
from google.cloud import bigquery
from google.oauth2 import service_account
import pandas as pd
from datetime import date, timedelta

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

# Google BigQuery configuration
credentials = service_account.Credentials.from_service_account_file(
    './service-account.json'  # Replace with your service account key file
)
client = bigquery.Client(credentials=credentials, project='tradingproject25')  # Replace with your project ID

# Configuration
bucket_name = 'flatfiles'

# Define schema for BigQuery
schema = [
    bigquery.SchemaField('ticker', 'STRING'),
    bigquery.SchemaField('conditions', 'STRING'),
    bigquery.SchemaField('correction', 'INTEGER'),
    bigquery.SchemaField('exchange', 'INTEGER'),
    bigquery.SchemaField('id', 'STRING'),
    bigquery.SchemaField('participant_timestamp', 'INTEGER'),
    bigquery.SchemaField('price', 'FLOAT'),
    bigquery.SchemaField('sequence_number', 'INTEGER'),
    bigquery.SchemaField('sip_timestamp', 'INTEGER'),
    bigquery.SchemaField('size', 'INTEGER'),
    bigquery.SchemaField('tape', 'INTEGER'),
    bigquery.SchemaField('trf_id', 'INTEGER'),
    bigquery.SchemaField('trf_timestamp', 'INTEGER'),
    bigquery.SchemaField('partition_date', 'DATE'),  # Hardcoded partition date
]

def download_file(object_key, local_gz_path):
    """Download the .gz file from S3."""
    print('Downloading file from S3...')
    s3.download_file(bucket_name, object_key, local_gz_path)
    print('File downloaded successfully.')

def extract_file(local_gz_path, local_csv_path):
    """Extract the .gz file."""
    print('Extracting .gz file...')
    with gzip.open(local_gz_path, 'rb') as gz_file:
        with open(local_csv_path, 'wb') as csv_file:
            shutil.copyfileobj(gz_file, csv_file)
    print('File extracted successfully.')

def load_to_bigquery(new_csv_path):
    """Load the extracted file into BigQuery."""
    print('Loading file into BigQuery...')

    # Configure load job
    table_id = 'polygontrades.stock_trades'  # Replace with your dataset and table ID
    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.CSV,
        skip_leading_rows=1,
        autodetect=False,
        schema=schema,
        time_partitioning=bigquery.TimePartitioning(
            type_=bigquery.TimePartitioningType.DAY,
            field='partition_date',  # Partition by this column
        ),
        clustering_fields=['ticker'],  # Cluster by ticker
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
    )

    # Load data from the local file
    with open(new_csv_path, 'rb') as csv_file:
        job = client.load_table_from_file(csv_file, table_id, job_config=job_config)
        job.result()  # Wait for the job to complete

    print('Data loaded successfully.')

def delete_files(local_gz_path, local_csv_path, new_csv_path):
    """Delete the downloaded and extracted files."""
    print('Deleting files...')
    os.remove(local_gz_path)
    os.remove(local_csv_path)
    os.remove(new_csv_path)
    print('Files deleted successfully.')

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
        chunk_size = 6000000  # Process 1 million rows at a time
        chunks = pd.read_csv(input_file_path, chunksize=chunk_size, dtype=dtypes)

        # Step 2: Process each chunk and write to the output file
        for i, chunk in enumerate(chunks):
            chunk['partition_date'] = partition_date  # Add partition_date column

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


def main():
    start_date = date(2025, 2, 1)  # Start date of the loop
    end_date = date(2025, 2, 3)    # End date of the loop

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
            load_to_bigquery(new_csv_path)
            delete_files(local_gz_path, local_csv_path, new_csv_path)
            print(f'Completed successfully for: {year}-{month}-{day}')

        except Exception as e:
            print(f'Error processing {year}-{month}-{day}: {e}')

        current_date += timedelta(days=1)  # Increment to the next day

# Run the script
if __name__ == '__main__':
    main()
