// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import * as vscode from 'vscode';
import { IServiceContainer } from '../ioc/types';
import { Commands } from './constants';
import { EditorContextKey } from './editorcontextkey';
import { ICodeWatcher, IDataScienceCodeLensProvider } from './types';

// IANHU Move
export interface ICell {
    range: vscode.Range;
    title: string;
}

@injectable()
export class DataScienceCodeLensProvider implements IDataScienceCodeLensProvider {
    private activeCodeWatchers: ICodeWatcher[] = [];
    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer)
    {
    }

    public static getCells(document: vscode.TextDocument): ICell[] {
        //let language = document.languageId;
        const editorCtx = new EditorContextKey('jupyter.document.hasCodeCells');
        //let cellIdentifier = LanguageProviders.cellIdentifier(language);
        //if (!cellIdentifier || !(cellIdentifier instanceof RegExp)) {
            //editorCtx.set(false);
            //return [];
        //}
        const cellIdentifier: RegExp = new RegExp('^(#\\s*%%|#\\s*\\<codecell\\>|#\\s*In\\[\\d*?\\]|#\\s*In\\[ \\])(.*)');

        const cells: ICell[] = [];
        for (let index = 0; index < document.lineCount; index += 1) {
            const line = document.lineAt(index);
            // clear regex cache
            cellIdentifier.lastIndex = -1;
            if (cellIdentifier.test(line.text)) {
                const results = cellIdentifier.exec(line.text);
                if (cells.length > 0) {
                    const previousCell = cells[cells.length - 1];
                    previousCell.range = new vscode.Range(previousCell.range.start, document.lineAt(index - 1).range.end);
                }

                if (results !== null) {
                    cells.push({
                        range: line.range,
                        title: results.length > 1 ? results[2].trim() : ''
                    });
                }
            }
        }

        if (cells.length >= 1) {
            const line = document.lineAt(document.lineCount - 1);
            const previousCell = cells[cells.length - 1];
            previousCell.range = new vscode.Range(previousCell.range.start, line.range.end);
        }

        editorCtx.set(cells.length > 0);
        return cells;
    }

    // CodeLensProvider interface
    // Some implementation based on DonJayamanne's jupyter extension work
    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken):
        vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
            // First see if we already are watching this file
            const index = this.activeCodeWatchers.findIndex(item => item.fileName === document.fileName);
            if (index >= 0) {
                const item = this.activeCodeWatchers[index];
                if (item.documentVersion === document.version) {
                    return Promise.resolve(item.getCodeLenses());
                }
                // If the version is different remove it from the active list
                this.activeCodeWatchers.splice(index, 1);
            }

            // Get cells here
            const cells = DataScienceCodeLensProvider.getCells(document);
            if (cells.length === 0) {
                return Promise.resolve([]);
            }

            // IANHU: Move into code watcher?
            const lenses: vscode.CodeLens[] = [];
            cells.forEach(cell => {
                const cmd: vscode.Command = {
                    arguments: [document, cell.range],
                    title: 'Run cell',
                    command: Commands.RunCell
                };
                lenses.push(new vscode.CodeLens(cell.range, cmd));
            });

            // Create a new watcher for this file
            // IANHU: Can the get here handle constructor parameters so we don't need the init call?
            const newCodeWatcher = this.serviceContainer.get<ICodeWatcher>(ICodeWatcher);
            newCodeWatcher.addFile(document.fileName, document.version);
            newCodeWatcher.addCodeLenses(lenses);
            this.activeCodeWatchers.push(newCodeWatcher);
            return Promise.resolve(newCodeWatcher.getCodeLenses());
    }

    public resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken):
        vscode.CodeLens | Thenable<vscode.CodeLens> {
            // Need to hook up our command here
            return codeLens;
    }

}
