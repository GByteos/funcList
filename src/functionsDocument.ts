'use strict';

import * as vscode from 'vscode';
import { workspace, window } from 'vscode';
// import { stringRegExp } from './provider';

export default class FunctionsDocument
{
    readonly NUM_SORTS = 2;
    
    private _sourceDoc: vscode.TextDocument;
    private _targetDoc: vscode.TextDocument;    
	private _functionList: Map<string, {native: string, num: number, index: number}>;
    private _sort: number = 0;

	private _lines: string[];

    constructor(sourceDoc: vscode.TextDocument, targetDoc: vscode.TextDocument)
    {
        this._sourceDoc = sourceDoc;                                               
        this._targetDoc = targetDoc;                                               
        
        let config = workspace.getConfiguration('funcList');                        // get config
        let sort = +config.get("sortList");                                         // default sort for new FuncDoc

        this._functionList = this.getFunctionList();                                // get function list     
        this.sortFunctionList(sort);                                                // sort it if necessary

        this.populate(null);                                                        // populate target
	}

    public getNative(index)
    {
        return Array.from(this._functionList.values())[index].native;               // stored native match
    }

    public update(editor, edit, sortSwitch)
    {
        let posSel = new vscode.Position(0, 0);                                     // jump to first line        
        let selection = new vscode.Selection(posSel, posSel);                       // no selection
        let range = new vscode.Range(posSel, posSel);
        editor.revealRange(range);          
        editor.selection = selection;                

        if(sortSwitch){  
            let sort = this._sort;                                                  // switchSort
            sort = ++sort>=this.NUM_SORTS ? 0 : sort;                               // switch sort            
            this.sortFunctionList(sort);                                            // sort 
        }
        else{                                                                       // refresh
            this._functionList = this.getFunctionList();                            //         funcList
            let sort = this._sort;                                                  // save current sort
            this._sort = 0;                                                         // reset sort 
            this.sortFunctionList(sort);                                            // sort
        }

        this.populate(edit);                                                        // populate target            
    }

    private populate(edit) 
    {
        this._lines = [`(${this._functionList.size} matches, ${this._sort ? 'sorted' : 'unsorted'})\n`];

        this._functionList.forEach((value, display) => {
            this._lines.push(display + (value.num==1 ? "" : ` (${value.num})`));
        });

        applyEdit(this._targetDoc, edit, {start: {line: 0, char: 0}, end: {line: Number.MAX_SAFE_INTEGER, char: 0}}, this._lines.join('\n'));           
    }

    private getFunctionList()
    {
        let config = workspace.getConfiguration('funcList');                        // get config
        let nativeFilter = stringRegExp(config.get("nativeFilter"));                // native  filter

        let grin = { value: 0 };                                                    // group index
        let displayFilter = stringRegExp(config.get("displayFilter"), grin);        // display 

        let docContent = this._sourceDoc.getText();                                 // get doc text
        let native = docContent.match(nativeFilter);                                // nativeFind array    
        
        let map = new Map<string, { native: string, num: number, index: number }>();    // displayFind, { nativeFind, numFind, findIndex }

        if(native){
            let i = 0;                                                              // findIndex

            native.forEach(native => {
                let display = native.match(displayFilter)[grin.value];              // display filter
                let value = map.get(display);                                       // get { nativeFind, numFind }
                
                if(value)                                                           // existing { nativeFind, numFind }
                    value.num++;
                else                                                                // initial
                    map.set(display, { native: native, num: 1, index: i++ });
            });
        }

        return map;
    }

    private sortFunctionList(sort: number)
    {
        if(sort == this._sort)                                                      // no sort necessary
            return;
        else if(sort == 0)                                                          // sort value, index
            this._functionList = new Map(Array.from(this._functionList).sort((a, b) => a[1].index - b[1].index)); 
        else if(sort == 1)                                                          // sort key, display
            this._functionList = new Map(Array.from(this._functionList).sort());    
        
        this._sort = sort;                                                          // update
    }
}

function stringRegExp(s: string, grin?: { value: number } ): RegExp
{
    let flags: string = s.replace(/.*\/([gimy0-9]*)$/, '$1');
    let pattern: string = s.replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');

    if(grin){
        let p = flags.search(/\d/);

        if(p != undefined){
            grin.value = +flags.substr(p, 1);
            flags = flags.replace(/[0-9]/, '');
        }
    }

    return new RegExp(pattern, flags);    
}

function applyEdit(doc, edit: vscode.TextEditorEdit, coords, content)
{    
    let start = new vscode.Position(coords.start.line, coords.start.char);
    let end = new vscode.Position(coords.end.line, coords.end.char);
    let range = new vscode.Range(start, end);   
    
    if(edit){
        edit.replace(range, content);        
    }
    else{
        let wedit = new vscode.TextEdit(range, content);                    
        let workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(doc.uri, [wedit]);
        workspace.applyEdit(workspaceEdit);    
    }
}
