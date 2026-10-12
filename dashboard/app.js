/* ==========================================================================
   Smart Fire Sentinel: Dashboard Logic & Telemetry Engine
   Web Serial API + Web Audio Siren + Real-time Canvas Chart
   ========================================================================== */

// --- Global State ---
const state = {
  connected: false,
  port: null,
  reader: null,
  writer: null,
  demoMode: false,
  demoInterval: null,
  audioAlarmEnabled: true,
  audioPlaying: false,
  audioContext: null,
  sirenOsc: null,
  sirenGain: null,
  
  // Telemetry buffer for chart
  history: {
    labels: [],
    temperatures: [],
    humidities: []
  },
  
  // Current values
  current: {
    flame: 0,
    temp: 25.0,
    humidity: 50.0,
    alarm: 0,
    manual: 0
  }
};

// --- DOM References ---
const elements = {
  // Connection
  connPill: document.getElementById('connection-pill'),
  connStatusText: document.getElementById('connection-status-text'),
  serialBtn: document.getElementById('serial-connect-btn'),
  serialBtnText: document.getElementById('serial-btn-text'),
  demoBtn: document.getElementById('demo-mode-btn'),
  demoBtnText: document.getElementById('demo-btn-text'),
  audioBtn: document.getElementById('audio-toggle-btn'),
  audioIcon: document.getElementById('audio-icon'),

  // Emergency Banner
  banner: document.getElementById('emergency-banner'),
  bannerTitle: document.getElementById('banner-title'),
  bannerSubtitle: document.getElementById('banner-subtitle'),
  silenceAlarmBtn: document.getElementById('silence-alarm-btn'),

  // Flame Card
  cardFlame: document.getElementById('card-flame'),
  flameIcon: document.getElementById('flame-icon'),
  flameStatusText: document.getElementById('flame-status-text'),
  flameSubtext: document.getElementById('flame-subtext'),

  // Temperature
  tempValue: document.getElementById('temp-value'),
  tempGaugeFill: document.getElementById('temp-gauge-fill'),
  tempFahrenheit: document.getElementById('temp-fahrenheit'),

  // Humidity
  humidityValue: document.getElementById('humidity-value'),
  humidityGaugeFill: document.getElementById('humidity-gauge-fill'),
  comfortLabel: document.getElementById('comfort-label'),
  dewPoint: document.getElementById('dew-point'),

  // Buzzer Actuator
  buzzerIcon: document.getElementById('buzzer-icon'),
  buzzerStateText: document.getElementById('buzzer-state-text'),
  buzzerModeText: document.getElementById('buzzer-mode-text'),
  btnForceOn: document.getElementById('btn-force-on'),
  btnForceOff: document.getElementById('btn-force-off'),
  btnAutoMode: document.getElementById('btn-auto-mode'),

  // Chart & Terminal
  canvas: document.getElementById('telemetry-chart'),
  terminal: document.getElementById('terminal-feed'),
  clearTerminalBtn: document.getElementById('clear-terminal-btn'),
  exportLogBtn: document.getElementById('export-log-btn'),
  footerPort: document.getElementById('footer-port')
};

// ==========================================================================
// 1. Web Serial Communication
// ==========================================================================

async function toggleSerialConnection() {
  if (state.connected) {
    disconnectSerial();
    return;
  }

  if (!('serial' in navigator)) {
    logToTerminal('[ERROR] Web Serial API not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera.', 'alarm');
    alert('Web Serial is only supported in Chromium-based browsers (Google Chrome, Microsoft Edge, Opera).');
    return;
  }

  try {
    logToTerminal('[SYSTEM] Requesting serial port access...');
    state.port = await navigator.serial.requestPort();
    await state.port.open({ baudRate: 115200 });

    state.connected = true;
    updateConnectionUI(true, 'Connected (115200 Baud)');
    logToTerminal('[SYSTEM] Serial port connected at 115200 baud!', 'safe');

    // Turn off demo mode if running
    if (state.demoMode) stopDemoMode();

    // Start listening
    readSerialStream();
  } catch (err) {
    console.error('Serial connection error:', err);
    logToTerminal(`[ERROR] Connection failed: ${err.message}`, 'alarm');
    updateConnectionUI(false, 'Disconnected');
  }
}

async function readSerialStream() {
  let lineBuffer = '';

  try {
    const textDecoder = new TextDecoderStream();
    state.port.readable.pipeTo(textDecoder.writable);
    state.reader = textDecoder.readable.getReader();

    while (state.connected) {
      const { value, done } = await state.reader.read();
      if (done) break;

      lineBuffer += value;
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop(); // Keep last partial line

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          handleIncomingSerialLine(trimmed);
        }
      }
    }
  } catch (err) {
    logToTerminal(`[SYSTEM] Stream closed or disconnected: ${err.message}`, 'system');
  } finally {
    disconnectSerial();
  }
}

async function sendSerialCommand(cmdChar) {
  if (state.demoMode) {
    logToTerminal(`[DEMO] Command '${cmdChar}' simulated.`);
    if (cmdChar === '1') {
      state.current.manual = 1;
      state.current.alarm = 1;
    } else if (cmdChar === '0') {
      state.current.manual = 1;
      state.current.alarm = 0;
    } else {
      state.current.manual = 0;
    }
    updateDashboardUI();
    return;
  }

  if (!state.connected || !state.port || !state.port.writable) {
    logToTerminal('[WARN] Cannot send command: ESP32 not connected.', 'alarm');
    return;
  }

  try {
    const textEncoder = new TextEncoder();
    const writer = state.port.writable.getWriter();
    await writer.write(textEncoder.encode(cmdChar));
    writer.releaseLock();
    logToTerminal(`[SENT] Command '${cmdChar}' sent to ESP32.`);
  } catch (err) {
    logToTerminal(`[ERROR] Failed to send command: ${err.message}`, 'alarm');
  }
}

async function disconnectSerial() {
  state.connected = false;
  if (state.reader) {
    try { await state.reader.cancel(); } catch (e) {}
    state.reader = null;
  }
  if (state.port) {
    try { await state.port.close(); } catch (e) {}
    state.port = null;
  }
  updateConnectionUI(false, 'Disconnected');
  logToTerminal('[SYSTEM] Serial port disconnected.', 'system');
}

function updateConnectionUI(connected, text) {
  const dot = elements.connPill.querySelector('.status-dot');
  if (connected) {
    dot.className = 'status-dot connected';
    elements.connStatusText.textContent = text;
    elements.serialBtn.className = 'btn btn-secondary';
    elements.serialBtnText.textContent = 'Disconnect ESP32';
    elements.footerPort.textContent = 'COM Active (115200)';
  } else {
    dot.className = 'status-dot disconnected';
    elements.connStatusText.textContent = 'Disconnected';
    elements.serialBtn.className = 'btn btn-primary';
    elements.serialBtnText.textContent = 'Connect ESP32 (COM)';
    elements.footerPort.textContent = 'Not Connected';
  }
}

// ==========================================================================
// 2. Incoming Telemetry Parsing
// ==========================================================================

function handleIncomingSerialLine(line) {
  // Check for JSON DATA line
  if (line.startsWith('DATA:')) {
    try {
      const jsonStr = line.substring(5);
      const data = JSON.parse(jsonStr);
      state.current.flame = data.flame || 0;
      state.current.temp = parseFloat(data.temp) || 0;
      state.current.humidity = parseFloat(data.humidity) || 0;
      state.current.alarm = data.alarm || 0;
      state.current.manual = data.manual || 0;
      updateDashboardUI();
      recordHistoryPoint(state.current.temp, state.current.humidity);
      return;
    } catch (e) {
      console.warn('JSON parse error:', e);
    }
  }

  // Fallback: parse human-readable text line
  // e.g. "Flame: [🔥 FLAME!] | Temp: 28.5°C | Hum: 55.0% | Alarm: ACTIVE"
  if (line.includes('Flame:') || line.includes('Temp:')) {
    const isFlame = line.includes('FLAME') || line.includes('YES');
    const tempMatch = line.match(/Temp:\s*([\d.]+)/i);
    const humMatch = line.match(/Hum(?:idity)?:\s*([\d.]+)/i);
    const isAlarm = line.includes('ACTIVE') || isFlame;

    state.current.flame = isFlame ? 1 : 0;
    if (tempMatch) state.current.temp = parseFloat(tempMatch[1]);
    if (humMatch) state.current.humidity = parseFloat(humMatch[1]);
    state.current.alarm = isAlarm ? 1 : 0;

    updateDashboardUI();
    recordHistoryPoint(state.current.temp, state.current.humidity);
  }

  // Log to terminal display
  logToTerminal(line, line.includes('FLAME') || line.includes('ACTIVE') ? 'alarm' : '');
}

// ==========================================================================
// 3. UI Updates & Visual Animations
// ==========================================================================

function updateDashboardUI() {
  const { flame, temp, humidity, alarm, manual } = state.current;

  // 1. Flame Status
  if (flame === 1) {
    elements.cardFlame.classList.add('alarm-state');
    elements.flameIcon.textContent = '🔥';
    elements.flameStatusText.textContent = 'FLAME DETECTED!';
    elements.flameStatusText.style.color = 'var(--accent-rose)';
    elements.flameSubtext.textContent = 'Active fire source detected within optical range';
  } else {
    elements.cardFlame.classList.remove('alarm-state');
    elements.flameIcon.textContent = '🛡️';
    elements.flameStatusText.textContent = 'CLEAR';
    elements.flameStatusText.style.color = 'var(--accent-emerald)';
    elements.flameSubtext.textContent = 'No infrared flame radiation detected';
  }

  // 2. Temperature Metric
  elements.tempValue.textContent = temp > 0 ? temp.toFixed(1) : '--';
  const fahrenheit = temp > 0 ? ((temp * 9/5) + 32).toFixed(1) : '--';
  elements.tempFahrenheit.textContent = `${fahrenheit} °F`;
  const tempPercent = Math.min(Math.max((temp / 60) * 100, 0), 100);
  elements.tempGaugeFill.style.width = `${tempPercent}%`;

  // 3. Humidity Metric
  elements.humidityValue.textContent = humidity > 0 ? humidity.toFixed(1) : '--';
  const humPercent = Math.min(Math.max(humidity, 0), 100);
  elements.humidityGaugeFill.style.width = `${humPercent}%`;

  if (humidity > 0) {
    if (humidity < 30) elements.comfortLabel.textContent = 'Dry';
    else if (humidity > 70) elements.comfortLabel.textContent = 'Humid';
    else elements.comfortLabel.textContent = 'Optimal Comfort';
    
    // Approximate Dew point
    const dew = temp - ((100 - humidity) / 5);
    elements.dewPoint.textContent = `Dew: ${dew.toFixed(1)}°C`;
  }

  // 4. Buzzer Actuator Status
  if (alarm === 1) {
    elements.buzzerIcon.textContent = '🔊';
    elements.buzzerStateText.textContent = 'ALARM ACTIVE';
    elements.buzzerStateText.style.color = 'var(--accent-rose)';
    elements.buzzerModeText.textContent = manual === 1 ? 'Manual Override (Forced ON)' : 'Triggered by Fire / Overheat';
  } else {
    elements.buzzerIcon.textContent = '🔕';
    elements.buzzerStateText.textContent = 'STANDBY';
    elements.buzzerStateText.style.color = 'var(--accent-emerald)';
    elements.buzzerModeText.textContent = manual === 1 ? 'Manual Override (Forced OFF)' : 'Automatic Sensing Mode';
  }

  // 5. Emergency Banner & Audio Siren
  if (alarm === 1) {
    elements.banner.classList.remove('hidden');
    elements.bannerTitle.textContent = flame === 1 
      ? '🚨 CRITICAL FIRE DETECTED ON GPIO 18!' 
      : '⚠️ OVERHEAT TEMPERATURE ALARM (>45°C)!';
    
    if (state.audioAlarmEnabled) startSirenAudio();
  } else {
    elements.banner.classList.add('hidden');
    stopSirenAudio();
  }
}

// ==========================================================================
// 4. Web Audio Synthesized Siren
// ==========================================================================

function initAudioContext() {
  if (!state.audioContext) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function startSirenAudio() {
  if (state.audioPlaying) return;
  initAudioContext();
  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }

  try {
    const ctx = state.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, ctx.currentTime);

    // Modulate pitch (classic ambulance/fire siren pitch ramp)
    const now = ctx.currentTime;
    for (let i = 0; i < 30; i++) {
      osc.frequency.exponentialRampToValueAtTime(950, now + i * 0.8 + 0.4);
      osc.frequency.exponentialRampToValueAtTime(650, now + i * 0.8 + 0.8);
    }

    gain.gain.setValueAtTime(0.12, ctx.currentTime); // Safe volume
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    state.sirenOsc = osc;
    state.sirenGain = gain;
    state.audioPlaying = true;
  } catch (err) {
    console.warn('Audio synthesis error:', err);
  }
}

function stopSirenAudio() {
  if (!state.audioPlaying) return;
  try {
    if (state.sirenOsc) {
      state.sirenOsc.stop();
      state.sirenOsc.disconnect();
      state.sirenOsc = null;
    }
  } catch (e) {}
  state.audioPlaying = false;
}

// ==========================================================================
// 5. Real-Time Canvas Multi-Line Chart
// ==========================================================================

function recordHistoryPoint(temp, hum) {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const maxPoints = 30;

  state.history.labels.push(timeStr);
  state.history.temperatures.push(temp);
  state.history.humidities.push(hum);

  if (state.history.labels.length > maxPoints) {
    state.history.labels.shift();
    state.history.temperatures.shift();
    state.history.humidities.shift();
  }

  drawTelemetryChart();
}

function drawTelemetryChart() {
  const canvas = elements.canvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 25, right: 30, bottom: 30, left: 45 };

  ctx.clearRect(0, 0, width, height);

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const dataLen = state.history.temperatures.length;

  if (dataLen < 2) return;

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Value label (0 to 100)
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono';
    const val = 100 - i * 25;
    ctx.fillText(`${val}`, 15, y + 3);
  }

  // Draw Line Function
  function drawLine(data, strokeColor, fillColor) {
    ctx.beginPath();
    for (let i = 0; i < dataLen; i++) {
      const x = padding.left + (plotW / (dataLen - 1)) * i;
      const val = Math.min(Math.max(data[i], 0), 100);
      const y = padding.top + plotH - (val / 100) * plotH;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fill under curve
    if (fillColor) {
      ctx.lineTo(padding.left + plotW, padding.top + plotH);
      ctx.lineTo(padding.left, padding.top + plotH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  }

  // Draw Humidity (Blue)
  const gradHum = ctx.createLinearGradient(0, padding.top, 0, height);
  gradHum.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
  gradHum.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
  drawLine(state.history.humidities, '#38bdf8', gradHum);

  // Draw Temperature (Amber)
  const gradTemp = ctx.createLinearGradient(0, padding.top, 0, height);
  gradTemp.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
  gradTemp.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
  drawLine(state.history.temperatures, '#f59e0b', gradTemp);

  // Draw 45°C Threshold Line
  const threshY = padding.top + plotH - (45 / 100) * plotH;
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, threshY);
  ctx.lineTo(width - padding.right, threshY);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ==========================================================================
// 6. Terminal Logging
// ==========================================================================

function logToTerminal(text, className = '') {
  const line = document.createElement('div');
  line.className = `terminal-line ${className}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  elements.terminal.appendChild(line);
  elements.terminal.scrollTop = elements.terminal.scrollHeight;

  // Keep max 150 lines
  if (elements.terminal.children.length > 150) {
    elements.terminal.removeChild(elements.terminal.children[0]);
  }
}

// ==========================================================================
// 7. Demo Mode Simulator
// ==========================================================================

function toggleDemoMode() {
  if (state.demoMode) {
    stopDemoMode();
  } else {
    startDemoMode();
  }
}

function startDemoMode() {
  if (state.connected) disconnectSerial();
  state.demoMode = true;
  elements.demoBtn.className = 'btn btn-primary';
  elements.demoBtnText.textContent = 'Demo Mode: ON';
  updateConnectionUI(true, 'Demo Mode Active');
  logToTerminal('[DEMO] Simulated live telemetry started.', 'system');

  let tick = 0;
  state.demoInterval = setInterval(() => {
    tick++;
    // Simulate natural ambient fluctuations
    const baseTemp = 28 + Math.sin(tick * 0.3) * 2;
    const baseHum = 52 + Math.cos(tick * 0.2) * 5;

    // Periodically simulate flame event on tick 12-16
    const simFlame = (tick % 20 >= 12 && tick % 20 <= 16) ? 1 : 0;
    const simTemp = simFlame ? baseTemp + 18 : baseTemp;
    const simAlarm = simFlame || simTemp > 45 ? 1 : 0;

    state.current.flame = simFlame;
    state.current.temp = simTemp;
    state.current.humidity = baseHum;
    state.current.alarm = state.current.manual ? state.current.alarm : simAlarm;

    updateDashboardUI();
    recordHistoryPoint(state.current.temp, state.current.humidity);
    logToTerminal(`Flame: ${simFlame ? '🔥 YES' : 'NO'} | Temp: ${simTemp.toFixed(1)}°C | Hum: ${baseHum.toFixed(1)}%`);
  }, 1500);
}

function stopDemoMode() {
  state.demoMode = false;
  if (state.demoInterval) clearInterval(state.demoInterval);
  elements.demoBtn.className = 'btn btn-secondary';
  elements.demoBtnText.textContent = 'Demo Mode: OFF';
  updateConnectionUI(false, 'Disconnected');
  logToTerminal('[DEMO] Simulated telemetry stopped.', 'system');
}

// ==========================================================================
// 8. Event Listeners & Initialization
// ==========================================================================

elements.serialBtn.addEventListener('click', toggleSerialConnection);
elements.demoBtn.addEventListener('click', toggleDemoMode);

elements.audioBtn.addEventListener('click', () => {
  state.audioAlarmEnabled = !state.audioAlarmEnabled;
  elements.audioIcon.textContent = state.audioAlarmEnabled ? '🔊' : '🔇';
  if (!state.audioAlarmEnabled) stopSirenAudio();
});

elements.silenceAlarmBtn.addEventListener('click', () => {
  sendSerialCommand('0');
  stopSirenAudio();
});

elements.btnForceOn.addEventListener('click', () => sendSerialCommand('1'));
elements.btnForceOff.addEventListener('click', () => sendSerialCommand('0'));
elements.btnAutoMode.addEventListener('click', () => sendSerialCommand('a'));

elements.clearTerminalBtn.addEventListener('click', () => {
  elements.terminal.innerHTML = '<div class="terminal-line system">[SYSTEM] Terminal logs cleared.</div>';
});

elements.exportLogBtn.addEventListener('click', () => {
  const text = Array.from(elements.terminal.children).map(c => c.textContent).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fire_sentinel_log_${Date.now()}.txt`;
  a.click();
});

// Initial canvas draw
window.addEventListener('load', () => {
  // Prepopulate initial baseline history
  for (let i = 0; i < 10; i++) {
    state.history.labels.push(`-00:${(10 - i) * 2}s`);
    state.history.temperatures.push(26.5);
    state.history.humidities.push(52.0);
  }
  drawTelemetryChart();
});
