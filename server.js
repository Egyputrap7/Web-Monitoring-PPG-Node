const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const mysql = require("mysql");
const cors = require("cors");

const { response } = require("express");

const app = express();
const port = 3000;

app.use(cors());

app.use(bodyParser.json());

app.use(express.json()); // Middleware untuk parsing JSON


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


let currentUUID = "";  // Inisialisasi UUID kosong
let timestamp = "";


let database = [];
let dataArray = [];
let currentName = "";

let timeout;
const TIMEOUT_PERIOD = 8000;

// app.post("/saveName", (req, res) => {
//   const { nama } = req.body;
//   if (nama) {
//     currentName = nama;

//     database.push({ nama: currentName }); // Menyimpan nama ke database
//     console.log("Name saved to database:", { nama: currentName });
//     res.json({ success: true, message: "Name saved to database successfully" });
//   } else {
//     res.status(400).json({ success: false, message: "Name is required" });
//   }
// });

// app.post("/savedata", (req, res) => {
//   const { nama,heartRate, spO2, irValue } = req.body;

//   if (!currentName) {
//     return res.status(400).json({ success: false, message: "Name not set" });
//   }
//   dataArray.push({ nama: currentName, heartRate, spO2, irValue });
//   clearTimeout(timeout);
//   timeout = setTimeout(() => {
//     saveDataToDatabase()
//       .then(() => {
//         console.log("Data saved to database");
//       })
//       .catch((err) => {
//         console.error("Error saving data to database:", err);
//       });
//   }, TIMEOUT_PERIOD);

//   res.json({ success: true, message: "Data received successfully" });
// });

//   function saveDataToDatabase(req, res) {
//   return new Promise((resolve, reject) => {
//     if (dataArray.length === 0) {
//       return resolve(); // No data to save
//     }

//     // Inisialisasi nilai awal untuk data yang disimpan
//     const initialData = {
//       nama: currentName,
//       heartRate: 0,
//       spO2: 0,
//       irValue: 0,
//     };
//     // Tambahkan nilai awal di awal dan akhir dataArray
//     dataArray.unshift(initialData);
//     dataArray.push(initialData);

//     const cycleId = uuidv4(); // Generate UUID for cycle_id

//     // Siapkan data untuk dimasukkan ke dalam database
//     const sql =
//       "INSERT INTO data (cycle_id,nama, heartRate, spO2, irValue, timestamp) VALUES ?";
//     const values = dataArray.map(({ nama, heartRate, spO2, irValue }) => [
//       cycleId,
//       nama,
//       heartRate,
//       spO2,
//       irValue,
//       new Date(), // Waktu saat ini
//     ]);

//     db.query(sql, [values], (err) => {
//       if (err) {
//         return reject(err); // Pass the error to the promise
//       }
//       console.log("Data saved to database");
//       dataArray = []; // Clear the array after saving
//       resolve(); // Resolve the promise on success
//     });
//   });
// }

// Endpoint untuk memulai siklus pengiriman data
app.get('/startCycle', (req, res) => {
  currentUUID = uuidv4(); // Generate new UUID for current cycle

  timestamp = new Date();
  res.json({ success: true, cycleId: currentUUID });
});

// Endpoint untuk menerima data dari ESP32 dan menyimpan ke dalam database
app.post('/saveData', (req, res) => {
  const { nama, heartRate, spO2, irValue, cycleId } = req.body;

  if (!nama || heartRate == null || spO2 == null || irValue == null || !cycleId) {
    return res.status(400).json({ success: false, message: "Invalid data format or missing cycleId" });
  }

  // Pastikan cycleId yang diterima sama dengan currentUUID
  if (cycleId !== currentUUID) {
    return res.status(400).json({ success: false, message: "Mismatched cycleId" });
  }

  //const timestamp = new Date(); // Waktu saat ini

  // Siapkan data untuk dimasukkan ke dalam database
  const sql = "INSERT INTO data (cycle_id, nama, heartRate, spO2, irValue, timestamp) VALUES ?";
  const values = [[cycleId, nama, heartRate, spO2, irValue, timestamp]];

  db.query(sql, [values], (err) => {
    if (err) {
      console.error('Error saving data to database:', err);
      return res.status(500).json({ success: false, message: "Error saving data to database" });
    }

    console.log('Data saved to database');
    res.json({ success: true, message: "Data saved to database successfully" });
  });
});


app.get("/fetchData", (req, res) => {
  const sql =
    "SELECT cycle_id, GROUP_CONCAT(DISTINCT nama) AS nama, GROUP_CONCAT(heartRate) AS heartRate, GROUP_CONCAT(spO2) AS spO2, GROUP_CONCAT(irValue) AS irValue,GROUP_CONCAT( DISTINCT timestamp) AS timestamp FROM data GROUP BY cycle_id";

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
        timestamp:(result.timestamp) // Format timestamp sesuai kebutuhan
      
      }));

      res.json({ success: true, data: formattedResults });
    }
  });
});

app.get('/ppg-data', (req, res) => {
  const cycleId = req.query.cycle_id; // Mengambil cycle_id dari query params
  if (!cycleId) {
    res.status(400).json({ error: 'cycle_id is required' });
    return;
  }
  // Query SQL untuk mengambil data berdasarkan cycle_id
  const sql = `SELECT cycle_id, GROUP_CONCAT(DISTINCT nama) AS nama, GROUP_CONCAT(irValue) AS irValue 
               FROM data 
               WHERE cycle_id = ?
               GROUP BY cycle_id`;

  db.query(sql, [cycleId], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      res.status(500).json({ error: 'Database query error' });
      return;
    }
    res.json(results);
  });
});





app.delete('/deleteData/:cycleId', (req, res) => {
  const { cycleId } = req.params;
  const sql = "DELETE FROM data WHERE cycle_id = ?";
  
  db.query(sql, [cycleId], (err, result) => {
    if (err) {
      console.error("Error deleting data:", err);
      return res.status(500).json({ success: false, message: "Error deleting data" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Data not found" });
    }
    console.log(`Data with cycle_id ${cycleId} deleted successfully`);
    res.json({ success: true, message: "Data deleted successfully" });
  });
});




// Endpoint untuk menyimpan data yang sudah dipotong
app.post('/save-cut-data', (req, res) => {
  const {cycle_id, nama, cut_irValues } = req.body;

  // Loop melalui data yang sudah dipotong dan simpan setiap siklus sebagai satu entri terpisah
  const insertPromises = cut_irValues.map(cutData => {
    const cutID = uuidv4(); // Mendapatkan UUIDv4 baru untuk setiap entri
    const cutDataString = cutData.join(',');
    const sql = 'INSERT INTO cut_data (cutID,cycle_id, nama, cut_irValue) VALUES (?,?, ?, ?)';
    return new Promise((resolve, reject) => {
      db.query(sql, [cutID,cycle_id, nama, cutDataString], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  });

  Promise.all(insertPromises)
    .then(() => {
      res.json({ success: true, message: 'Data saved successfully' });
    })
    .catch(err => {
      console.error('Error inserting data:', err);
      res.status(500).json({ success: false, message: 'Database insertion error' });
    });
});

app.get('/getCutData',(req,res) =>{
  const cycleId = req.query.cycle_id; // Mengambil cycle_id dari query params

  const sql = "SELECT * FROM cut_data ORDER BY cycle_id";
  db.query(sql,(err,result) =>{
    if(err){
      console.error('Error Fetching Data:', err);
      res.status(500).json({ success : false , message :'Database insertion error'});
    }
    else{
      res.status(200).json({success:true ,data: result});
    }
  });
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
