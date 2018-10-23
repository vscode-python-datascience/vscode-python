// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { CodeLens, Command, Range, TextDocument, window } from 'vscode';
import { ICommandManager } from '../../common/application/types';
import { ContextKey } from '../../common/contextKey';
import * as localize from '../../common/utils/localize';
import { Commands, EditorContexts, RegExpValues } from '../constants';
import { ICodeWatcher, IHistoryProvider } from '../types';

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
    constructor(@inject(IHistoryProvider) private historyProvider: IHistoryProvider,
        @inject(ICommandManager) private readonly commandManager: ICommandManager) {
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
        const cells = this.getCells(document);

        this.codeLenses = [];
        cells.forEach(cell => {
            const cmd: Command = {
                arguments: [this, cell.range],
                title: localize.DataScience.runCellLensCommandTitle(),
                command: Commands.RunCell
            };
            this.codeLenses.push(new CodeLens(cell.range, cmd));
        });
    }

    public async runCell(range: Range) {
        const activeHistory = await this.historyProvider.getOrCreateHistory();
        if (this.document) {
            const code = this.document.getText(range);
            await activeHistory.addCode(code, this.getFileName(), range.start.line, window.activeTextEditor);
        }
    }

    public async runCurrentCell() {
        if (!window.activeTextEditor || !window.activeTextEditor.document) {
            return;
        }

        for (const lens of this.codeLenses) {
            // Check to see which lens range overlaps the current selection start
            if (lens.range.contains(window.activeTextEditor.selection.start)) {
                await this.runCell(lens.range);
                break;
            }
        }
    }

    // Implmentation of getCells here based on Don's Jupyter extension work
    private getCells(document: TextDocument): ICell[] {
        const cellIdentifier: RegExp = RegExpValues.PythonCellMarker;
        const editorContext = new ContextKey(EditorContexts.HasCodeCells, this.commandManager);

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

        // Inform the editor context that we have cells
        editorContext.set(cells.length > 0);
        return cells;
    }
}
