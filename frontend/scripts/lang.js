// lang.js (modularized by page)
import { employeeDetailsLang } from './employee-details.lang.js';

const translations = {
  "employee-details": employeeDetailsLang,
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
      delete: 'Delete',
      selectDeptNotice: '⚠️ Please select a department to view employee data.'
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
      delete: '削除',
      selectDeptNotice: '⚠️ 部署を選択してください（社員データを表示するには必要です）'
    }
  },

  admin: {
  en: {
    title: 'Admin Panel – Currently Logged-In Employees',
    branding: 'HUBNET Attendance',
    employeeList: 'Employees List',
    leaveManagement: '+ Input Work / Leave',
    activeSessions: 'Current Active Sessions',
    sortByDept: 'Sort by Department:',
    all: 'All',
    name: 'Name',
    department: 'Department',
    checkInTime: 'Check-In Time',
    backToHome: '← Back to Home',
    manualInputTitle: 'Input Work / Leave',
    employee: 'Employee:',
    checkIn: 'Check-In:',
    checkOut: 'Check-Out:',
    type: 'Type:',
    work: 'Work',
    paidLeave: 'Paid Leave',
    unpaidLeave: 'Unpaid Leave',
    submit: 'Submit',
    cancel: 'Cancel',
    exportStart: 'Start Date:',
    exportEnd: 'End Date:',
    exportDept: 'Department:',
    exportExcel: '📥 Export Excel'
  },
  ja: {
    title: '管理画面 – 現在出勤中の社員',
    branding: 'HUBNET勤怠管理',
    employeeList: '社員リスト',
    leaveManagement: '勤務・休暇を入力',
    activeSessions: '現在の出勤状況',
    sortByDept: '部署で並び替え:',
    all: '全て',
    name: '名前',
    department: '部署',
    checkInTime: '出勤時間',
    backToHome: '← ホームに戻る',
    manualInputTitle: '勤務・休暇の入力',
    employee: '社員:',
    checkIn: '出勤:',
    checkOut: '退勤:',
    type: '種別:',
    work: '勤務',
    paidLeave: '有給休暇',
    unpaidLeave: '無給休暇',
    submit: '送信',
    cancel: 'キャンセル',
    exportStart: '開始日:',
    exportEnd: '終了日:',
    exportDept: '部署:',
    exportExcel: '📥 エクセル出力'
  }
}
};

export function setLanguage(lang) {
  localStorage.setItem('lang', lang);
}

export function registerTranslations(section, obj) {
  translations[section] = obj;
}

export function translate(key, section = 'index') {
  const lang = localStorage.getItem('lang') || 'en';
  const keys = key.split('.');
  let value = translations[section]?.[lang];

  for (const k of keys) {
    if (!value) return key;
    value = value[k];
  }

  return value || key;
}

export function applyTranslations(defaultSection = 'index') {
  const lang = localStorage.getItem('lang') || 'en';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const fullKey = el.getAttribute('data-i18n');

    let section = defaultSection;
    let key = fullKey;

    if (fullKey.includes('.')) {
      const parts = fullKey.split('.');
      section = parts[0];
      key = parts.slice(1).join('.');
    }

    const keys = key.split('.');
    let value = translations[section]?.[lang];

    for (const k of keys) {
      if (!value) break;
      value = value[k];
    }

    if (value) el.textContent = value;
  });
}
