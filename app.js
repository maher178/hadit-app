// دالة إرجاع رقم اليوم الحالي (0 إلى 5 أو 6)
function getCurrentDayIndex() {
  const day = new Date().getDay(); // 0 = الأحد, 6 = السبت
  return day;
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

  // دمج المهام الإضافية إن وجدت
  customTasks.forEach(t => {
    activeTasks.push({ key: t.id, name: `${t.name} 📝` });
  });

  const currentDay = getCurrentDayIndex();

  // بناء أسطر الجدول
  activeTasks.forEach(task => {
    let row = `<tr><td class="task-title">${task.name}</td>`;
    
    for (let day = 0; day < 6; day++) {
      const logKey = `${task.key}_${day}`;
      const state = logs[logKey];

      let btnClass = 'status-btn';
      let icon = '-';
      let isDisabled = false;

      // أيام سابقة: إذا لم تكتمل تعتبر فائتة
      if (day < currentDay) {
        if (state === 'done') {
          btnClass += ' done';
          icon = '✓';
        } else {
          btnClass += ' missed';
          icon = '✕';
        }
        isDisabled = true; // انتهت فرصة التعديل لليوم السابق
      } 
      // اليوم الحالي: يبدأ خطأ ولديه فرصة للضغط حتى 12 بالليل
      else if (day === currentDay) {
        if (state === 'done') {
          btnClass += ' done';
          icon = '✓';
        } else {
          btnClass += ' missed';
          icon = '✕'; // تبدأ بخطأ حتى يضغط عليها
        }
        isDisabled = false; // قابلة للضغط
      } 
      // أيام قادمة
      else {
        icon = '-';
        isDisabled = true;
      }

      // إنشاء الزر التفاعلي
      if (isDisabled) {
        row += `<td><button class="${btnClass}" style="opacity: 0.6; cursor: not-allowed;" disabled>${icon}</button></td>`;
      } else {
        row += `<td><button class="${btnClass}" style="cursor: pointer;" onclick="toggleTaskLog('${task.key}', ${day})">${icon}</button></td>`;
      }
    }

    row += '</tr>';
    tbody.innerHTML += row;
  });
}

// دالة التبديل عند النقر (بين الصح والخطأ)
function toggleTaskLog(taskKey, dayIndex) {
  const currentDay = getCurrentDayIndex();
  if (dayIndex !== currentDay) return; // التعديل لليوم الحالي فقط

  const logs = JSON.parse(localStorage.getItem('ht_logs_map')) || {};
  const logKey = `${taskKey}_${dayIndex}`;

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
