// تعريف إضافة إشعارات كاباسيتور
const LocalNotifications = (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins.LocalNotifications : null;

// الصوت التنبيهي المباشر إذا كان التطبيق مفتوحاً
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
  } catch (e) { console.log('Audio error:', e); }
}

// طلب الصلاحيات وإنشاء قناة التنبيهات ذات الأولوية العالية للأندرويد
async function initNotifications() {
  if (LocalNotifications) {
    try {
      await LocalNotifications.requestPermissions();
      
      // إنشاء قناة بصوت واهتزاز عالي ليعاملها أندرويد كمنبه
      await LocalNotifications.createChannel({
        id: 'prayer-alarms',
        name: 'منبه الصلوات والمهام',
        description: 'تنبيهات بمواقيت الصلوات والمهام اليومية',
        importance: 5, // أقصى درجات الأهمية (High Priority)
        visibility: 1,
        vibration: true
      });
      
      // جدولة الصلوات للأيام القادمة
      scheduleAllPrayers();
    } catch (e) {
      console.error('Error init local notifications:', e);
    }
  } else if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

// جدول مواقيت الصلوات الخمسة
const PRAYERS = [
  { id: 1, name: 'الفجر', hour: 4, minute: 55, oathId: 'fajr' },
  { id: 2, name: 'الظهر', hour: 12, minute: 15, oathId: 'dhuhr' },
  { id: 3, name: 'العصر', hour: 15, minute: 35, oathId: 'asr' },
  { id: 4, name: 'المغرب', hour: 18, minute: 10, oathId: 'maghrib' },
  { id: 5, name: 'العشاء', hour: 19, minute: 40, oathId: 'isha' }
];

// جدولة الصلوات كمنبهات في نظام الأندرويد حتى والشاشة مقفلة
async function scheduleAllPrayers() {
  if (!LocalNotifications) return;

  const notificationsToSchedule = [];
  const now = new Date();

  PRAYERS.forEach(p => {
    let prayerDate = new Date();
    prayerDate.setHours(p.hour, p.minute, 0, 0);

    // إذا وقت الصلاة فات اليوم، جدوله للغد
    if (prayerDate <= now) {
      prayerDate.setDate(prayerDate.getDate() + 1);
    }

    notificationsToSchedule.push({
      title: `🕌 حان الآن موعد صلاة ${p.name}`,
      body: `أقم صلاتك يرحمك الله، سيظهر القسم بعد 15 دقيقة.`,
      id: p.id,
      schedule: {
        at: prayerDate,
        repeats: true,
        every: 'day',
        allowWhileIdle: true // تنبيه فوري حتى مع وضع توفير الطاقة
      },
      channelId: 'prayer-alarms'
    });
  });

  try {
    await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    console.log('تمت جدولة الصلوات بنجاح كمنبهات أندرويد!');
  } catch (err) {
    console.error('فشل جدولة الصلوات:', err);
  }
}

// دالة إرسال إشعار فوري
async function sendNotice(title, body) {
  if (LocalNotifications) {
    await LocalNotifications.schedule({
      notifications: [{
        title: title,
        body: body,
        id: Math.floor(Math.random() * 100000),
        schedule: { at: new Date(Date.now() + 100) },
        channelId: 'prayer-alarms'
      }]
    });
  } else if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body: body, icon: "icon.png" });
  }
}

// فحص الوقت اللحظي داخل التطبيق لنافذة القَسَم والمهام
let pendingPrayer = null;

setInterval(() => {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dayIndex = (now.getDay() + 1) % 7;

  // 1. فحص الصلوات للقسم التفاعلي
  PRAYERS.forEach(p => {
    const prayerTimeStr = `${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`;
    if (timeStr === prayerTimeStr && now.getSeconds() === 0) {
      playTone('athan');
      setTimeout(() => {
        openPrayerOath(p.name, p.oathId, dayIndex);
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
  const textElem = document.getElementById('prayerOathText');
  const modalElem = document.getElementById('prayerOathModal');
  if (textElem) textElem.innerText = `صلاة ${prayerName} قد أقيمت قبل 15 دقيقة. هل صليت الفرض؟`;
  if (modalElem) modalElem.style.display = 'flex';
}

function triggerPrayerCheck() {
  const now = new Date();
  const dayIndex = (now.getDay() + 1) % 7;
  openPrayerOath("الحالية", "current", dayIndex);
}

function confirmPrayerOath(isDone) {
  const modalElem = document.getElementById('prayerOathModal');
  if (modalElem) modalElem.style.display = 'none';
  const now = new Date();
  const dayIndex = pendingPrayer ? pendingPrayer.dayIndex : (now.getDay() + 1) % 7;
  let prayerLogs = JSON.parse(localStorage.getItem('ht_prayer_records') || '{}');
  
  if (!prayerLogs[dayIndex]) prayerLogs[dayIndex] = [];
  prayerLogs[dayIndex].push(isDone);
  localStorage.setItem('ht_prayer_records', JSON.stringify(prayerLogs));

  let logs = JSON.parse(localStorage.getItem('ht_logs_map') || '{}');
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
    for (let day = 0; day < 6; day++) {
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

// بدء التشغيل
renderHabitsTable();
initNotifications();

window.addEventListener('appinstalled', () => {
  fetch('https://api.counterapi.dev/v1/ali_planner_app/installs/up')
    .catch(err => console.log(err));
});