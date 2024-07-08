

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
        document.getElementById('nama').textContent = `Nama: ${nama}`;

        document.getElementById('message').textContent = '';


        function normalizeData(data) {
            let min = Math.min(...data);
            let max = Math.max(...data);
            return data.map(value => (value - min) / (max - min));
          }
    
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
          if (cycle.length >= 7) {
            cycles.push(cycle);
          }
        }
        
        return cycles;
      }
      // Deteksi lembah setelah normalisasi
      let valleys = detectValleys(irValues);

      // Memotong sinyal PPG menjadi siklus
      let cycles = cutPPGIntoCycles(irValues, valleys);

      

    

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
              pointRadius: 0
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
    })
    .catch(error => console.error('Error fetching data:', error));
}