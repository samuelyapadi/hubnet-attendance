const translations = {
  en: {
    employeesList: "Employees List",
    backToAdmin: "← Back to Admin Dashboard",
    startDate: "Start Date",
    endDate: "End Date",
    year: "Year",
    month: "Month",
    department: "Department",
    name: "Name",
    all: "All",
    clearAll: "Clear All",
    workHours: "Work Hours",
    totalOvertime: "Total Overtime",
    paidLeaveLeft: "Paid Leave Left",
    actions: "Actions",
    viewLogs: "View Logs",
    edit: "Edit",
    save: "Save",
    delete: "Delete",
    pageTitle: "HUBNET Attendance System",
    welcome: "HUBNET Attendance System",
    loginBtn: "👤 Clock In",
    registerBtn: "📝 Register",
    adminBtn: "🛠 Admin Dashboard",
    clockInOut: '👤 Clock In / Out'
  },
  ja: {
    employeesList: "社員一覧",
    backToAdmin: "← 管理者ダッシュボードへ戻る",
    startDate: "開始日",
    endDate: "終了日",
    year: "年",
    month: "月",
    department: "部署",
    name: "名前",
    all: "すべて",
    clearAll: "全てクリア",
    workHours: "勤務時間",
    totalOvertime: "残業合計",
    paidLeaveLeft: "有給残り",
    actions: "操作",
    viewLogs: "ログを見る",
    edit: "編集",
    save: "保存",
    delete: "削除",
    pageTitle: "HUBNET勤怠管理システム",
    welcome: "HUBNET勤怠管理システム",
    loginBtn: "👤 出勤",
    registerBtn: "📝 登録",
    adminBtn: "🛠 管理画面",
    clockInOut: '👤 出勤 / 退勤'
  }
};

let currentLang = localStorage.getItem('lang') || 'en';

export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
}

export function translate(key) {
  return translations[currentLang]?.[key] || key;
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = translate(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = translated;
    } else {
      el.textContent = translated;
    }
  });
}
