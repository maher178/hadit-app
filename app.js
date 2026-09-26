// رسم جدول العادات
function renderHabitsTable() {
  const tbody = document.getElementById('habitsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const logs = JSON.parse(localStorage.getItem('ht_logs_map') || '{}');
  const customTasks = JSON.parse(localStorage.getItem('ht_custom_tasks') || '[]');

  // 1. الصلاة أساسية دائماً (تلقائية)
  const activeTasks = [
    { key: 'prayer', name: 'الصلاة 🕌', isCore: true }
  ];

  // 2. تفعيل السعرات فقط إذا وضع المستخدم هدفاً لها
  if (localStorage.getItem('ht_cal_target')) {
    activeTasks.push({ key: 'cal', name: 'السعرات 🥗', isCore: true });
  }

  // 3. تفعيل وقت الجوال فقط إذا وضع المستخدم حداً للاستخدام
  if (localStorage.getItem('ht_screentime_limit')) {
    activeTasks.push({ key: 'screentime', name: 'وقت الجوال 📱', isCore: true });
  }

  // 4. المهام الإضافية (+) تكون تفاعلية بالضغط اليدوي
  customTasks.forEach(t => {
    activeTasks.push({ key: t.id, name: `${t.name} ⏰`, isCore: false });
  });

  // بناء أسطر الجدول
  activeTasks.forEach(task => {
    let row = `<tr><td class="task-title">${task.name}</td>`;
    for (let day = 0; day < 6; day++) {
      const state = logs[`${task.key}_${day}`];
      let btnClass = 'status-btn';
      let icon = '-';
      if (state === 'done') { btnClass += ' done'; icon = '✓'; }
      if (state === 'missed') { btnClass += ' missed'; icon = '✕'; }

      if (!task.isCore) {
        // المهام المضافة تقبل الضغط اليدوي لوضع صح أو خطأ
        row += `<td><button class="${btnClass}" style="cursor: pointer;" onclick="toggleCustomTaskStatus('${task.key}', ${day})">${icon}</button></td>`;
      } else {
        // المهام الأساسية (الصلاة، السعرات، الجوال) تتغير تلقائياً فقط
        row += `<td><div class="${btnClass}" title="مهمة تلقائية">${icon}</div></td>`;
      }
    }
    row += '</tr>';
    tbody.innerHTML += row;
  });
}
