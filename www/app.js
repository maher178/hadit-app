// دالة إرجاع رقم عمود اليوم حسب ترتيب جدولك:
// 0 = السبت
// 1 = الأحد
// 2 = الاثنين
// 3 = الثلاثاء
// 4 = الأربعاء
// 5 = الخميس
// 6 = الجمعة
function getCurrentDayIndex() {
  const jsDay = new Date().getDay(); // 0 = الأحد, 1 = الاثنين, ..., 6 = السبت
  // تحويل بحيث يبدأ الأسبوع من السبت = 0:
  const dayMap = {
    6: 0, // السبت
    0: 1, // الأحد
    1: 2, // الاثنين
    2: 3, // الثلاثاء
    3: 4, // الأربعاء
    4: 5, // الخميس
    5: 6  // الجمعة
  };
  return dayMap[jsDay];
}

function renderHabitsTable() {
  const tbody = document.getElementById('habitsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const logs = JSON.parse(localStorage.getItem('ht_logs_map')) || {};
  const customTasks = JSON.parse(localStorage.getItem('ht_custom_tasks')) || [];

  // المهام الأساسية
  const activeTasks = [
    { key: 'prayer', name: 'الصلاة 🕌' },
    { key: 'cal', name: 'السعرات 🥗' },
    { key: 'screentime', name: 'وقت الجوال 📱' }
  ];

  // دمج المهام الإضافية (مثل الجم)
  customTasks.forEach(t => {
    activeTasks.push({ key: t.id, name: `${t.name} 📝` });
  });

  const currentDay = getCurrentDayIndex();

  // بناء أسطر الجدول (6 أعمدة كما في تصميمك)
  activeTasks.forEach(task => {
    let row = `<tr><td class="task-title">${task.name}</td>`;
    
    // الأيام من 0 إلى 5 (أو حسب عدد الأعمدة الظاهرة في الجدول)
    for (let day = 0; day < 6; day++) {
      const logKey = `${task.key}_${day}`;
      const state = logs[logKey];

      let btnClass = 'status-btn';
      let icon = '✕';
      let isDone = (state === 'done');

      // إذا كانت المهمة منجزة
      if (isDone) {
        btnClass += ' done';
        icon = '✓';
      } else {
        btnClass += ' missed';
        icon = '✕';
      }

      // اليوم الحالي قابل للضغط دائماً
      if (day === currentDay) {
        row += `<td><button class="${btnClass}" style="cursor: pointer;" onclick="toggleTaskLog('${task.key}', ${day})">${icon}</button></td>`;
      } 
      // الأيام الأخرى مقفلة
      else {
        row += `<td><button class="${btnClass}" style="opacity: 0.5; cursor: not-allowed;" disabled>${icon}</button></td>`;
      }
    }

    row += '</tr>';
    tbody.innerHTML += row;
  });
}

// دالة التبديل عند النقر (بين الصح والخطأ)
function toggleTaskLog(taskKey, dayIndex) {
  const currentDay = getCurrentDayIndex();
  // التأكد من أن التعديل لليوم الحالي فقط
  if (dayIndex !== currentDay) return;

  const logs = JSON.parse(localStorage.getItem('ht_logs_map')) || {};
  const logKey = `${taskKey}_${dayIndex}`;

  // التبديل بين منجز وغير منجز
  if (logs[logKey] === 'done') {
    logs[logKey] = 'missed';
  } else {
    logs[logKey] = 'done';
  }

  localStorage.setItem('ht_logs_map', JSON.stringify(logs));
  renderHabitsTable();
}

// تشغيل الدالة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  renderHabitsTable();
});
