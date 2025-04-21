function pad(num, size) {
  let s = "000" + num;
  return s.substr(s.length - size);
}

// populate digit displays with greyed zeros if necessary
function display(id, value, digits) {
  const str = pad(value, digits);
  let html = '';
  let solidDigits = value.toString().length;
  for (let i = 0; i < digits; i++) {
    let char = str[i];
    let isDim = (value === 0 && i < digits - 1) || (value > 0 && i < digits - solidDigits);
    html += `<span class="${isDim ? 'dim' : ''}">${char}</span>`;
  }
  document.getElementById(id).innerHTML = html;
}

let total = 0, wickets = 0, overs = 0, batsa = 0, batsb = 0, target = 0;
let currentMode = 'Manual';
let showBatsmen = true;

// flag for when buttons are pressed to delay auto refresh of page
let isUserInteracting = false;

// Block auto-refresh when user is typing in any input field
document.addEventListener('focusin', (e) => {
  if (e.target.tagName === 'INPUT') {
    isUserInteracting = true;
  }
});

document.addEventListener('focusout', (e) => {
  if (e.target.tagName === 'INPUT') {
    setTimeout(() => {
      isUserInteracting = false;
    }, 2000); // Wait 2 seconds after leaving input field
  }
});

function updateModeLabel(mode) {
  const modeLabel = document.getElementById('mode_label');
  if (!modeLabel) return;

  const secondLine = mode === "Manual"
    ? "You control the scoreboard from this page"
    : "Scoreboard is being updated by Play Cricket Scorer (PCS)";

  modeLabel.innerHTML = `
    ${mode} scoring mode - use ☰ menu to change mode<br>
    <small style="color:#aaa;">${secondLine}</small>
  `;
}

function toggleMode() {
  fetch('/priority')
    .then(res => res.json())
    .then(data => {
      const current = data.active_source;
      const next = current === 'PCS' ? 'Manual' : 'PCS';

      // Switch mode on the server
      fetch('/set_priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_source: next })
      }).then(() => {
        currentMode = next;

        updateModeLabel(next);  // Update mode label at the top

        // Enable or disable target input based on mode
        const targetInput = document.getElementById("target_input");
        if (targetInput) {
          targetInput.disabled = (currentMode === 'PCS');
        }

        const toggleLink = document.getElementById('toggle-mode-link');
        if (toggleLink) {
          toggleLink.textContent = next === 'PCS'
            ? 'Switch to Manual Mode'
            : 'Switch to PCS Mode';
        }

        if (typeof closeMenu === 'function') closeMenu();

        // IF SWITCHING TO PCS → just load PCS data
        if (next === 'PCS') {
          fetch('/data_pcs')
            .then(r => r.json())
            .then(loadData);

        // IF SWITCHING TO MANUAL → copy PCS data into manual with special field mapping
        } else {
          fetch('/data_pcs')
            .then(r => r.json())
            .then(d => {

              // Map overs_bowled to overs (string)
              if (d.overs_bowled !== undefined) {
                d.overs = String(d.overs_bowled);
              }

              // Convert bowling_team_score to target (+1 run)
              if (d.bowling_team_score) {
                try {
                  const runs = parseInt(d.bowling_team_score.split("/")[0]);
                  d.target = String(runs + 1);
                } catch (e) {
                  console.warn("Failed to parse bowling_team_score:", e);
                  d.target = "";
                }
              }

              // POST modified PCS data to manual file
              fetch('/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(d)
              }).then(() => {
                fetch('/data_manual')
                  .then(r => r.json())
                  .then(loadData);
              });
            });
        }
      });
    });
}

function update() {
  display("total_count", total, 3);
  display("wickets_count", wickets, 1);
  display("overs_count", overs, 2);
  display("batsa_count", batsa, 3);
  display("batsb_count", batsb, 3);
  display("target_count", target, 3);
  if (currentMode === "Manual") {
    return fetch('/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batting_team_score: `${total}/${wickets}`,
        overs: String(overs),
        batter_1_score: String(batsa),
        batter_2_score: String(batsb),
        target: String(target)
      })
    });
  } else {
    return Promise.resolve();  // so we can chain safely
  }
}


function confirmZero(callback) {
  Swal.fire({
    title: 'Are you sure you want to set the value to zero?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'Cancel',
    background: '#222',
    color: '#f5e9c9',
    reverseButtons: true,
    customClass: {
      popup: 'manual-swal-popup',
      title: 'manual-swal-title',
      htmlContainer: 'manual-swal-html',
      confirmButton: 'manual-swal-confirm',
      cancelButton: 'manual-swal-cancel'  }
  }).then((result) => {
    if (result.isConfirmed) {
      callback();
    }
  });
}




function pcsProtection(callback) {
  Swal.fire({
    title: 'Manual editing is disabled',
    text: 'The scoreboard is currently being updated by Play Cricket Scorer (PCS) app. Switch to manual mode?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    background: '#222',
    color: '#f5e9c9',
    reverseButtons: true,
    customClass: {
      popup: 'manual-swal-popup',
      title: 'manual-swal-title',
      htmlContainer: 'manual-swal-html',
      confirmButton: 'manual-swal-confirm',
      cancelButton: 'manual-swal-cancel'  }
  }).then((result) => {
    if (result.isConfirmed) {
      toggleMode();
    }
  });
}

function confirmShutdownOrReboot() {
  closeMenu();  // hide the menu if open
  Swal.fire({
    title: 'Shutdown or Reboot?',
    html: `
      <p>This will power off or restart the Raspberry Pi.<br><br>
      You should only do this after the match has finished.</p>
    `,
    icon: 'warning',
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: 'Shutdown',
    denyButtonText: 'Reboot',
    cancelButtonText: 'Cancel',
    background: '#222',
    color: '#f5e9c9',
    reverseButtons: true,
    customClass: {
      popup: 'manual-swal-popup',
      title: 'manual-swal-title',
      htmlContainer: 'manual-swal-html',
      confirmButton: 'manual-swal-confirm',
      denyButton: 'manual-swal-cancel',
      cancelButton: 'manual-swal-cancel'
    }
  }).then((result) => {
    if (result.isConfirmed) {
      confirmFinalShutdown();
    } else if (result.isDenied) {
      fetch('/reboot', { method: 'POST' }).then(() => {
        Swal.fire({
          title: "Rebooting...",
          html: "<p>The Pi is rebooting.<br>This page will reload when it's back online.</p>",
          icon: "info",
          background: "#222",
          color: "#f5e9c9",
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          customClass: {
            popup: 'manual-swal-popup',
            title: 'manual-swal-title',
            htmlContainer: 'manual-swal-html'
          },
          didOpen: () => {
            const checkServer = setInterval(() => {
              fetch("/status", { method: "GET" })
                .then(response => {
                  if (response.ok) {
                    clearInterval(checkServer);
                    Swal.close();
                    location.reload();
                  }
                })
                .catch(() => {
                  // still offline, keep waiting
                });
            }, 3000); // check every 3 seconds
          }
        });
      });
    }
  });
}

function confirmFinalShutdown() {
  Swal.fire({
    title: 'Are you absolutely sure?',
    html: `<p>The scoreboard will go offline and the Pi will power off.</p>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, shut down',
    cancelButtonText: 'Cancel',
    background: '#222',
    color: '#f5e9c9',
    reverseButtons: true,
    customClass: {
      popup: 'manual-swal-popup',
      title: 'manual-swal-title',
      htmlContainer: 'manual-swal-html',
      confirmButton: 'manual-swal-confirm',
      cancelButton: 'manual-swal-cancel'
    }
  }).then((result) => {
    if (result.isConfirmed) {
      fetch('/shutdown', { method: 'POST' }).then(() => {
        Swal.fire({
          title: "Shutting down...",
          icon: "success",
          background: "#222",
          color: "#f5e9c9",
          customClass: {
            popup: 'manual-swal-popup',
            title: 'manual-swal-title'
          },
          showConfirmButton: false,
          timer: 2000
        });
      });
    }
  });
}




function guarded(fn) {
  return function(...args) {
    if (currentMode === 'PCS') {
      pcsProtection();
    } else {
      isUserInteracting = true;
      fn(...args);
      setTimeout(() => { isUserInteracting = false; }, 1000);  // Give user 1s buffer
    }
  }
}

const total_change = guarded(function(dir, val) {
  if (dir === 'zero') return confirmZero(() => { total = 0; update(); });
  total += (dir === 'plus' ? val : -val);
  if (total < 0) total = 0;
  update();
});

const wickets_change = guarded(function(dir, val) {
  if (dir === 'zero') return confirmZero(() => { wickets = 0; update(); });
  wickets += (dir === 'plus' ? val : -val);
  if (wickets < 0) wickets = 0;
  if (wickets > 9) wickets = 9;
  update();
});

const overs_change = guarded(function(dir, val) {
  if (dir === 'zero') return confirmZero(() => { overs = 0; update(); });
  overs += (dir === 'plus' ? val : -val);
  if (overs < 0) overs = 0;
  update();
});

const batsa_change = guarded(function(dir, val) {
  if (dir === 'zero') return showZeroBatterPopup('batsa');
  if (dir === 'plus') { batsa += val; total += val; }
  if (dir === 'minus') { batsa = Math.max(0, batsa - val); total = Math.max(0, total - val); }
  update();
});

const batsb_change = guarded(function(dir, val) {
  if (dir === 'zero') return showZeroBatterPopup('batsb');
  if (dir === 'plus') { batsb += val; total += val; }
  if (dir === 'minus') { batsb = Math.max(0, batsb - val); total = Math.max(0, total - val); }
  update();
});

const set_target = guarded(function() {
  const t = parseInt(document.getElementById("target_input").value);
  if (!isNaN(t)) { target = t; update(); }
});

function loadData(data) {
  const score = data.batting_team_score.split('/');
  total = parseInt(score[0] || "0");
  wickets = parseInt(score[1] || "0");
  overs = parseInt(data.overs || "0");
  batsa = parseInt(data.batter_1_score || "0");
  batsb = parseInt(data.batter_2_score || "0");
  target = parseInt(data.target || "0");

  // Batter name labels (only update if element exists)
  if (document.getElementById('batsa_name')) {
    document.getElementById('batsa_name').textContent = data.batter_1_name || "BATSMAN A";
  }

  if (document.getElementById('batsb_name')) {
    document.getElementById('batsb_name').textContent = data.batter_2_name || "BATSMAN B";
  }

  update();
}

function renderPcsWarning(data) {
  const placeholder = document.getElementById('pcs-warning-placeholder');
  if (data.show_pcs_warning) {
    placeholder.innerHTML = `
      <div class="alert alert-warning text-center" role="alert" id="pcs-warning">
        <strong>PCS data received - suggest changing scoring mode</strong><br>
        Recent PCS data: ${data.pcs_total}/${data.pcs_wickets} — ${data.pcs_overs} overs
        (<span id="pcs-ago">${data.pcs_ago}</span> ago)<br>
        <small>Last update at <span id="pcs-time" data-utc="${data.pcs_last}">${new Date(data.pcs_last).toLocaleTimeString()}</span></small>
      </div>
    `;
  } else {
    placeholder.innerHTML = '';
  }
}

function refreshManualPage() {
  // Load team options
  fetch('/load_options')
    .then(res => res.json())
    .then(options => {
      const teamText = options.home_team && options.away_team
        ? (options.home_team + ' vs ' + options.away_team)
        : '';

      const teamNames = document.getElementById('team-names');
      if (teamNames) teamNames.textContent = teamText;


      const showBatsmen = options.show_batsmen !== false;

      if (!showBatsmen) {
        const b1 = document.getElementById('manual_batter_1_block');
        const b2 = document.getElementById('manual_batter_2_block');
        if (b1) b1.style.display = 'none';
        if (b2) b2.style.display = 'none';
      }


    });

  // Load current scoreboard data
  fetch('/data_manual').then(res => res.json()).then(loadData);

  // Update mode label and menu toggle text
  fetch('/priority')
    .then(res => res.json())
    .then(data => {
      currentMode = data.active_source;

      updateModeLabel(currentMode);

      const toggleLink = document.getElementById('toggle-mode-link');
      if (toggleLink) {
        toggleLink.textContent = currentMode === 'PCS'
          ? 'Switch to Manual Mode'
          : 'Switch to PCS Mode';
      }
    });

  // Render PCS warning block dynamically
  fetch('/pcs_status')
    .then(res => res.json())
    .then(data => {
      const warningContainer = document.getElementById('pcs-warning-container');
      if (!warningContainer) return;

      if (data.show_warning) {
        const timeDisplay = new Date(data.pcs_last).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        });

        warningContainer.innerHTML = `
          <div class="alert alert-warning text-center" role="alert" id="pcs-warning">
            <strong>PCS data has been received</strong><br>
            Recent PCS data: ${data.pcs_total}/${data.pcs_wickets} — ${data.pcs_overs} overs
            (<span id="pcs-ago">${data.pcs_ago}</span> ago)<br>
            <small>Last update at 
              <span id="pcs-time" data-utc="${data.pcs_last}">${timeDisplay}</span>
            </small>
          </div>`;
      } else {
        warningContainer.innerHTML = ""; // Clear warning if not needed
      }
    });
}


function editBatterName(idPrefix) {

  if (currentMode === 'PCS') {
    return pcsProtection();
  }

  const nameEl = document.getElementById(`${idPrefix}_name`);
  const inputEl = document.getElementById(`${idPrefix}_input`);
  const btnEl = document.getElementById(`${idPrefix}_edit_btn`);

  if (btnEl.textContent === 'Edit') {
    // Switch to edit mode
    inputEl.value = nameEl.textContent;
    nameEl.classList.add('hidden');
    inputEl.classList.remove('hidden');
    btnEl.textContent = 'Save';
  } else {
    // Save and switch back to display mode
    const newName = inputEl.value.trim();
    nameEl.textContent = newName || '—';
    nameEl.classList.remove('hidden');
    inputEl.classList.add('hidden');
    btnEl.textContent = 'Edit';

    // Save to server
    const key = idPrefix === 'batsa' ? 'batter_1_name' : 'batter_2_name';

    fetch('/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [key]: newName
      })
    });


  }
}

// wizards




function showMatchSettingsWizard() {
  isUserInteracting = true;
  fetch('/load_options')
    .then(response => response.json())
    .then(options => {
      const oversVal = options.overs_per_innings || '';
      const home = options.home_team || '';
      const away = options.away_team || '';
      const showBatters = options.show_batsmen === 1;

      const html = `
        <div class="manual-swal-html">
          <div class="form-group mb-3 d-flex align-items-center">
            <label class="swal2-form-label me-3">Reset all values to zero</label>
            <input type="checkbox" id="reset-everything" checked>
          </div>
          <div class="form-group mb-3">
            <label for="home-team" class="swal2-form-label">Home Team</label>
            <input id="home-team" class="swal2-input" value="${home}">
          </div>
          <div class="form-group mb-3">
            <label for="away-team" class="swal2-form-label">Away Team</label>
            <input id="away-team" class="swal2-input" value="${away}">
          </div>
          <div class="form-group mb-3">
            <label class="swal2-form-label">Overs Per Innings</label>
            <div class="overs-row">
              <div class="btn-group btn-group-sm overs-buttons" role="group">
                <button type="button" class="btn btn-sm btn-outline-light" onclick="document.getElementById('overs-custom').value='20'">20</button>
                <button type="button" class="btn btn-sm btn-outline-light" onclick="document.getElementById('overs-custom').value='35'">35</button>
                <button type="button" class="btn btn-sm btn-outline-light" onclick="document.getElementById('overs-custom').value='40'">40</button>
              </div>
              <input id="overs-custom" class="swal2-input" value="${oversVal}" />
            </div>
          </div>
          <div class="form-group mb-3 d-flex align-items-center">
            <label for="show-batters" class="swal2-form-label me-3">Show Batter Scores</label>
            <input type="checkbox" id="show-batters" ${showBatters ? 'checked' : ''}>
          </div>
          <div class="form-group mb-3">
            <label for="batter-a-name" class="swal2-form-label">Batter A Name</label>
            <input id="batter-a-name" class="swal2-input" placeholder="BATSMAN A" value="" ${!showBatters ? 'disabled' : ''}>
          </div>
          <div class="form-group mb-3">
            <label for="batter-b-name" class="swal2-form-label">Batter B Name</label>
            <input id="batter-b-name" class="swal2-input" placeholder="BATSMAN B" value="" ${!showBatters ? 'disabled' : ''}>
          </div>
        </div>
      `;

      Swal.fire({
        title: 'Start Match Setup',
        html: html,
        background: '#222',
        color: '#f5e9c9',
        reverseButtons: true,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        customClass: {
          popup: 'manual-swal-popup',
          title: 'manual-swal-title',
          htmlContainer: 'manual-swal-html',
          confirmButton: 'manual-swal-confirm',
          cancelButton: 'manual-swal-cancel'
        },
        buttonsStyling: false,
        didOpen: () => {
          document.getElementById('home-team').focus();

          const toggleBatters = () => {
            const showBatters = document.getElementById('show-batters').checked;
            document.getElementById('batter-a-name').disabled = !showBatters;
            document.getElementById('batter-b-name').disabled = !showBatters;
          };

          document.getElementById('show-batters').addEventListener('change', toggleBatters);
		  
          const batsaInput = document.getElementById('batter-a-name');
          const batsbInput = document.getElementById('batter-b-name');

          // Clear placeholder when user starts typing
          [batsaInput, batsbInput].forEach(input => {
            input.addEventListener('focus', () => {
              if (input.value === '') input.placeholder = '';
            });
            input.addEventListener('blur', () => {
              if (input.value === '') {
                input.placeholder = input.id === 'batter-a-name' ? 'BATSMAN A' : 'BATSMAN B';
              }
            });
          });

        },
        preConfirm: () => {
          const resetAll = document.getElementById('reset-everything').checked;
          const homeTeam = document.getElementById('home-team').value.trim();
          const awayTeam = document.getElementById('away-team').value.trim();
          const overs = parseInt(document.getElementById('overs-custom').value.trim()) || 0;
          const showBattersChecked = document.getElementById('show-batters').checked;
          const batterA = document.getElementById('batter-a-name').value.trim() || "BATSMAN A";
          const batterB = document.getElementById('batter-b-name').value.trim() || "BATSMAN B";

          return {
            home_team: homeTeam,
            away_team: awayTeam,
            overs_per_innings: overs,
            show_batsmen: showBattersChecked ? 1 : 0,
            reset_all: resetAll,
            batter_1_name: batterA,
            batter_2_name: batterB
          };
        }
      }).then((result) => {
        isUserInteracting = false;
        if (result.isConfirmed && result.value) {
          const { reset_all, batter_1_name, batter_2_name, ...optionsToSave } = result.value;

          if (reset_all) {
            total = 0;
            wickets = 0;
            overs = 0;
            batsa = 0;
            batsb = 0;
            target = 0;
          }

          // Save options
          fetch('/save_options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(optionsToSave)
          })
          .then(response => response.json())
          .then(() => {
            // Save batter names separately
            return fetch('/manual', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                batter_1_name: batter_1_name,
                batter_2_name: batter_2_name
              })
            });
          })
          .then(() => {
            const updatePromise = reset_all ? update() : Promise.resolve();
            return updatePromise.then(() => refreshManualPage());
          })
          .then(() => {
            Swal.fire({
              title: 'Saved!',
              text: 'Match settings have been saved.',
              icon: 'success',
              background: '#222',
              color: '#f5e9c9',
              customClass: {
                popup: 'manual-swal-popup',
                title: 'manual-swal-title',
                confirmButton: 'manual-swal-confirm'
              },
              buttonsStyling: false,
              timer: 1500,
              showConfirmButton: false
            });
          })
          .catch(error => {
            console.error('Failed to save match settings:', error);
            isUserInteracting = false;
            Swal.fire({
              title: 'Error',
              text: 'Failed to save match settings.',
              icon: 'error',
              background: '#222',
              color: '#f5e9c9',
              customClass: {
                popup: 'manual-swal-popup',
                title: 'manual-swal-title',
                confirmButton: 'manual-swal-confirm'
              },
              buttonsStyling: false
            });
          });
        }
      });
    })
    .catch(err => {
      console.error('Failed to load options for wizard:', err);
      isUserInteracting = false;
      Swal.fire({
        title: 'Error',
        text: 'Could not load current settings',
        icon: 'error',
        background: '#222',
        color: '#f5e9c9',
        customClass: {
          popup: 'manual-swal-popup',
          title: 'manual-swal-title',
          confirmButton: 'manual-swal-confirm'
        },
        buttonsStyling: false
      });
    });
}




function showZeroBatterPopup(idPrefix) {
  const isA = idPrefix === 'batsa';
  const nameLabel = isA ? 'BATSMAN A' : 'BATSMAN B';

  isUserInteracting = true;

  const html = `
    <div class="manual-swal-html">
      <div class="form-group mb-3">
        <label class="swal2-form-label d-block">Add 1 to Wickets</label>
        <div>
          <input type="checkbox" id="add-wicket" class="form-check-input" checked>
        </div>
      </div>
      <div class="form-group mb-3">
        <label for="new-batter-name" class="swal2-form-label">New Batter Name</label>
        <input id="new-batter-name" class="swal2-input" value="${nameLabel}" onfocus="if(this.value === '${nameLabel}') this.value = '';">
      </div>
      <div class="form-group mb-3">
        <label for="new-batter-score" class="swal2-form-label">New Batter Score</label>
        <input id="new-batter-score" type="number" class="swal2-input" value="0" min="0">
      </div>
    </div>
  `;

  Swal.fire({
    title: 'Batter Replacement',
    html: html,
    background: '#222',
    color: '#f5e9c9',
    reverseButtons: true,
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    customClass: {
      popup: 'manual-swal-popup',
      title: 'manual-swal-title',
      htmlContainer: 'manual-swal-html',
      confirmButton: 'manual-swal-confirm',
      cancelButton: 'manual-swal-cancel'
    },
    buttonsStyling: false,
    preConfirm: () => {
      const addWicket = document.getElementById('add-wicket').checked;
      const name = document.getElementById('new-batter-name').value.trim() || nameLabel;
      const score = parseInt(document.getElementById('new-batter-score').value.trim()) || 0;
      return { addWicket, name, score };
    }
  }).then(result => {
    isUserInteracting = false;
//    refreshManualPage();   test if this is needed, or maybe after update()

	if (result.isConfirmed && result.value) {
	  const { addWicket, name, score } = result.value;
	  const keyScore = idPrefix === 'batsa' ? 'batter_1_score' : 'batter_2_score';
	  const keyName = idPrefix === 'batsa' ? 'batter_1_name' : 'batter_2_name';

	  // Update local score and display
	  if (idPrefix === 'batsa') batsa = score;
	  else batsb = score;

	  if (addWicket) wickets += 1;

	  update();  // updates digits and posts score + wickets

      // Update the visible name instantly
      const displayId = (idPrefix === 'batsa') ? 'batsa_name' : 'batsb_name';
      document.getElementById(displayId).innerText = name;

	  // Now update the batter name via POST
	  fetch('/manual', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
		  [keyName]: name
		})
	  }).then(() => {
		refreshManualPage();
	  });
	}
  });
}



function showStartSecondInningsPopup() {
  const defaultTarget = total + 1;

  isUserInteracting = true;

  Swal.fire({
    title: 'End 1st Innings Start 2nd Innings',
    html: `
      <div class="manual-swal-html">
        <p>This will reset all scores to zero.</p>
        <div class="form-group mt-3">
          <label for="second-innings-target" class="swal2-form-label">Target Score</label>
          <input id="second-innings-target" class="swal2-input" type="number" value="${defaultTarget}" min="1">
        </div>
      </div>
    `,
    background: '#222',
    color: '#f5e9c9',
    reverseButtons: true,
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    customClass: {
      popup: 'manual-swal-popup',
      title: 'manual-swal-title',
      htmlContainer: 'manual-swal-html',
      confirmButton: 'manual-swal-confirm',
      cancelButton: 'manual-swal-cancel'
    },
    buttonsStyling: false,
    preConfirm: () => {
      const target = parseInt(document.getElementById('second-innings-target').value.trim()) || defaultTarget;
      return { target };
    }
  }).then(result => {
    isUserInteracting = false;

    if (result.isConfirmed && result.value) {
      const { target: newTarget } = result.value;

      // Reset all values
      total = 0;
      overs = 0;
      wickets = 0;
      batsa = 0;
      batsb = 0;
      target = newTarget;

      // Push new values to display and server
      update();


    }
  });
}



function showEndMatchPopup() {
  isUserInteracting = true;

  const html = `
    <div class="manual-swal-html">
      <div class="form-group mb-3">
        <label for="match-result" class="swal2-form-label">Enter Match Result Description</label>
        <textarea id="match-result" class="swal2-textarea" rows="3" placeholder="e.g. Collingbourne won by 5 wickets"></textarea>
      </div>
    </div>
  `;

  Swal.fire({
    title: 'Result to display on web scoreboard',
    html: html,
    background: '#222',
    color: '#f5e9c9',
    reverseButtons: true,
    showCancelButton: true,
    confirmButtonText: 'Save Result',
    cancelButtonText: 'Cancel',
    customClass: {
      popup: 'manual-swal-popup',
      title: 'manual-swal-title',
      htmlContainer: 'manual-swal-html',
      confirmButton: 'manual-swal-confirm',
      cancelButton: 'manual-swal-cancel'
    },
    buttonsStyling: false,
    preConfirm: () => {
      const result = document.getElementById('match-result').value.trim();
      return { result };
    }
  }).then(res => {
    isUserInteracting = false;
    if (res.isConfirmed && res.value.result) {
      fetch('/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: res.value.result })
      })
      .then(() => {
        Swal.fire({
          title: 'Result Saved',
          icon: 'success',
          background: '#222',
          color: '#f5e9c9',
          customClass: {
            popup: 'manual-swal-popup',
            title: 'manual-swal-title',
            confirmButton: 'manual-swal-confirm'
          },
          timer: 1500,
          showConfirmButton: false
        });
      })
      .catch(err => {
        console.error('Failed to save match result:', err);
        Swal.fire({
          title: 'Error',
          text: 'Could not save result.',
          icon: 'error',
          background: '#222',
          color: '#f5e9c9',
          customClass: {
            popup: 'manual-swal-popup',
            title: 'manual-swal-title',
            confirmButton: 'manual-swal-confirm'
          }
        });
      });
    }
  });
}


document.getElementById("match-settings-btn").addEventListener("click", guarded(showMatchSettingsWizard));
document.getElementById("start-2nd-innings-btn").addEventListener("click", guarded(showStartSecondInningsPopup));
document.getElementById("end-match-btn").addEventListener("click", guarded(showEndMatchPopup));




// Page refresh code

setInterval(() => {
  fetch('/pcs_status')
    .then(res => res.json())
    .then(renderPcsWarning);
}, 5000);

window.onload = function() {
  refreshManualPage();

  setInterval(() => {
    const agoEl = document.getElementById("pcs-ago");
    const timeEl = document.getElementById("pcs-time");

    if (agoEl && timeEl && timeEl.dataset.utc) {
      const pcsTimestamp = new Date(timeEl.dataset.utc);
      const now = new Date();
      const diffSec = Math.floor((now - pcsTimestamp) / 1000);
      const minutes = Math.floor(diffSec / 60);
      const seconds = diffSec % 60;
      agoEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  }, 5000);
};

window.addEventListener("focus", () => {
  console.log("Tab focused — refreshing manual page");
  refreshManualPage();
});

  // Refresh page data every 10s if user isn't interacting and in Manual mode
  setInterval(() => {
    if (!isUserInteracting && currentMode === 'Manual') {
      console.log("[DEBUG] Auto-refreshing manual page...");
      refreshManualPage();
    }
  }, 10000);






console.log("manual.js end");
