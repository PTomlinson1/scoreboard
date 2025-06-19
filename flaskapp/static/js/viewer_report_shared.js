let chart1Instance = null;
let chart2Instance = null;

function renderCharts(allPings) {
  // Determine the maximum Y value across both innings
  let maxY = 0;
  for (const innings in allPings) {
    for (const over in allPings[innings]) {
      const data = allPings[innings][over];
      const total = (data.initial || 0) + (data.visible || 0) + (data.interval || 0);
      if (total > maxY) maxY = total;
    }
  }

  // Helper to draw each chart
  function drawChart(canvasId, inningsData) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = [];
    const initial = [], visible = [], interval = [];

    for (let i = 0; i <= 40; i++) {
      labels.push(i);
      const overData = inningsData[i] || {};
      initial.push(overData.initial || 0);
      visible.push(overData.visible || 0);
      interval.push(overData.interval || 0);
    }

    if (window[canvasId + "Instance"]) {
      window[canvasId + "Instance"].destroy();
    }

    window[canvasId + "Instance"] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Initial', backgroundColor: '#4bc0c0', data: initial },
          { label: 'Visible', backgroundColor: '#ffcd56', data: visible },
          { label: 'Interval', backgroundColor: '#9966ff', data: interval }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: maxY < 5 ? 5 : maxY + 1 // Add a little headroom
          }
        },
        plugins: {
          legend: { labels: { color: '#eee' } }
        }
      }
    });
  }

  // Wait until layout has settled
  requestAnimationFrame(() => {
    drawChart("chart1", allPings[1] || {});
    drawChart("chart2", allPings[2] || {});
  });
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}
