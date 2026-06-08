Unicode true
Name "Sanaka Tools"
OutFile "..\dist\setup.exe"
InstallDir "$PROGRAMFILES\Sanaka Tools"
RequestExecutionLevel user
XPStyle on

; Modern UI 2
!include "MUI2.nsh"

; ------ Theme: nsis3-metro ------
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Header\nsis3-metro.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP_RIGHT "${NSISDIR}\Contrib\Graphics\Header\nsis3-metro-right.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\nsis3-metro.bmp"

; Icons
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install-colorful.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall-colorful.ico"

; Abort warning
!define MUI_ABORTWARNING

; Pages - fixed install path (no directory page)
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "gpl-2.0.txt"
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  File "..\dist\sanaka_clipboard.exe"
  File "..\config\sanaka-clipboard.ini"
  File "..\LICENSE.txt"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SanakaClipboard" '"$INSTDIR\sanaka_clipboard.exe"'
  CreateDirectory "$SMPROGRAMS\Sanaka Tools"
  CreateShortCut "$SMPROGRAMS\Sanaka Tools\Sanaka Clipboard.lnk" "$INSTDIR\sanaka_clipboard.exe"

  DetailPrint "Sanaka Tools installed."
  DetailPrint "Clipboard client: $INSTDIR\sanaka_clipboard.exe"
  DetailPrint "Config: $INSTDIR\sanaka-clipboard.ini"

  Exec '"$INSTDIR\sanaka_clipboard.exe"'
SectionEnd
