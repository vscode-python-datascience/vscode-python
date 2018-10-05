import { inject, injectable } from 'inversify';
import { CodeLens } from 'vscode';
import { ICodeWatcher } from "./types";
import { IServiceContainer } from '../ioc/types';

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

@injectable()
export class CodeWatcher implements ICodeWatcher {
    public fileName: string;
    public documentVersion: number;
    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer) {
    }

    public getCodeLenses() {
        const lenses: CodeLens[] = [];
        return lenses;
    }

    public addFile(fileName: string, documentVersion: number) {
        // IANHU TODO: can we do this in the conststructor instead?
        this.fileName = fileName;
        this.documentVersion = documentVersion;
    }
}