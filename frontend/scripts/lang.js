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
      backToAdmin: '← Back to Admin Dashboard',
      branding: 'HUBNET Attendance'
      // Add more keys as needed
    },
    ja: {
      title: '社員一覧',
      backToAdmin: '← 管理画面に戻る',
      branding: 'HUBNET勤怠管理'
      // Add more keys as needed
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

export function applyTranslations(section = 'index') {
  const lang = localStorage.getItem('lang') || 'en';
  const sectionTranslations = translations[section]?.[lang];
  if (!sectionTranslations) return;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (sectionTranslations[key]) {
      el.textContent = sectionTranslations[key];
    }
  });
}
