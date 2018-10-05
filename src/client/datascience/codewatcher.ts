// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { injectable } from 'inversify';
import { CodeLens } from 'vscode';
import { ICodeWatcher } from './types';

@injectable()
export class CodeWatcher implements ICodeWatcher {
    public fileName: string = ''; // IANHU Don't init here
    public documentVersion: number = 0;
    private codeLenses: CodeLens[] = [];
    //constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer) {
    //}

    public getCodeLenses() {
        return this.codeLenses;
    }

    public addFile(fileName: string, documentVersion: number) {
        // IANHU: can we do this in the constructor instead?
        this.fileName = fileName;
        this.documentVersion = documentVersion;
    }

    public addCodeLenses(newLenses: CodeLens[]) {
        this.codeLenses = newLenses;
    }
}
