// 光盘镜像文件选择器交互逻辑
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('iso-file');
  const pickerButton = document.getElementById('btn-iso-picker');
  const filePathDisplay = document.getElementById('iso-file-path');

  // 点击自定义按钮触发文件选择
  pickerButton.addEventListener('click', () => fileInput.click());

  // 文件选择后更新显示
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const fileName = e.target.files[0].name;
      filePathDisplay.textContent = fileName;
    } else {
      filePathDisplay.textContent = '未选择任何文件';
    }
  });
});