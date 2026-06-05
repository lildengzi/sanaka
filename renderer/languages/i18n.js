// i18n.js - 国际化文本加载与替换脚本

// 假设语言文件路径为 Lang.json
const LANG_FILE_PATH = './languages/zh-CN.json';

/**
 * 递归获取 JSON 对象中的值
 * @param {object} obj - JSON 对象
 * @param {string} path - 键路径，例如 "card.base.label.os_template"
 * @returns {string | undefined}
 */
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

/**
 * 加载语言文件并替换 DOM 中的文本
 */
const loadAndApplyLanguage = async () => {
    try {
        const response = await fetch(LANG_FILE_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load language file: ${response.statusText}`);
        }
        const langData = await response.json();

        // 1. 替换 data-i18n 属性的文本内容 (textContent)
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const value = getNestedValue(langData, key);
            if (value !== undefined) {
                el.textContent = value;
            } else {
                console.warn(`Missing translation key for text content: ${key}`);
            }
        });

        // 2. 替换 data-i18n-* 属性的值 (placeholder, title, alt, label, etc.)
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const value = getNestedValue(langData, key);
            if (value !== undefined) {
                el.setAttribute('placeholder', value);
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const value = getNestedValue(langData, key);
            if (value !== undefined) {
                el.setAttribute('title', value);
            }
        });

        document.querySelectorAll('[data-i18n-label]').forEach(el => {
            const key = el.getAttribute('data-i18n-label');
            const value = getNestedValue(langData, key);
            if (value !== undefined) {
                el.setAttribute('aria-label', value);
            }
        });
        
        document.querySelectorAll('[data-i18n-alt]').forEach(el => {
            const key = el.getAttribute('data-i18n-alt');
            const value = getNestedValue(langData, key);
            if (value !== undefined) {
                el.setAttribute('alt', value);
            }
        });


    } catch (error) {
        console.error('Internationalization failed:', error);
    }
};

// 确保 DOM 加载完毕后再执行替换
document.addEventListener('DOMContentLoaded', loadAndApplyLanguage);

