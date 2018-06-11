# FuncList
Retrieves functions, symbols, bookmarks from text or source files and lists references in a side editor. Clicking a references will reveal the corresponding position in text or source file.

**New version with bugfixes and additional sort option**  
-> [History](#history) 

### Short Test Drive
- open a C source file  
  see [Examples](#examples) for different file settings
- select `F1 > Show Functions`
- a side editor opens and shows a reference list
- click a reference

![funclist in action](images/funcList.gif)

# Settings
__.vscode/settings.json__

    "funcList.nativeFilter": "",
    "funcList.displayFilter": "",
    "funcList.sortList": 1,
    "funcList.doubleSpacing": false

`nativeFilter`  
regular expression to match functions, symbols, bookmarks  
_(nativeFilter does not allow regEx groups)_

`displayFilter`  
regular expression to trim matches of nativeFilter for clean display  
_(displayFilter allows regEx groups 0-9 in options, see examples)_

`sortList`  
0 = unsorted, order of appearance (appear)  
1 = sorted, ignore case (nocase)  
2 = sorted, obey case (case)

`doubleSpacing`  
extended space in symbol list  
false = off  
true = on

# Examples
### TypeScript Filter

    "funcList.nativeFilter": "/(?:^|\\s)function\\s+\\w+\\(/mg"

`function encodeLocation(`  
`function dispose(`  
simple functions will be found

    "funcList.displayFilter": "/\\s*function\\s+(\\w+)/1"

`encodeLocation`  
`dispose`  
function names without keyword and opening bracket will be displayed  

_(Thanks to Avol-V)_

### Simple C Function Filter

    "funcList.nativeFilter": "/^[a-z]+\\s+\\w+\\(/mgi"

`int main(`  
`void initSerial(`  
simple function headers will be found

    "funcList.displayFilter": "/\\S* +(\\w+)/1"

`main`  
`initSerial`  
function names without return value and opening bracket will be displayed

### Assembler Target Filter

    "funcList.nativeFilter": "/^\\w+:\\s*$/mg"

`encodeByte:`  
`doSleep:`  
standalone targets on beginning of lines are found

`mar01: mov r0,r1`  
`abc17: ;comment`  
targets with following instruction or comment are not found

    "funcList.displayFilter": "/\\w+/"
    
`encodeByte`  
`doSleep`  
targets are listed without colon or trailing spaces

### PowerShell Function Filter

"funcList.nativeFilter": "/function\\s+\\w+-?\\w*\\s*{/img"  
"funcList.displayFilter": "/function\\s+(\\w+-?\\w*)/1i"

_(Thanks to Paradox355)_

### Bookmark Filter

    "funcList.nativeFilter": "/^bookmark .+$/mg"

`bookmark my mark 123`  
`bookmark huubaBooba`  
or similar will be found

    "funcList.displayFilter": "/\\w+\\s+(.*\\w)/1"

`my mark 123`  
`huubaBooba`  
will be listed

# Hints
- reference lists contribute two context menu entries  
  _'Switch Sort'_ for switching sort mode  
  _'Refresh'_ for manual refreshing the reference list
- reference list tab names are surrounded by brackets
- reference lists are read only and can't be saved
- multiple found references are marked with bracketed numbers  
  selectable with consecutive clicks  
- source files can have multiple reference lists  
  slanted tab names indicate temporary lists  
  double click tabs to make them resident

# History
- __V0.5__  
  based on document content provider  
  reference lists are read only and have to be closed and reopened for refresh and therefore loose user set width 
- __V0.6__  
  based on untitled file scheme  
  reference lists are editable and refresh keeps user set width
- __V0.6.1__  
  strip CR/LF from native filter to resolve [Issue 1](https://github.com/qrti/funcList/issues/1)  
  example for TypeScript filter  
  revised examples
- __V7.0.0__  
  back to (improved) document content provider  
  reference lists are read only and keep user set width  
  no side effects when closing document or vscode  

- __V7.1.0__  
  new option 'doubleSpacing' -> [Settings](#settings)  
  fixed CR/LF bug for Unix/Linux/MacOS documents, addresses again [Issue 1](https://github.com/qrti/funcList/issues/1)

- __V7.1.1__  
  new example filter for PowerShell functions -> [Examples](#powershell-function-filter)

- __V7.2.1__  
  new sort options -> [Settings](#settings)  
  linux/mac path bug fix  
  corrected symbol match

# How to run locally
- `npm run compile`  
to start the compiler in watch mode
- open this folder in vsCode and press `F5`
