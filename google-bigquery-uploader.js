const { execa } = require("execa");
const fs = require("fs");
const zlib = require("zlib");
const { BigQuery } = require("@google-cloud/bigquery");
const { pipeline } = require("stream");
const { promisify } = require("util");
const pipelineAsync = promisify(pipeline);

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: "tradingproject25", // Replace with your Google Cloud project ID
  keyFilename: "./service-account.json", // Replace with your service account key file
});

// Configuration
const datasetId = "polygontrades"; // Replace with your dataset ID
const tableId = "stock_trades"; // Replace with your table ID
const rcloneRemote = "s3polygon"; // Replace with your rclone remote name
const rcloneBucket = "flatfiles"; // Replace with your rclone bucket name
const year = "2025"; // Replace with the year
const month = "02"; // Replace with the month
const day = "01"; // Replace with the day
const fileName = `${year}-${month}-${day}.csv.gz`; // File name to download
const remoteFilePath = `us_stocks_sip/trades_v1/${year}/${month}/${fileName}`; // Full remote file path
const localGzFilePath = `./${fileName}`; // Local path for the downloaded .gz file
const localCsvFilePath = `./${year}-${month}-${day}.csv`; // Local path for the extracted .csv file
const newOutputPath = `./${year}-${month}-${day}-new.csv`;
// Define schema for BigQuery
const schema = [
  { name: "ticker", type: "STRING" },
  { name: "conditions", type: "STRING" },
  { name: "correction", type: "INTEGER" },
  { name: "exchange", type: "INTEGER" },
  { name: "id", type: "STRING" },
  { name: "participant_timestamp", type: "INTEGER" },
  { name: "price", type: "FLOAT" },
  { name: "sequence_number", type: "INTEGER" },
  { name: "sip_timestamp", type: "INTEGER" },
  { name: "size", type: "INTEGER" },
  { name: "tape", type: "INTEGER" },
  { name: "trf_id", type: "INTEGER" },
  { name: "trf_timestamp", type: "INTEGER" },
  { name: "partition_date", type: "DATE" }, // Hardcoded partition date
];

async function configureRclone() {
  console.log("Checking rclone configuration...");
  try {
    // List remotes to check if s3polygon exists
    await execa("rclone", ["listremotes"]);
  } catch (error) {
    // If listremotes fails, the remote is not configured
    console.log("Configuring rclone remote...");
    await execa("rclone", [
      "config",
      "create",
      rcloneRemote,
      "s3",
      "env_auth=false",
      "access_key_id=37ae2024-1390-4dce-9296-8a35d5b7970e", // Replace with your access key
      "secret_access_key=JQQnSbCMEG0w9ftVedjyDtVRQxb5eLPy", // Replace with your secret key
      "endpoint=https://files.polygon.io",
    ]);
    console.log("Rclone remote configured successfully.");
  }
}

/**
 * Step 1: Download the .gz file using rclone
 */
async function downloadFile() {
  console.log("Downloading file using rclone...");
  await execa("rclone", []);
  await execa("rclone", [
    "copy",
    `${rcloneRemote}:${rcloneBucket}/${remoteFilePath}`,
    "./",
  ]);
  console.log("File downloaded successfully.");
}

/**
 * Step 2: Extract the .gz file
 */
async function extractFile() {
  console.log("Extracting .gz file...");
  const gzip = zlib.createGunzip();
  const source = fs.createReadStream(localGzFilePath);
  const destination = fs.createWriteStream(localCsvFilePath);
  await pipelineAsync(source, gzip, destination);
  console.log("File extracted successfully.");
}

const stringifyAsync = promisify(stringify);

async function processCSV() {
  const rows = [];

  // Create a readable stream for the input CSV
  const readStream = fs.createReadStream(localCsvFilePath).pipe(csv());

  // Use a Promise to handle the stream asynchronously
  for await (const row of readStream) {
    // Convert nanosecond timestamp to partition date (you can adjust this to your logic)
    row.partition_date = new Date(row.participant_timestamp / 1e9)
      .toISOString()
      .split("T")[0];
    rows.push(row);
  }

  try {
    // Convert rows to CSV format with headers
    const output = await stringifyAsync(rows, { header: true });

    // Write the output to the output CSV file
    await fs.promises.writeFile(newOutputPath, output);
    console.log("CSV file with partition_date column created successfully.");
  } catch (err) {
    console.error("Error processing CSV file:", err);
  }
}

/**
 * Step 3: Load the extracted file into BigQuery
 */
async function loadToBigQuery() {
  console.log("Loading file into BigQuery...");

  // Configure load job options
  const options = {
    sourceFormat: "CSV",
    skipLeadingRows: 1, // Skip header row
    autodetect: false, // Disable autodetect (use provided schema)
    schema: {
      fields: schema,
    },
    timePartitioning: {
      type: "DAY", // Partition by day
      field: "partition_date", // Use the hardcoded column for partitioning
    },
    clustering: {
      fields: ["ticker"], // Cluster by ticker
    },
    writeDisposition: "WRITE_APPEND", // Append data to the table
  };

  // Load data from the local file
  const [job] = await bigquery
    .dataset(datasetId)
    .table(tableId)
    .load(localCsvFilePath, options);

  console.log(`Job ${job.id} completed.`);
  console.log("Data loaded successfully.");
}

/**
 * Step 4: Delete the downloaded and extracted files
 */
function deleteFiles() {
  console.log("Deleting files...");
  fs.unlinkSync(localGzFilePath); // Delete the .gz file
  fs.unlinkSync(localCsvFilePath); // Delete the .csv file
  console.log("Files deleted successfully.");
}

/**
 * Main function
 */
async function main() {
  try {
    await configureRclone();
    // Step 1: Download the .gz file
    await downloadFile();

    // Step 2: Extract the .gz file
    await extractFile();

    await processCSV();

    // Step 3: Load the extracted file into BigQuery
    await loadToBigQuery();

    // Step 4: Delete the files
    deleteFiles();

    console.log("Process completed successfully.");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the script
main();
