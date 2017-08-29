// funcList extension for vsCode V0.6 by qrt@qland.de 170829
//
// V0.5     initial
// V0.6     regular TextDocument -> refreshable without closing -> keeps width
//
// todo:
// - block source doc positioning on target refresh, only possible by catching mouse events
// - target readonly 

'use strict';

import * as vscode from 'vscode';
import { workspace, window, Disposable, Uri, Position } from 'vscode';
import FunctionsDocument from './functionsDocument';

export default class Provider           
{
	static scheme = 'untitled';

    private _funcDocs = new Map<string, FunctionsDocument>();
    private _timer = new Timer();    
    private _subscriptions: Disposable[] = [];
    private _disposable: Disposable;

    private _lastHit: { editor: vscode.TextEditor, native: string, lineIndex: number } = 
                      { editor: null,              native: null,   lineIndex: 0 };

    constructor() 
    {
        // workspace.onDidChangeTextDocument(change => this._onDidChangeTextDocument(change), this, this._subscriptions);
        window.onDidChangeTextEditorSelection(change => this._onDidChangeTextEditorSelection(change), this, this._subscriptions);                            
        workspace.onDidCloseTextDocument(doc => this._funcDocs.delete(doc.uri.toString()), this, this._subscriptions);      // fires several minutes after closing document
        
        this._disposable = Disposable.from(...(this._subscriptions));
    }

    public dispose() 
    {
        this._disposable.dispose();
		this._funcDocs.clear();
	}
        
    // private _onDidChangeTextDocument(change: vscode.TextDocumentChangeEvent) 
    // {
    // }

    private _onDidChangeTextEditorSelection(change: vscode.TextEditorSelectionChangeEvent) 
    {    
        let editor = change.textEditor;                                                 // get active editor

        if(editor.document.isUntitled && editor.document.fileName.endsWith(')'))        // funcList files only 
            if(!this._timer.timeLeft())                                                 // last timer ready?
                this._timer.start(() => this.posSourceSelTarget(editor), 50, 100);      // delay, block
    }

    private posSourceSelTarget(editor)
    {
        let sourceFsPath = this.decodeFsPath(editor.document.uri);              // get original source fsPath from target uri.query

        // find current sourceEditor for original source fsPath, 
        // the original sourceEditor gets unvalid every time it loses focus
        let sourceEditor = window.visibleTextEditors.find(editor => editor.document.uri.fsPath === sourceFsPath);

        if(sourceEditor){                                                       // invalid or disposed?  
            let symbolIndex = editor.selection.start.line - 2;                  // index of symbol, -2 on lines 0 and 1
            
            if(symbolIndex < 0)                                                 // no source document positioning
                return;                                                         // after updateDocument or line 0 or 1 click

            let funcDoc = this._funcDocs.get(editor.document.uri.toString());   // stored target document value
            let native = funcDoc.getNative(symbolIndex);                        // get native symbol string

            let chars = { '(':'\\(', ')':'\\)', '[':'\\[' };                    // replacement pairs, name:value
            let filter = native.replace(/[()[]/g, m => chars[m]);               // replace /[names]/globaly through values
            
            let docContent = sourceEditor.document.getText();                   // get source document content
            let sourceLines = docContent.split("\r\n");                         // split lines
            let lines: number[] = [];                                           // prepare match lines number array
            
            sourceLines.forEach((line, i) => {                                  // iterate through sourceLines
                if(line.match(filter))                                          // if match 
                    lines.push(i);                                              // add line number
            });
            
            let hit = this._lastHit;                                            // last hit shortcut        

            if(lines){                                                          // any lines?
                let lineIndex = 0;                                              // assume first match in lines

                if(hit.editor==sourceEditor && hit.native==native && hit.lineIndex<lines.length){   // same editor, same match, hit index in range
                    lineIndex = hit.lineIndex++;                                // take index, increment hit index
                }
                else{
                    hit.editor = sourceEditor;                                  // update hit object
                    hit.native = native;
                    hit.lineIndex = 1;
                }                        

                let sourceLine = lines[lineIndex];                              // get source line number

                let posSel = new vscode.Position(sourceLine, 0);                // prepare selection and range in source
                let selection = new vscode.Selection(posSel, posSel);
                let posStart = new vscode.Position(sourceLine-10<0 ? 0 : sourceLine-10, 0);
                let posEnd = new vscode.Position(Number.MAX_SAFE_INTEGER, 0);
                let range = new vscode.Range(posStart, posEnd);

                var cSel = editor.selection;                                    // prepare selection in target
                var nSelStart = new vscode.Position(cSel.start.line, 0);
                var nSelEnd = new vscode.Position(cSel.end.line, 99);
                var nSel = new vscode.Selection(nSelStart, nSelEnd);
                editor.selection = nSel;                                        // set selection, triggers a new onDidChangeTextEditorSelection event   
                
                sourceEditor.revealRange(range);                                // set range
                sourceEditor.selection = selection;                             // set selection, triggers a new onDidChangeTextEditorSelection event                 
            }
        }
    }

    // command palette 'Function List', context menu 'Switch Sort' + 'Refresh' 
    //
    public newDocument(editor)
    {                
        if(editor.document.isUntitled && editor.document.fileName.endsWith(')')){                           // existing funcList file?                                    
        }
        else{                                                                                               // source editor
            const target_uri = encodeLocation(editor.document.uri, editor.selection.active);                // encode traget uri
            let sourceDoc = editor.document;                                                                // source document

            let target_editor = workspace.openTextDocument(target_uri).then(targetDoc => {                  // open new TextDocument as target                     
                let funcDoc = new FunctionsDocument(sourceDoc, targetDoc);                                  // instantiate new funcDoc
                this._funcDocs.set(target_uri.toString(), funcDoc);                                         // add new funcDoc to funcDocs                                                            
                window.showTextDocument(targetDoc, editor.viewColumn + 1);                                  // show new TextDocument                
            });
        }

        return editor;
    }
    
    public updateDocument(editor, edit, sortSwitch)
    {                
        if(editor.document.isUntitled && editor.document.fileName.endsWith(')')){                           // existing funcList file?                                    
            if(sortSwitch == null)                                                                          // called from command palette?
                return null;                                                                                // yes, break
            
            let sourceFsPath = this.decodeFsPath(window.activeTextEditor.document.uri);                     // get original source fsPath from target uri.query
            let sourceEditor = window.visibleTextEditors.find(e => e.document.uri.fsPath === sourceFsPath); // find current sourceEditor for original source fsPath
            
            if(!sourceEditor)                                                                               // source editor valid?
                return null;                                                                                // no, break
                           
            let funcDoc = this._funcDocs.get(editor.document.uri.toString());                               // stored value for funcList file is funcDoc            
            funcDoc.update(editor, edit, sortSwitch);                                                       // update or toggle sort                      
        }

        return editor;
    }

    private decodeFsPath(uri: Uri): string
    {
        let [target, line, character] = <[string, number, number]>JSON.parse(uri.query);
        return decodeURIComponent(Uri.parse(target).toString()).split('///').pop().replace(/\//gi, "\\");
    }    
}

//------------------------------------------------------------------------------

let seq = 0;

export function encodeLocation(uri: Uri, pos: Position): Uri 
{
    const query = JSON.stringify([uri.toString(), pos.line, pos.character]);
    const tabCaption = decodeURIComponent(uri.fsPath).split('\\').pop();
	return Uri.parse(`${Provider.scheme}:(${tabCaption})?${query}#${seq++}`);
}

export function decodeLocation(uri: Uri): [Uri, Position] 
{    
	let [target, line, character] = <[string, number, number]>JSON.parse(uri.query);
	return [Uri.parse(target), new Position(line, character)];
}

// delay - for executing posSourceSelTarget
// block - to block trailing selection events after posSourceSelTarget
//
class Timer
{
    private end = 0;

    start(callback, delay, block) 
    {
        this.end = new Date().getTime() + delay + block;
        setTimeout(callback, delay);
    }

    timeLeft()
    {
        let left = this.end - new Date().getTime();
        return left>0 ? left : 0;
    }
}

//------------------------------------------------------------------------------

// regular execution order causing loops and repositioning of source document on contextMenuCommand
//
// click symbol -> onDidChangeTextEditorSelection
// context menu -> onDidChangeTextEditorSelection - contextMenuCommand - [onDidChangeTextDocument]
// edit text    -> [onDidChangeTextDocument] - onDidChangeTextEditorSelection
//
//              -> onDidChangeTextEditorSelection - contextMenuCommand - [onDidChangeTextDocument]
//                                                |_______delay________- posSourceSelTarget -> onDidChangeTextEditorSelection ...
//                                                                     |_______________________block__________________________|
//

//------------------------------------------------------------------------------

// sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0));

// for newDocument(), check for existing scheme document and return it
// 
// let doc = vscode.workspace.textDocuments.find(doc => doc.uri.scheme === Provider.scheme);
//
// if(doc != null)
//     return vscode.window.showTextDocument(doc, editor.viewColumn + 1);        

// getFunctionlist with line number references
//
// private getFunctionList(doc: vscode.TextDocument)
// {
//     let config = workspace.getConfiguration('funcList');                
// 
//     let searchFilter = this.stringRegExp(config.get("searchFilter"));
//     let displayfilter = this.stringRegExp(config.get("displayFilter"));
//     this._sortList = config.get("sortList");
// 
//     let docContent = doc.getText();
//     let lines = docContent.split("\r\n"); 
// 
//     let lineMap = new Map<string, number>();     
// 
//     lines.forEach((line, i) => {
//         let result = line.match(searchFilter);
// 
//         if(result)
//             lineMap.set(result[0].match(displayfilter)[0], i);
//     });
// 
//     return this._sortList ? new Map(Array.from(lineMap).sort()) : lineMap;
// }

// private quickPick()
// {
//     let items: vscode.QuickPickItem[] = [];
// 
//     items.push({ label: "toUpper", description: "Convert [aBc] to [ABC]" });
//     items.push({ label: "toLower", description: "Convert [aBc] to [abc]" });
//     items.push({ label: "swapCase", description: "Convert [aBc] to [AbC]" });
// 
//     vscode.window.showQuickPick(items).then(selection => {
//         // the user canceled the selection
//         if(!selection){
//             return;
//         }
// 
//         // the user selected some item. You could use `selection.name` too
//         switch(selection.description){
//             case "toUpper": 
//                 break;
// 
//             case "toLower": 
//                 break;
// 
//             default:
//                 break;
//         }
//     });
// }

// vscode.workspace.openTextDocument(vscode.Uri.parse("untitled:" + vscode.workspace.rootPath + "\\(projectmanifest.ts)"))
// .then(doc => window.showTextDocument(doc, vscode.ViewColumn.Two));        

// getDocument(vsEditor) 
// {
//     return typeof vsEditor._documentData!=='undefined' ? vsEditor._documentData : vsEditor._document
// }

// let target_editor = workspace.openTextDocument(target_uri)
// .then(doc => window.showTextDocument(doc, editor.viewColumn + 1));
// 
// let functionList = this.getFunctionList(editor.document, this._docSort);
// 
// let document = new FunctionsDocument(target_uri, functionList, this._docSort, this._onDidChange);
// let docval: docVal = { func: functionList, doc: document, sort: this._docSort };
// this._funcDocs.set(target_uri.toString(), docval);        
// 
// return target_editor;

// function stateChange(newState) {
//     setTimeout(function () {
//         if (newState == -1) {
//             alert('VIDEO HAS STOPPED');
//         }
//     }, 5000);
// }

//import * as fs from "fs";

// private setReadOnly(doc: vscode.TextDocument)
// {
//     let filePath = doc.fileName;
// 
//     try{
//         fs.chmodSync(filePath, 0o444);
//     } 
//     catch(error){
//     }
// }

// private setReadWrite(doc: vscode.TextDocument)
// {
//     let filePath = doc.fileName;
// 
//     try{
//         fs.chmodSync(filePath, 0o666);
//     } 
//     catch(error){
//     }
// }

// private isReadOnly(doc: vscode.TextDocument): Boolean 
// {
//     let filePath = doc.fileName;
// 
//     try{
//         fs.accessSync(filePath, fs.constants.W_OK);
//         return false;
//     } 
//     catch(error){
//         return true;
//     }
// }
