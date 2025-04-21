
function safeText(data, key, fallback = '-') {
  return data[key] !== undefined && data[key] !== null && data[key] !== "" ? data[key] : fallback;
}

function formatBowlerScore(raw) {
  if (!raw || !raw.includes('/') || !raw.includes('(')) return ['--', '--', '--'];
  const match = raw.match(/^(\d+)\/(\d+) \(([^)]+)\)$/);
  if (!match) return ['--', '--', '--'];
  const [_, runs, wkts, overs] = match;
  return [overs, runs, wkts];
}

function updateIfExists(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setDigits(id, val, digits) {
  const el = document.getElementById(id);
  if (!el) return;
  const strVal = String(val);
  el.innerHTML = '';
  for (let i = 0; i < strVal.length; i++) {
    const span = document.createElement("span");
    span.textContent = strVal[i];
    span.className = '';
    el.appendChild(span);
  }
}

function loadPriority() {
  fetch('/priority')
    .then(res => res.json())
    .then(data => {
      const src = data.active_source;
      updateIfExists("priority_label", src === "PCS" ? "Scoring by Play Cricket App" : "Manual Scoring");
      const showManual = (src === "Manual");
      document.getElementById("manual_layout").style.display = showManual ? "flex" : "none";
      document.getElementById("pcs_layout").style.display = showManual ? "none" : "block";
    });
}

function loadData() {
  fetch('/data')
    .then(res => res.json())
    .then(data => {
      const [runs, wkts] = safeText(data, 'batting_team_score', '0/0').split('/');
      const overs = parseFloat(safeText(data, 'overs', '0'));
      const total = parseInt(runs || 0);
      const target = parseInt(safeText(data, 'target', '0'));
      const oversPerInnings = parseInt(safeText(data, 'overs_per_innings', '0'));
      const manualOversRemaining = oversPerInnings > 0 ? Math.max(0, oversPerInnings - overs) : 0;
      const manualRequiredRunRate = (target > 0 && manualOversRemaining > 0) ? ((target - total) / manualOversRemaining).toFixed(1) : '--';

      setDigits('manual_total', total, 3);
      setDigits('manual_wkts', parseInt(wkts || 0), 1);
      setDigits('manual_overs', overs, 2);

      updateIfExists('manual_team_names', `${safeText(data, 'home_team')}   vs   ${safeText(data, 'away_team')}`);

      updateIfExists('batsa_name', safeText(data.batter_1_name, "BATTER A"));
      updateIfExists('batsb_name', safeText(data.batter_2_name, "BATTER B"));

// Batter visibility logic
fetch("/load_options")
  .then(res => res.json())
  .then(options => {
    const showBatsmen = options.show_batsmen;
    const b1 = document.getElementById("batter_1_block");
    const b2 = document.getElementById("batter_2_block");
    const wktsTop = document.getElementById("manual_wkts_top");
    const wktsMid = document.getElementById("manual_wkts_mid");

    if (showBatsmen) {
      if (b1) b1.style.display = "inline-block";
      if (b2) b2.style.display = "inline-block";
      if (wktsTop) wktsTop.style.display = "none";
      if (wktsMid) {
        wktsMid.style.display = "inline-block";
        setDigits("manual_wkts_alt", parseInt(wkts || 0), 1);
      }
    } else {
      if (b1) b1.style.display = "none";
      if (b2) b2.style.display = "none";
      if (wktsTop) wktsTop.style.display = "inline-block";
      if (wktsMid) wktsMid.style.display = "none";
    }
  });

// Show batter scores
updateIfExists("manual_batter_1_name", safeText(data, "batter_1_name"));
updateIfExists("manual_batter_1_score", safeText(data, "batter_1_score"));
updateIfExists("manual_batter_2_name", safeText(data, "batter_2_name"));
updateIfExists("manual_batter_2_score", safeText(data, "batter_2_score"));

// Handle first vs second innings logic
const secondInnings = target > 0 && oversPerInnings > 0;
const hasOvers = overs > 0;
const oversRemaining = oversPerInnings > 0 ? Math.max(0, oversPerInnings - overs) : 0;
const currentRR = hasOvers ? (total / overs).toFixed(1) : "--";
const requiredRR = oversRemaining > 0 ? ((target - total) / oversRemaining).toFixed(1) : "--";
const runsRequired = Math.max(0, target - total);

// Update RATE block
const rrBlock = document.getElementById("manual_rr_block");
if (rrBlock) {
  rrBlock.style.display = hasOvers ? "inline-block" : "none";
  updateIfExists("manual_rr", currentRR);
}

// Second innings block
const secondRow = document.getElementById("second_innings_row");
if (secondInnings) {
  secondRow.style.display = "flex";
  updateIfExists("manual_runs_required", runsRequired);
  updateIfExists("manual_reqd_rate", requiredRR);
  setDigits("manual_remaining", oversRemaining, 2);
} else {
  secondRow.style.display = "none";
  if (oversRemaining > 0) {
    setDigits("manual_remaining", oversRemaining, 2);
  }
}



      // PCS Display
      updateIfExists('batting_team_name', safeText(data, 'batting_team_name'));
      updateIfExists('bowling_team_name', safeText(data, 'bowling_team_name'));

      ['batting_team_name', 'bowling_team_name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('batting-team');
      });
      const battingEl = document.getElementById('batting_team_name');
      if (battingEl) battingEl.classList.add('batting-team');

      updateIfExists('batting_team_score', safeText(data, 'batting_team_score'));

      //  check bowling team score for being blank ('-' returned by safetext fn) and make it blank
      updateIfExists('bowling_team_score', (safeText(data, 'bowling_team_score') === '-' ? '' : safeText(data, 'bowling_team_score')));


      updateIfExists('batter_1_name', safeText(data, 'batter_1_name'));
      updateIfExists('batter_1_score', safeText(data, 'batter_1_score'));
      updateIfExists('batter_1_balls', safeText(data, 'batter_1_balls'));
      updateIfExists('batter_2_name', safeText(data, 'batter_2_name'));
      updateIfExists('batter_2_score', safeText(data, 'batter_2_score'));
      updateIfExists('batter_2_balls', safeText(data, 'batter_2_balls'));

      const strike1 = data['batter_1_strike'] === '1';
      const strike2 = data['batter_2_strike'] === '1';
      const b1 = document.getElementById('batter_1_name');
      const b2 = document.getElementById('batter_2_name');
      if (b1) b1.classList.toggle('strike', strike1);
      if (b2) b2.classList.toggle('strike', strike2);

      updateIfExists('current_bowler_name', safeText(data, 'current_bowler_name'));
      updateIfExists('previous_bowler_name', safeText(data, 'previous_bowler_name'));

      const [cO, cR, cW] = formatBowlerScore(safeText(data, 'current_bowler_score'));
      const [pO, pR, pW] = formatBowlerScore(safeText(data, 'previous_bowler_score'));

      updateIfExists('current_bowler_overs', cO);
      updateIfExists('current_bowler_runs', cR);
      updateIfExists('current_bowler_wkts', cW);
      updateIfExists('previous_bowler_overs', pO);
      updateIfExists('previous_bowler_runs', pR);
      updateIfExists('previous_bowler_wkts', pW);

      updateIfExists('overs', safeText(data, 'overs_bowled'));
      updateIfExists('this_over_label', "THIS OVER:      " + safeText(data, 'current_over_ball', ''));

      const viewerMode = safeText(data, 'mode', 'manual');

      // Combine overs logic: always add 1 to completed overs
      let oversRaw = (viewerMode === 'manual')
        ? parseFloat(safeText(data, 'overs', '0'))  // manual is whole number
        : parseFloat(safeText(data, 'overs_bowled', '0')) || 0;

      const viewerOvers = Math.floor(oversRaw) + 1;

      // Determine innings
      const viewerInnings = (viewerMode === 'manual' && parseInt(safeText(data, 'target', '0')) > 0)
        || (viewerMode === 'pcs' && parseInt(safeText(data, 'bowling_team_score', '0')) > 0)
        ? 2 : 1;

      // Update hidden fields
      const modeEl = document.getElementById("viewer_mode");
      if (modeEl) modeEl.value = viewerMode;

      const oversEl = document.getElementById("viewer_overs");
      if (oversEl) oversEl.value = viewerOvers;

      const inningsEl = document.getElementById("viewer_innings");
      if (inningsEl) inningsEl.value = viewerInnings;


      const bowlingScore = safeText(data, 'bowling_team_score', '');
      const runsReq = safeText(data, 'runs_required', '--');
      const reqRR = safeText(data, 'required_run_rate', '--');

      // Use PCS overs field
      const rawOvers = safeText(data, 'overs_bowled', '0');
      const [whole, balls] = rawOvers.toString().split('.');
      const ballsNum = parseInt(balls || '0');
      const totalOvers = parseInt(whole || '0') + (ballsNum / 6);
      const battingTotal = parseInt(runs || 0);
      const rrate = (totalOvers > 0) ? (battingTotal / totalOvers).toFixed(1) : '--';
 
      if (!bowlingScore || parseInt(bowlingScore) === 0) {
        updateIfExists('run_info', `RUN RATE: ${rrate} RPO`);
      } else {
        updateIfExists('run_info', `RUN RATE: ${rrate}   REQD: ${runsReq} AT ${reqRR} RPO`);
      }

    });
}

 function updateClock() {
   const now = new Date();
   const h = now.getHours();
   const m = now.getMinutes().toString().padStart(2, '0');
   updateIfExists("clock", `${h}:${m}`);
 }

setInterval(() => {
  loadData();
  loadPriority();
  updateClock();
}, 5000);

window.onload = function () {
  loadData();
  loadPriority();
  updateClock();
};
