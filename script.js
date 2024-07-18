let chart;

let intervalId;
const serverUrl = "http://192.168.1.40/getdata";
const espServer = "192.168.1.33";

let deleteCycleId = null;

let sendData = false;
let nama = "";

let stopwatchInterval;
let totalSeconds = 0;

let isSavingData = false; // Kontrol global untuk mengatur kapan data disimpan
let currentCycleId = ""; // UUID untuk siklus pengiriman data saat ini

function fetchData() {
  fetch("http://192.168.1.41/getdata")
    .then((response) => response.json())
    .then((data) => {
      document.getElementById("heartRate").innerText = data.heartRate + " bpm";
      document.getElementById("spO2").innerText = data.spO2 + " %";
      document.getElementById("irValue").innerText = data.irValue + " ";

      // Add new data point to chart
      const time = new Date();
      const ppgValue = parseFloat(data.irValue); // Ensure the value is a float
      addData(chart, time, ppgValue);
      if (isSavingData) {
        sendDataToServer(data);
      }
    })
    .catch((error) => console.error("Error:", error));
}

function addData(chart, label, data) {
  chart.data.datasets.forEach((dataset) => {
    dataset.data.push({
      x: label,
      y: data,
    });
  });
  chart.update("quiet"); // Update the chart quietly to prevent full re-render
}

window.onload = function () {
  const ctx = document.getElementById("ppgChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "PPG Pulse",
          data: [],
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 2,
          fill: false,
          tension: 0.3, // Smooth the line
          pointRadius: 1, // Hide data points to make the line smoother
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: "realtime", // Use the 'realtime' scale provided by chartjs-plugin-streaming
          realtime: {
            duration: 6000, // Data in the past 60 seconds will be displayed
            refresh: 50, // Update interval
            delay: 1000, // Delay for fetching new data
            onRefresh: fetchData, // Call fetchData to get new data
          },
        },
        y: {
          beginAtZero: false,
          suggestedMin: 0, // Adjust this value based on your data range
          suggestedMax: 1023,
        },
      },
      plugins: {
        streaming: {
          frameRate: 30, // Reduce frame rate to make the rendering smoother
        },
      },
    },
  });

  // Start fetching data
  fetchData();
};

function handleSubmit(event) {
  event.preventDefault();
  nama = document.getElementById("nama").value;
  sendData = true;
  console.log("Nama set:", nama);

  // Send the name to the database
  fetch("http://localhost:3000/saveName", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nama }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error saving name");
      }
      return response.json();
    })
    .then((data) => {
      console.log("Name saved:", data);
      // Call the function to start sending data to ESP32
      startSending();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

// function startSending() {
//   fetch("http://192.168.1.41/startdata") // Memberitahu ESP32 untuk mulai mengirim data
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Error starting data send");
//       }
//       console.log("Data sending started");
//     })
//     .catch((error) => {
//       console.error("Error starting data send:", error);
//     });
//   // Clear any existing interval
//   clearInterval(stopwatchInterval);

//   // Reset stopwatch
//   totalSeconds = 0;
//   updateStopwatchDisplay();
//   // Show stopwatch
//   document.getElementById("stopwatch").style.display = "inline-block";

//   // Start interval to update stopwatch every second
//   stopwatchInterval = setInterval(function () {
//     totalSeconds++;
//     updateStopwatchDisplay();
//   }, 1000); // Update every second
// }

// function stopSending() {
//   sendData = false;
//   console.log("Data sending stopped");

//   // Show overlay and loading message
//   document.getElementById("overlay").style.display = "block";
//   document.getElementById("loading").style.display = "block";
//   document.body.classList.add("loading-active");

//   // Optionally, notify ESP32 to stop sending data
//   fetch("http://192.168.1.41/stopdata")
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Error stopping data send");
//       }
//       console.log("Data sending stopped on ESP32");

//       // Simulate a delay to represent saving to database
//       setTimeout(function () {
//         // Hide overlay and loading message

//         document.getElementById("overlay").style.display = "none";
//         document.getElementById("loading").style.display = "none";
//         document.body.classList.remove("loading-active");
//         alert("Data berhasil disimpan ke database!");

//         window.location.reload();
//       }, 3000); // Simulate 3 seconds delay
//     })
//     .catch((error) => {
//       console.error("Error stopping data send:", error);

//       // Hide overlay and loading message if there's an error
//       document.getElementById("overlay").style.display = "none";
//       document.getElementById("loading").style.display = "none";
//       document.body.classList.remove("loading-active");
//     });
// }

function updateStopwatchDisplay() {
  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = `${pad(minutes)}:${pad(seconds)}`;
  document.getElementById("stopwatch").textContent = formattedTime;
}

function pad(num) {
  return num.toString().padStart(2, "0");
}

// Fungsi untuk memulai siklus pengiriman data dari server Node.js
function startSending() {

  const nameInput = document.getElementById("nama").value;

  
  fetch("http://localhost:3000/startCycle")
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        currentCycleId = data.cycleId;
        isSavingData = true; // Set isSavingData true untuk mulai mengirim data
        console.log("Cycle started with UUID:", currentCycleId);
      } else {
        console.error("Failed to start cycle:", data.message);
      }
    })
    .catch((error) => console.error("Error starting cycle:", error));
  //Clear any existing interval
  clearInterval(stopwatchInterval);

  // Reset stopwatch
  totalSeconds = 0;
  if (nameInput.trim() === "") {
    updateStopwatchDisplay();
    return;
  }
  
  // Show stopwatch
  document.getElementById("stopwatch").style.display = "inline-block";

  // Start interval to update stopwatch every second
  stopwatchInterval = setInterval(function () {
    totalSeconds++;
    updateStopwatchDisplay();
  }, 1000); // Update every second
}

// Fungsi untuk menghentikan penyimpanan data
function stopSending() {
  isSavingData = false;
  currentCycleId = ""; // Reset currentCycleId
  console.log("Data sending stopped");

  // Show overlay and loading message
  document.getElementById("overlay").style.display = "block";
  document.getElementById("loading").style.display = "block";
  document.body.classList.add("loading-active");

  // Simulate a delay to represent saving to database
  setTimeout(function () {
    // Hide overlay and loading message
    document.getElementById("overlay").style.display = "none";
    document.getElementById("loading").style.display = "none";
    document.body.classList.remove("loading-active");

    alert("Data berhasil disimpan ke database!");
    window.location.reload();
  }, 3000); // Simulate 3 seconds delay
}

// Fungsi untuk mengirim data ke server Node.js
function sendDataToServer(data) {
  if (isSavingData && currentCycleId !== "") {
    const payload = {
      nama,
      heartRate: data.heartRate,
      spO2: data.spO2,
      irValue: data.irValue,
      cycleId: currentCycleId, // Menggunakan UUID yang sama untuk semua data dalam satu siklus
    };

    fetch("http://localhost:3000/saveData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error sending data");
        }
        return response.json();
      })
      .then((responseData) => {
        console.log("Data sent:", responseData);
      })
      .catch((error) => {
        console.error("Error sending data:", error);
      });
  }
}

// function sendDataToServer() {
//   if (sendData) {
//     fetch("http://localhost:3000/savedata", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ nama }),
//       body: JSON.stringify(data),
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Error sending data");
//         }
//         return response.json();
//       })
//       .then((data) => {
//         console.log("Data sent:", data);
//       })
//       .catch((error) => {
//         console.error("Error:", error);
//       });
//   }
// }

// function sendDataToServer(data) {
//   if (sendData) {
//     const payload = {
//       nama,
//       heartRate: data.heartRate,
//       spO2: data.spO2,
//       irValue: data.irValue,
//     };

//     fetch("http://localhost:3000/saveData", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Error sending data");
//         }
//         return response.json();
//       })
//       .then((responseData) => {
//         console.log("Data sent:", responseData);
//       })
//       .catch((error) => {
//         console.error("Error:", error);
//       });
//   }
// }

function deleteData(cycleId) {
  if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
    fetch(`http://localhost:3000/deleteData/${cycleId}`, { method: "DELETE" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to delete data");
        }
        console.log("Data deleted successfully");
        // Remove the table row from the UI
        document.querySelector(`#row-${cycleId}`).remove();
        // Optionally reload the data or update the UI
        location.reload();
      })
      .catch((error) => {
        console.error("Error deleting data:", error);
      });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  let currentPage = 1;
  let totalPages = 0;

  fetch("http://localhost:3000/fetchData") // Ubah endpoint menjadi fetchdata
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const tableBody = document.getElementById("data-table");
        const dataPerPage = 10; // Ubah sesuai dengan jumlah data yang ingin ditampilkan per halaman
        totalPages = Math.ceil(data.data.length / dataPerPage);

        function calculateAverage(values) {
          const sum = values.reduce((acc, val) => acc + val, 2);
          return (sum / values.length).toFixed(); // Mengembalikan nilai rata-rata dengan 2 desimal
        }

        function showPage(page) {
          tableBody.innerHTML = ""; // Bersihkan isi tabel sebelum menambahkan data baru

          data.data.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );

          const startIndex = (page - 1) * dataPerPage;
          const endIndex = Math.min(startIndex + dataPerPage, data.data.length);

          for (let i = startIndex; i < endIndex; i++) {
            const row = data.data[i];
            const tr = document.createElement("tr");
            // Menghitung nilai rata-rata heartRate dan spO2
            const heartRateValues = row.heartRate; // Asumsikan heartRate adalah array nilai
            const spO2Values = row.spO2; // Asumsikan spO2 adalah array nilai

            const averageHeartRate = calculateAverage(heartRateValues);
            const averageSpO2 = calculateAverage(spO2Values);

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.className = "btn btn-danger";
            deleteButton.onclick = function () {
              deleteData(row.cycle_id); // Pass cycle_id to deleteData function
            };
            tr.innerHTML = `
                          <td>${i + 1}</td>
                          <td>${row.timestamp}</td>
                          <td>${row.nama}</td>
                          <td>${averageHeartRate}</td>
                          <td>${averageSpO2}</td>
                          <td class ="ir">${row.irValue}</td>
                          <td><a class="btn btn-primary"  href="viewCut.html?cycleId=${
                            row.cycle_id
                          }">View Graph</a></td>  
                                                
                      `;
            tableBody.appendChild(tr);

            tr.children[tr.children.length - 1].appendChild(deleteButton);
          }
        }

        function updatePagination() {
          // Hapus semua tombol pagination sebelum menambahkan yang baru
          const paginationContainer = document.getElementById(
            "pagination-container"
          );
          paginationContainer.innerHTML = "";

          // Tambahkan tombol "Previous"
          const previousLi = document.createElement("li");
          previousLi.classList.add("page-item");
          const previousLink = document.createElement("a");
          previousLink.classList.add("page-link");
          previousLink.href = "#";
          previousLink.id = "previous-link"; // Tambahkan ID untuk event listener
          previousLink.textContent = "Previous";
          previousLi.appendChild(previousLink);
          paginationContainer.appendChild(previousLi);

          // Tambahkan event listener untuk tombol "Previous"
          previousLink.addEventListener("click", function (event) {
            event.preventDefault();
            if (currentPage > 1) {
              currentPage--;
              showPage(currentPage);
              updatePagination(); // Perbarui tampilan pagination setelah mengubah halaman
            }
          });

          // Tambahkan tombol halaman
          for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement("li");
            li.classList.add("page-item");
            const a = document.createElement("a");
            a.classList.add("page-link");
            a.href = "#";
            a.textContent = i;
            li.appendChild(a);
            paginationContainer.appendChild(li);
            if (i === currentPage) {
              li.classList.add("active");
            }
            // Tambahkan event listener pada tombol halaman
            a.addEventListener("click", function (event) {
              event.preventDefault();
              currentPage = i;
              showPage(currentPage);
              updatePagination(); // Perbarui tampilan pagination setelah mengubah halaman
            });
          }

          // Tambahkan tombol "Next"
          const nextLi = document.createElement("li");
          nextLi.classList.add("page-item");
          const nextLink = document.createElement("a");
          nextLink.classList.add("page-link");
          nextLink.href = "#";
          nextLink.id = "next-link"; // Tambahkan ID untuk event listener
          nextLink.textContent = "Next";
          nextLi.appendChild(nextLink);
          paginationContainer.appendChild(nextLi);

          // Tambahkan event listener untuk tombol "Next"
          nextLink.addEventListener("click", function (event) {
            event.preventDefault();
            if (currentPage < totalPages) {
              currentPage++;
              showPage(currentPage);
              updatePagination(); // Perbarui tampilan pagination setelah mengubah halaman
            }
          });
        }

        // Tampilkan halaman pertama secara default
        showPage(currentPage);
        // Tambahkan pagination setelah menambahkan data pertama kali
        updatePagination();
      } else {
        console.error("Error fetching data:", data.message);
      }
      // Event listener untuk tombol "View CUT"
      const viewCutButtons = document.querySelectorAll(".view-cut-btn");
      viewCutButtons.forEach((button) => {
        button.addEventListener("click", function (event) {
          const cycleId = this.getAttribute("data-cycle-id"); // Ambil cycle_id dari atribut data-cycle-id
          fetchAndDisplayIrValue(cycleId); // Panggil fungsi untuk menampilkan IrValue berdasarkan cycle_id
        });
      });
    })
    .catch((error) => console.error("Error:", error));
});

{
  /* <td>${row.id}</td> */
}

//export to pdf,elxs,csv

// Function to export data to PDF
function exportToPDF() {
  // Ambil data dari tabel
  const table = document.getElementById("data-table");
  const rows = table.querySelectorAll("tr");

  // Buat struktur data untuk pdfmake
  const data = [];
  rows.forEach((row) => {
    const rowData = [];
    row.querySelectorAll("td").forEach((cell) => {
      rowData.push(cell.textContent.trim());
    });
    data.push(rowData);
  });

  // Konfigurasi dokumen PDF
  const docDefinition = {
    content: [
      {
        table: {
          body: [["ID", "Heart Rate", "SpO2", "IR Value"], ...data],
        },
      },
    ],
  };

  // Export ke PDF
  pdfmake.createPdf(docDefinition).download("data.pdf");
}

// Function to export data to CSV
async function fetchDataFromDatabase() {
  try {
    const response = await fetch("http://localhost:3000/fetchData");
    const data = await response.json();
    return data.data; // Mengembalikan array data dari database
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

// Fungsi untuk mengambil semua data dari database
async function fetchDataFromDatabase() {
  try {
    const response = await fetch("http://localhost:3000/fetchData");
    const data = await response.json();
    return data.data; // Mengembalikan array data dari database
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

// Fungsi untuk mengekspor data ke file CSV
async function exportToCSV() {
  const data = await fetchDataFromDatabase(); // Ambil semua data dari database
  if (!data) return; // Jika gagal, hentikan eksekusi

  // Buat konten CSV
  const csvContent = data.map((row) => Object.values(row).join(",")).join("\n");

  // Buat blob dari konten CSV
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Buat tautan untuk men-download file CSV
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "data.csv");
  link.style.visibility = "hidden";

  // Tambahkan tautan ke dalam dokumen dan klik secara otomatis untuk men-download file CSV
  document.body.appendChild(link);
  link.click();

  // Hapus tautan setelah pengunduhan selesai
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Panggil fungsi exportToCSV() saat tombol di klik
document.getElementById("export-button").addEventListener("click", exportToCSV);

// Fungsi untuk mengekspor data ke file Excel
async function exportToExcel() {
  const data = await fetchDataFromDatabase(); // Ambil semua data dari database
  if (!data) return; // Jika gagal, hentikan eksekusi

  // Buat array untuk menyimpan data yang akan diekspor ke Excel
  const sheetData = [];

  // Ambil header kolom dari data pertama
  const headers = Object.keys(data[0]);
  sheetData.push(headers);

  // Iterasi setiap baris data dan konversi ke array
  data.forEach((row) => {
    const rowData = [];
    headers.forEach((header) => {
      rowData.push(row[header]);
    });
    sheetData.push(rowData);
  });

  // Buat workbook dan tambahkan data ke dalam worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Export ke Excel
  XLSX.writeFile(workbook, "data.xlsx");
}

// Panggil fungsi exportToExcel() saat tombol di klik
document
  .getElementById("export-excel-button")
  .addEventListener("click", exportToExcel);
