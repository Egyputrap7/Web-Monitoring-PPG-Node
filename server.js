const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const mysql = require("mysql");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());

app.use(bodyParser.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ppg",
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    return;
  }
  console.log("Connected to database");
});

// app.post("/savedata", (req, res) => {
// const { heartRate, spO2, irValue } = req.body;

// const sql =
// "INSERT INTO data (heartRate, spO2, irValue, timestamp) VALUES (?, ?, ?, NOW())";
// db.query(sql, [heartRate, spO2, irValue], (err, result) => {
// if (err) {
// console.error("Error saving data:", err);
// res.status(500).json({ success: false, message: "Error saving data" });
// } else {
// res.json({ success: true, message: "Data saved successfully" });
// }
// });
// });

// app.post("/savedata", (req, res) => {
//   const { heartRate, spO2, irValue } = req.body;

//   const cycle_id = uuidv4(); // Generate UUID for cycle_id

// const sql ="INSERT INTO data (cycle_id,heartRate, spO2, irValue, timestamp) VALUES (?,?, ?, ?, NOW())";
//   const values = [cycle_id, heartRate, spO2, irValue];

//   db.query(sql, [cycle_id,heartRate, spO2, irValue], (err, result) => {
//     if (err) {
//       console.error('Error saving data:', err);
//       res.status(500).json({ success: false, message: 'Error saving data' });
//     } else {
//       res.json({ success: true, message: 'Data saved successfully' });
//     }
//   });
// });

let database = [];
let dataArray = [];
let currentName = "";
let timeout;
const TIMEOUT_PERIOD = 3000; // 10 seconds

app.post("/saveName", (req, res) => {
  const { nama } = req.body;
  if (nama) {
    currentName = nama;

    database.push({ nama: currentName }); // Menyimpan nama ke database
    console.log("Name saved to database:", { nama: currentName });
    res.json({ success: true, message: "Name saved to database successfully" });
  } else {
    res.status(400).json({ success: false, message: "Name is required" });
  }
});

app.post("/savedata", (req, res) => {
  const { heartRate, spO2, irValue } = req.body;

  if (!currentName) {
    return res.status(400).json({ success: false, message: "Name not set" });
  }

  dataArray.push({ nama: currentName, heartRate, spO2, irValue });

  // Tambahkan data baru ke dalam array
  //dataArray.push({ heartRate, spO2, irValue });

  // Jika dataArray mencapai jumlah tertentu atau kondisi tertentu, langsung simpan ke database
  // if (dataArray.length >= 5) {
  //   saveDataToDatabase(req, res);
  // } else {
  //   res.json({ success: true, message: "Data received successfully" });
  // }

  clearTimeout(timeout);
  timeout = setTimeout(() => {
    saveDataToDatabase();
  }, TIMEOUT_PERIOD);

  res.json({ success: true, message: 'Data received successfully' });
});

function saveDataToDatabase(req, res) {
  if (dataArray.length === 0) {
    return res.status(400).json({ success: false, message: "No data to save" });
  }

  const cycleId = uuidv4(); // Generate UUID for cycle_id

  // Siapkan data untuk dimasukkan ke dalam database
  const sql =
    "INSERT INTO data (cycle_id,nama, heartRate, spO2, irValue, timestamp) VALUES ?";
  const values = dataArray.map(({ nama, heartRate, spO2, irValue }) => [
    cycleId,
    nama,
    heartRate,
    spO2,
    irValue,
    new Date(), // Waktu saat ini
  ]);

  // Kosongkan array setelah data disimpan ke database
  dataArray = [];

  // Jalankan query untuk memasukkan data ke dalam database
  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Error saving data to database:", err);
      res
        .status(500)
        .json({ success: false, message: "Error saving data to database" });
    } else {
      res.json({ success: true, message: "Data saved successfully" });
    }
  });
}

// app.get("/fetchData", (req, res) => {
//   const sql = "SELECT * FROM data";
//   db.query(sql, (err, results) => {
//     if (err) {
//       console.error("Error fetching data:", err);
//       res.status(500).json({ success: false, message: "Error fetching data" });
//     } else {
//       res.json({ success: true, data: results });
//     }
//   });
// });


app.get("/fetchData", (req, res) => {
  const sql =
    "SELECT cycle_id, GROUP_CONCAT(DISTINCT nama) AS nama, GROUP_CONCAT(heartRate) AS heartRate, GROUP_CONCAT(spO2) AS spO2, GROUP_CONCAT(irValue) AS irValue FROM data GROUP BY cycle_id";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      res.status(500).json({ success: false, message: "Error fetching data" });
    } else {
      console.log("Results from succes"); // Tambahkan ini untuk debugging

      const formattedResults = results.map((result) => ({
        cycle_id: result.cycle_id,
        nama: result.nama, // Nama tidak perlu diubah ke array
        heartRate: result.heartRate.split(",").map(Number),
        spO2: result.spO2.split(",").map(Number),
        irValue: result.irValue.split(",").map(Number),
      }));

      res.json({ success: true, data: formattedResults });
    }
  });
});



// app.get("/fetchData", (req, res) => {
//   const sql =
//     "SELECT cycle_id, GROUP_CONCAT(heartRate) AS heartRate, GROUP_CONCAT(spO2) AS spO2, GROUP_CONCAT(irValue) AS irValue FROM data GROUP BY cycle_id";

//   db.query(sql, (err, results) => {
//     if (err) {
//       console.error("Error fetching data:", err);
//       res.status(500).json({ success: false, message: "Error fetching data" });
//     } else {
//       // Mengubah hasil dari GROUP_CONCAT menjadi array sebelum dikirim ke frontend
//       const formattedResults = results.map((result) => ({
//         cycle_id: result.cycle_id,
//         nama: result.nama,
//         heartRate: result.heartRate.split(",").map(Number),
//         spO2: result.spO2.split(",").map(Number),
//         irValue: result.irValue.split(",").map(Number),
//       }));

//       res.json({ success: true, data: formattedResults });
//     }
//   });
// });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
