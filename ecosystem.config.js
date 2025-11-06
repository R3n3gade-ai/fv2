module.exports = {
  apps: [
    {
      name: "market-pulse-server",
      script: "server.js", // your Node backend
      exec_mode: "cluster", // or "cluster" for multi-core
      watch: false,
      max_memory_restart: "8G",
      env: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--max_old_space_size=16384"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/server-error.log",
      out_file: "logs/server-out.log"
    },
    {
  name: "firebase-emulators",
  script: "cmd.exe",
  args: "/c firebase emulators:start --import ./emulator-data --export-on-exit ./emulator-data",
  "exec_mode": "fork",
  "kill_timeout": 120000,  // <-- ADD THIS LINE (8 seconds is usually enough)
  "watch": false,
  "log_date_format": "YYYY-MM-DD HH:mm:ss",
  error_file: "logs/firebase-error.log",
  "out_file": "logs/firebase-out.log"
}
  ]
};
