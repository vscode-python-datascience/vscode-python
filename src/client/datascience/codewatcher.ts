// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { CodeLens, Command, Range, TextDocument } from 'vscode';
import { Commands, RegExpValues } from './constants';
import { ICodeWatcher, IHistoryProvider } from './types';

export interface ICell {
    range: Range;
    title: string;
}

@injectable()
export class CodeWatcher implements ICodeWatcher {
    private document?: TextDocument;
    private version: number = -1;
    private fileName: string = '';
    private codeLenses: CodeLens[] = [];
    constructor(@inject(IHistoryProvider) private historyProvider: IHistoryProvider) {
    }

    // Implmentation of getCells here based on Don's Jupyter extension work
    // Note, there is code here for setting editor context on which files have cells or not in Don's code
    public static getCells(document: TextDocument): ICell[] {
        const cellIdentifier: RegExp = RegExpValues.PythonCellMarker;

        const cells: ICell[] = [];
        for (let index = 0; index < document.lineCount; index += 1) {
            const line = document.lineAt(index);
            // clear regex cache
            cellIdentifier.lastIndex = -1;
            if (cellIdentifier.test(line.text)) {
                const results = cellIdentifier.exec(line.text);
                if (cells.length > 0) {
                    const previousCell = cells[cells.length - 1];
                    previousCell.range = new Range(previousCell.range.start, document.lineAt(index - 1).range.end);
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
            previousCell.range = new Range(previousCell.range.start, line.range.end);
        }

        return cells;
    }

    public getFileName() {
        return this.fileName;
    }

    public getVersion() {
        return this.version;
    }

    public getCodeLenses() {
        return this.codeLenses;
    }

    public addFile(document: TextDocument) {
        this.document = document;

        // Cache these, we don't want to pull an old version if the document is updated
        this.fileName = document.fileName;
        this.version = document.version;

        // Get document cells here
        const cells = CodeWatcher.getCells(document);

        this.codeLenses = [];
        cells.forEach(cell => {
            const cmd: Command = {
                arguments: [this, cell.range],
                title: 'Run cell',
                command: Commands.RunCell
            };
            this.codeLenses.push(new CodeLens(cell.range, cmd));
        });
    }

    public async runCell(range: Range) {
        const activeHistory = await this.historyProvider.getOrCreateHistory();
        if (this.document) {
            const code = this.document.getText(range);
            await activeHistory.addCode(code, this.getFileName(), range.start.line);
        }
    }
}
