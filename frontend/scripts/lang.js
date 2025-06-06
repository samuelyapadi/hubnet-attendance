export const translations = {
  en: {
    pageTitle: "Employees List",
    backToAdmin: "← Back to Admin Dashboard",
    name: "Name",
    department: "Department",
    leaveBalance: "Leave Balance",
    edit: "Edit",
    delete: "Delete",
  },
  ja: {
    pageTitle: "従業員一覧",
    backToAdmin: "← 管理画面に戻る",
    name: "氏名",
    department: "部署",
    leaveBalance: "有給残数",
    edit: "編集",
    delete: "削除",
  }
};

let currentLang = localStorage.getItem('lang') || 'en';

export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
}

export function t(key) {
  return translations[currentLang][key] || key;
}

export function applyTranslations() {
  document.title = t('pageTitle');
  const backBtn = document.getElementById('backToAdminBtn');
  if (backBtn) backBtn.textContent = t('backToAdmin');
}
