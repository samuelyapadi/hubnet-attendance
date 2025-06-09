// lang.js (modularized by page)

const translations = {
  index: {
    en: {
      backToHome: '← Back to Home',
      login: 'Clock In/Out',
      register: 'Register',
      admin: 'Admin Dashboard',
      title: 'HUBNET Attendance',
      branding: 'HUBNET Attendance'
    },
    ja: {
      backToHome: '← ホームに戻る',
      login: '出勤・退勤',
      register: '登録',
      admin: '管理画面',
      title: 'HUBNET 勤怠システム',
      branding: 'HUBNET勤怠管理'
    }
  },

  login: {
    en: {
      title: 'Clock In/Out',
      login: 'Clock In',
      logout: 'Clock Out',
      backToHome: '← Back to Home',
      branding: 'HUBNET Attendance'
    },
    ja: {
      title: '出勤・退勤',
      login: '出勤',
      logout: '退勤',
      backToHome: '← ホームに戻る',
      branding: 'HUBNET勤怠管理'
    }
  },

  register: {
    en: {
      title: 'Register New Employee',
      name: 'Name:',
      department: 'Department:',
      joinDate: 'Join Date:',
      employmentType: 'Employment Type:',
      fullTime: 'Full-Time',
      partTime: 'Part-Time',
      weeklyDays: 'Weekly Working Days:',
      capturePhoto: 'Capture Photo',
      saveFace: 'Save Registered Face',
      backToHome: '← Back to Home',
      branding: 'HUBNET Attendance'
    },
    ja: {
      title: '新しい社員の登録',
      name: '名前:',
      department: '部署:',
      joinDate: '入社日:',
      employmentType: '雇用形態:',
      fullTime: 'フルタイム',
      partTime: 'パートタイム',
      weeklyDays: '週勤務日数:',
      capturePhoto: '写真を撮る',
      saveFace: '顔を登録',
      backToHome: '← ホームに戻る',
      branding: 'HUBNET勤怠管理'
    }
  },

employees: {
  en: {
    title: 'Employees List',
    branding: 'HUBNET Attendance',
    backToAdmin: '← Back to Admin Dashboard',
    employeesList: 'Employees List',
    startDate: 'Start Date',
    endDate: 'End Date',
    year: 'Year',
    month: 'Month',
    department: 'Department',
    name: 'Name',
    all: 'All',
    clearAll: 'Clear All',
    viewLogs: 'View Logs',
    workHours: 'Work Hours',
    totalOvertime: 'Total Overtime',
    paidLeaveLeft: 'Paid Leave Left',
    actions: 'Actions',
    edit: 'Edit',
    save: 'Save',
    delete: 'Delete'
  },
  ja: {
    title: '社員一覧',
    branding: 'HUBNET勤怠管理',
    backToAdmin: '← 管理画面に戻る',
    employeesList: '社員一覧',
    startDate: '開始日',
    endDate: '終了日',
    year: '年',
    month: '月',
    department: '部署',
    name: '名前',
    all: '全て',
    clearAll: 'リセット',
    viewLogs: '勤務記録',
    workHours: '勤務時間',
    totalOvertime: '残業合計',
    paidLeaveLeft: '有給残り',
    actions: '操作',
    edit: '編集',
    save: '保存',
    delete: '削除'
  }
}

};

export function setLanguage(lang) {
  localStorage.setItem('lang', lang);
}

export function translate(key, section = 'index') {
  const lang = localStorage.getItem('lang') || 'en';
  return translations[section]?.[lang]?.[key] || key;
}

export function applyTranslations(defaultSection = 'index') {
  const lang = localStorage.getItem('lang') || 'en';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const fullKey = el.getAttribute('data-i18n');
    const [section, key] = fullKey.includes('.') ? fullKey.split('.') : [defaultSection, fullKey];

    const translation = translations[section]?.[lang]?.[key];
    if (translation) {
      el.textContent = translation;
    }
  });
}
