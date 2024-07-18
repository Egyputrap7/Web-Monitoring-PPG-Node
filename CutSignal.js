


window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const nama = urlParams.get('nama'); // Ambil nama dari URL
      const cycleId = urlParams.get('cycleId'); // Tetap ambil cycle_id untuk pengambilan data

    fetch(`http://localhost:3000/ppg-data?cycle_id=${cycleId}`)
      .then(response => response.json())
      .then(result => {
        if (result.length === 0) {
          document.getElementById('message').textContent = 'No data found for the given cycle_id';
          return;
        }

        const nama = result[0].nama;
        const irValues = result[0].irValue.split(',').map(Number).reverse();
        document.getElementById('nama').textContent = `Nama di Uji: ${nama}`;

        document.getElementById('message').textContent = '';


       
    
          // Fungsi untuk deteksi lembah (valley)
          function detectValleys(data) {
            let valleys = [];
            
            for (let i = 1; i < data.length - 1; i++) {
              if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
                valleys.push(i); // Simpan indeks lembah
              }
            }
            
            return valleys;
          }

          // Fungsi untuk deteksi puncak (peak) di antara lembah
      function detectPeakBetweenValleys(data, valley1, valley2) {
        let peakIndex = valley1;
        let peakValue = data[valley1];
        
        for (let i = valley1 + 1; i <= valley2; i++) {
          if (data[i] > peakValue) {
            peakValue = data[i];
            peakIndex = i;
          }
        }
        
        return peakIndex;
      }

      // Fungsi untuk memotong siklus PPG berdasarkan lembah dan puncak
      function cutPPGIntoCycles(data, valleys) {
        let cycles = [];
        
        for (let i = 0; i < valleys.length - 1; i++) {
          let valley1 = valleys[i];
          let valley2 = valleys[i + 1];
          
          let peakIndex = detectPeakBetweenValleys(data, valley1, valley2);
          
          // Potong siklus berdasarkan lembah dan puncak
          let cycle = data.slice(valley1, valley2 + 1);
          cycle.peakIndex = peakIndex; // Menyimpan indeks puncak dalam siklus
          
          // Periksa panjang siklus, minimal 9 data
          if (cycle.length >= 5) {
            cycles.push(cycle);
          }
        }
        
        return cycles;
      }
      // Deteksi lembah setelah normalisasi
      let valleys = detectValleys(irValues);

      // Memotong sinyal PPG menjadi siklus
      let cycles = cutPPGIntoCycles(irValues, valleys);



//       // Fungsi untuk mendeteksi nilai terendah (awal siklus baru)
// function detectTroughs(data) {
//   let troughs = [];
//   for (let i = 1; i < data.length - 1; i++) {
//       if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
//           troughs.push(i);
//       }
//   }
//   return troughs;
// }

// // Fungsi untuk memotong data menjadi per siklus berdasarkan titik terendah yang terdeteksi
// function segmentDataByCycles(data, troughs) {
//   let cycles = [];
//   for (let i = 0; i < troughs.length - 1; i++) {
//       let cycle = data.slice(troughs[i], troughs[i + 1]);
//       cycles.push(cycle);
//   }
//   // Menambahkan segmen terakhir sampai akhir data
//   cycles.push(data.slice(troughs[troughs.length - 1]));
//   return cycles;
// }

// let troughs = detectTroughs(irValues);
// let cycles = segmentDataByCycles(irValues, troughs);

      

    

        // Buat grafik menggunakan Chart.js
        const ctx = document.getElementById('ppgChart').getContext('2d');
        const ppgChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: irValues.map((_, index) => index), // Gunakan indeks sebagai label
            datasets: [{
              label: 'PPG Signal',
              data: irValues,
              borderColor: 'rgba(0, 0, 255, 0.8)',
              borderWidth: 3,
              tension: 0.3,
              fill: false,
              pointRadius: 0 // Mengatur radius titik ke 0 untuk menonaktifkan titik
            }]
          },
          options: {
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Time (samples)'
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'IR Value'
                }
              }
            }
          }
        });
        
      
      // Gambar grafik untuk setiap siklus PPG yang dipotong
      const cutChartsContainer = document.getElementById('cutChartsContainer');
      cycles.forEach((cycle, index) => {
        // Buat elemen canvas untuk grafik siklus yang dipotong
        const canvas = document.createElement('canvas');
        canvas.classList.add('cutChart'); // Tambahkan kelas cutChart untuk styling

        cutChartsContainer.appendChild(canvas);

        // Gambar grafik siklus yang dipotong menggunakan Chart.js
        const ctxCut = canvas.getContext('2d');
        const cutChart = new Chart(ctxCut, {
          type: 'line',
          data: {
            labels: cycle.map((_, index) => index), // Gunakan indeks sebagai label
            datasets: [{
              label: `Cut Cycle ${index + 1}`,
              data: cycle,
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 3,
              fill: false,
              pointRadius: 0,
              tension:0.3
            }]
          },
          options: {
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Time (samples)'
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'IR Value'
                }
              }
            }
          }
        });
      });
      // Tambahkan event listener untuk tombol "Save Data"
      document.getElementById('saveButton').addEventListener('click', function() {
        saveCutData(cycleId, nama, cycles);
      });
    
    })
    .catch(error => console.error('Error fetching data:', error));
}

// Fungsi untuk mengirim data yang sudah dipotong ke server
function saveCutData(cycle_id, nama, cycles) {
  fetch('http://localhost:3000/save-cut-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cycle_id: cycle_id,
      nama: nama,
      cut_irValues: cycles
    })
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Data saved successfully'
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to save data: ${result.message}`
      });
    }
  })
  .catch(error => {
    console.error('Error saving data:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred while saving data.'
    });
  });
}


document.addEventListener("DOMContentLoaded", function () {
  let currentPage = 1;
  let totalPages = 0;

  fetch("http://localhost:3000/getCutData") // Ubah endpoint menjadi fetchdata
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const tableBody = document.getElementById("data-table");
        const dataPerPage = 10; // Ubah sesuai dengan jumlah data yang ingin ditampilkan per halaman
        totalPages = Math.ceil(data.data.length / dataPerPage);

      

        function showPage(page) {
          tableBody.innerHTML = ""; // Bersihkan isi tabel sebelum menambahkan data baru
          const startIndex = (page - 1) * dataPerPage;
          const endIndex = Math.min(startIndex + dataPerPage, data.data.length);

          for (let i = startIndex; i < endIndex; i++) {
            const row = data.data[i];
            const tr = document.createElement("tr");
            // Menghitung nilai rata-rata heartRate dan spO2
           
            tr.innerHTML = `
                          <td>${i + 1}</td>
                          <td>${row.nama}</td>
                          <td>${row.cut_irValue}</td>
                                              
                      `;
            tableBody.appendChild(tr);
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