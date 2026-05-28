let selectedAngle = 3;
let inputMode = 'angle'; // 'angle' | 'vs'

// ── Mode toggle ──────────────────────────────────────────────
function setMode(mode) {
  inputMode = mode;
  document.getElementById('modeAngle').classList.toggle('active', mode === 'angle');
  document.getElementById('modeVS').classList.toggle('active',    mode === 'vs');
  document.getElementById('panelAngle').style.display = mode === 'angle' ? 'block' : 'none';
  document.getElementById('panelVS').style.display    = mode === 'vs'    ? 'block' : 'none';
}

// ── Angle preset buttons ─────────────────────────────────────
document.querySelectorAll('#panelAngle .angle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#panelAngle .angle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const val = btn.dataset.angle;
    const customWrap = document.getElementById('customAngleWrap');

    if (val === 'custom') {
      customWrap.style.display = 'block';
      selectedAngle = parseFloat(document.getElementById('customAngle').value) || 3;
    } else {
      customWrap.style.display = 'none';
      selectedAngle = parseFloat(val);
    }
  });
});

document.getElementById('customAngle').addEventListener('input', e => {
  selectedAngle = parseFloat(e.target.value) || 3;
});

// ── V/S preset buttons ───────────────────────────────────────
document.querySelectorAll('#panelVS .angle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#panelVS .angle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('desiredVS').value = btn.dataset.vs;
  });
});

// ── Helpers ──────────────────────────────────────────────────
function fmt(n, decimals = 0) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function setStatus(type, msg) {
  const el = document.getElementById('statusBar');
  el.className = `status ${type}`;
  el.textContent = msg;
}

// ── Main calculate ───────────────────────────────────────────
function calculate() {
  const currentAlt = parseFloat(document.getElementById('currentAlt').value);
  const targetAlt  = parseFloat(document.getElementById('targetAlt').value);
  const gs         = parseFloat(document.getElementById('groundSpeed').value);
  const distRaw    = document.getElementById('distToDest').value;
  const distToDest = distRaw !== '' ? parseFloat(distRaw) : null;

  // Common validation
  if (isNaN(currentAlt) || isNaN(targetAlt) || isNaN(gs)) {
    alert('Please fill in Current Altitude, Target Altitude, and Ground Speed.');
    return;
  }
  if (currentAlt <= targetAlt) {
    alert('Current altitude must be higher than target altitude.');
    return;
  }
  if (gs <= 0) {
    alert('Ground speed must be greater than 0.');
    return;
  }

  const altDiff = currentAlt - targetAlt;
  let angle, angleRad, vs, todDist, nmPer1k, timeMin;

  if (inputMode === 'angle') {
    // Angle → derive VS & TOD
    angle    = selectedAngle;
    angleRad = angle * Math.PI / 180;
    // NM per 1,000 ft: dist_NM = 1000 / (tan(angle) × 6076.12 ft/NM)
    nmPer1k  = 1000 / (Math.tan(angleRad) * 6076.12);
    todDist  = (altDiff / 1000) * nmPer1k;
    vs       = gs * 101.27 * Math.tan(angleRad); // ft/min
    timeMin  = altDiff / vs;

  } else {
    // V/S → derive angle & TOD
    vs = parseFloat(document.getElementById('desiredVS').value);
    if (isNaN(vs) || vs <= 0) {
      alert('Please enter a valid Vertical Speed (fpm).');
      return;
    }
    // time (min) = altDiff / vs
    // dist  (NM) = GS (kts) × time (min) / 60
    timeMin  = altDiff / vs;
    todDist  = gs * timeMin / 60;
    nmPer1k  = todDist / (altDiff / 1000);
    // angle = atan( vs / (GS × 101.27) )
    angleRad = Math.atan(vs / (gs * 101.27));
    angle    = angleRad * 180 / Math.PI;
  }

  // Show results
  document.getElementById('placeholder').style.display    = 'none';
  document.getElementById('resultsContent').style.display = 'block';

  document.getElementById('rTOD').textContent        = fmt(todDist, 1);
  document.getElementById('rVS').textContent         = fmt(vs, 0);
  document.getElementById('rTime').textContent       = fmt(timeMin, 1);
  document.getElementById('rAltLose').textContent    = fmt(altDiff, 0);
  document.getElementById('rAngle').textContent      = fmt(angle, 2) + '°';
  document.getElementById('rRatePer1k').textContent  = fmt(nmPer1k, 2);

  // Status: compare to distance to destination if given
  const statusBar = document.getElementById('statusBar');
  if (distToDest !== null && !isNaN(distToDest)) {
    const diff = distToDest - todDist;
    if (diff > 5) {
      setStatus('ok',    `✓ You have ${fmt(diff, 1)} NM before you need to start descending.`);
    } else if (diff >= 0) {
      setStatus('warn',  `⚠ Start descending soon — only ${fmt(diff, 1)} NM of cruise left.`);
    } else {
      setStatus('error', `✗ You are ${fmt(Math.abs(diff), 1)} NM past your Top of Descent! Increase VS or angle.`);
    }
    statusBar.classList.remove('hidden');
  } else {
    statusBar.classList.add('hidden');
  }
}

// Allow Enter key to trigger calculate
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') calculate();
});
