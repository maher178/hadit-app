// الصوت التنبيهي للمهام والآذان
function playTone(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'athan') {
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 2.5);
    } else {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    }
  } catch (e) { console.log('Audio not supported or waiting for user interaction'); }
}

// طلب إذن الإشعارات
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

function sendNotice(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body: body, icon: "icon.png" });
  }
}

// جدول مواقيت الصلوات الخمسة
const PRAYERS = [
  { id: 'fajr', name: 'الفجر', time: '04:55' },
  { id: 'dhuhr', name: 'الظهر', time: '12:15' },
  { id: 'asr', name: 'العصر', time: '15:35' },
  { id: 'maghrib', name: 'المغرب', time: '18:10' },
  { id: 'isha', name: 'العشاء', time: '19:40' }
];

let pendingPrayer = null;

// مراقبة الوقت للصلوات والمهام المخصصة
setInterval(() => {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dayIndex = (now.getDay() + 1) % 7; // الأسبوع يبدأ من السبت (0 = س)

  // 1. فحص الصلوات
  PRAYERS.forEach(p => {
    if (timeStr === p.time && now.getSeconds() === 0) {
      playTone('athan');
      sendNotice(`حان الآن موعد صلاة ${p.name}`, `أقم صلاتك يرحمك الله، سيظهر القسم بعد 15 دقيقة.`);
      // تجهيز نافذة القسم بعد 15 دقيقة
      setTimeout(() => {
        openPrayerOath(p.name, p.id, dayIndex);
      }, 15 * 60 * 1000);
    }
  });

  // 2. فحص المهام المضافة (+)
  const customTasks = JSON.parse(localStorage.getItem('ht_custom_tasks') || '[]');
  customTasks.forEach(task => {
    if (timeStr === task.time && now.getSeconds() === 0) {
      playTone('alarm');
      sendNotice(`تذكير مهمة: ${task.name}`, `حان الآن موعد إنجاز ${task.name}!`);
    }
  });

  // 3. مراقبة مهلة الـ 10 دقائق لوقت الجوال
  const phoneLimit = parseFloat(localStorage.getItem('ht_screentime_limit') || '0');
  const phoneSpent = parseFloat(localStorage.getItem('ht_screentime_spent') || '0');
  const phoneOverNotified = localStorage.getItem('ht_phone_over_notified');

  if (phoneLimit > 0 && phoneSpent >= phoneLimit && !phoneOverNotified) {
    localStorage.setItem('ht_phone_over_notified', 'true');
    playTone('alarm');
    sendNotice("⚠️ انتهى وقت الجوال المسموح!", "معك 10 دقائق إضافية لإنهاء ما بيدك، وإلا ستُحسب المهمة خطأ (✕) تلقائياً!");
    
    // مهلة 10 دقائق ثم التحويل لـ missed
    setTimeout(() => {
      let logs = JSON.parse(localStorage.getItem('ht_logs_map') || '{}');
      logs[`screentime_${dayIndex}`] = 'missed';
      localStorage.setItem('ht_logs_map', JSON.stringify(logs));
      renderHabitsTable();
      sendNotice("❌ تم احتساب وقت الجوال خطأ!", "تجاوزت مهلة الـ 10 دقائق الإضافية.");
    }, 10 * 60 * 1000);
  }
}, 1000);

function openPrayerOath(prayerName, prayerId, dayIndex) {
  pendingPrayer = { id: prayerId, dayIndex: dayIndex };
  document.getElementById('prayerOathText').innerText = `صلاة ${prayerName} قد أقيمت قبل 15 دقيقة. هل صليت الفرض؟`;
  document.getElementById('prayerOathModal').style.display = 'flex';
}

function triggerPrayerCheck() {
  const now = new Date();
  const dayIndex = (now.getDay() + 1) % 7;
  openPrayerOath("الحالية", "current", dayIndex);
}

function confirmPrayerOath(isDone) {
  document.getElementById('prayerOathModal').style.display = 'none';
  const now = new Date();
  const dayIndex = pendingPrayer ? pendingPrayer.dayIndex : (now.getDay() + 1) % 7;
  let prayerLogs = JSON.parse(localStorage.getItem('ht_prayer_records') || '{}');
  
  if (!prayerLogs[dayIndex]) prayerLogs[dayIndex] = [];
  prayerLogs[dayIndex].push(isDone);
  localStorage.setItem('ht_prayer_records', JSON.stringify(prayerLogs));

  let logs = JSON.parse(localStorage.getItem('ht_logs_map') || '{}');
  // شرط صارم: لا يحصل على صح إلا إذا أقسم بنعم، وإذا قال لا تصبح خطأ فورا
  if (!isDone) {
    logs[`prayer_${dayIndex}`] = 'missed';
  } else if (prayerLogs[dayIndex].filter(x => x === true).length >= 5) {
    logs[`prayer_${dayIndex}`] = 'done';
  }
  localStorage.setItem('ht_logs_map', JSON.stringify(logs));
  renderHabitsTable();
}

// رسم جدول العادات
function renderHabitsTable() {
  const tbody = document.getElementById('habitsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const logs = JSON.parse(localStorage.getItem('ht_logs_map') || '{}');
  const customTasks = JSON.parse(localStorage.getItem('ht_custom_tasks') || '[]');

  const coreTasks = [
    { key: 'prayer', name: 'الصلاة 🕌' },
    { key: 'cal', name: 'السعرات 🥗' },
    { key: 'screentime', name: 'وقت الجوال 📱' }
  ];

  const allTasks = [...coreTasks, ...customTasks.map(t => ({ key: t.id, name: `${t.name} ⏰` }))];

  allTasks.forEach(task => {
    let row = `<tr><td class="task-title">${task.name}</td>`;
    for (let day = 0; day < 6; day++) { // الأيام: س، ح، ن، ر، خ، ج
      const state = logs[`${task.key}_${day}`];
      let btnClass = 'status-btn';
      let icon = '-';
      if (state === 'done') { btnClass += ' done'; icon = '✓'; }
      if (state === 'missed') { btnClass += ' missed'; icon = '✕'; }
      row += `<td><div class="${btnClass}">${icon}</div></td>`;
    }
    row += '</tr>';
    tbody.innerHTML += row;
  });
}

function showWeeklyReport() {
  const logs = JSON.parse(localStorage.getItem('ht_logs_map') || '{}');
  let doneCount = 0;
  let missedCount = 0;

  Object.values(logs).forEach(val => {
    if (val === 'done') doneCount++;
    if (val === 'missed') missedCount++;
  });

  const total = doneCount + missedCount;
  const rate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const content = `
    • المهام المنجزة بنجاح: <b style="color: #10b981;">${doneCount}</b><br>
    • المهام التي لم تكتمل: <b style="color: #ef4444;">${missedCount}</b><br>
    • نسبة الالتزام الأسبوعي: <b style="color: #ffd166;">${rate}%</b><br><br>
    ${rate >= 80 ? '🔥 أداء أسطوري ومستمر، استمر يا بطل!' : '⚠️ تحتاج لشد حيلك في الصلاة والالتزام هذا الأسبوع.'}
  `;
  document.getElementById('reportContent').innerHTML = content;
  document.getElementById('reportModal').style.display = 'flex';
}

renderHabitsTable();
// زيادة عداد التثبيت تلقائياً عند تحميل التطبيق
window.addEventListener('appinstalled', () => {
  fetch('https://api.counterapi.dev/v1/ali_planner_app/installs/up')
    .catch(err => console.log(err));
});