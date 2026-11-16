; Digital Ink per-user Windows installer. Built in GitHub Actions with Inno Setup 6.
; Binary lives in bin/ and the offline web UI in web/; user notes stay in
; %LOCALAPPDATA%/DigitalInk/BrowserProfile even when the app is uninstalled.
#ifndef AppVersion
  #define AppVersion "1.2.0"
#endif

[Setup]
AppId={{9E6B8859-93D0-4B08-A705-D05837652B65}
AppName=Digital Ink
AppVerName=Digital Ink {#AppVersion}
AppVersion={#AppVersion}
AppPublisher=Hades
AppPublisherURL=https://github.com/iAlirezaaa/typing-machine
AppSupportURL=https://github.com/iAlirezaaa/typing-machine/issues
AppUpdatesURL=https://github.com/iAlirezaaa/typing-machine/releases
DefaultDirName={localappdata}\Programs\Digital Ink
DefaultGroupName=Digital Ink
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableProgramGroupPage=yes
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\bin\DigitalInk.exe
WizardStyle=modern
SetupIconFile=windows\icon.ico
OutputDir=artifacts
OutputBaseFilename=DigitalInk-Setup-{#AppVersion}-x64
SourceDir=..
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: unchecked
Name: "autostart"; Description: "Start Digital Ink automatically when I sign in to Windows"; GroupDescription: "Startup:"; Flags: unchecked

[Files]
Source: "build\DigitalInk\*"; DestDir: "{app}\bin"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "dist\*"; DestDir: "{app}\web"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{userprograms}\Digital Ink"; Filename: "{app}\bin\DigitalInk.exe"; IconFilename: "{app}\bin\DigitalInk.exe"
Name: "{userdesktop}\Digital Ink"; Filename: "{app}\bin\DigitalInk.exe"; Tasks: desktopicon
Name: "{userstartup}\Digital Ink"; Filename: "{app}\bin\DigitalInk.exe"; Tasks: autostart
Name: "{userprograms}\Uninstall Digital Ink"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\bin\DigitalInk.exe"; Description: "Launch Digital Ink now"; Flags: nowait postinstall skipifsilent
