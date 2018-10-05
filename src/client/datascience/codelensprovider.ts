// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import * as vscode from 'vscode';
import { IServiceContainer } from '../ioc/types';
import { ICodeWatcher, IDataScienceCodeLensProvider } from './types';

@injectable()
export class DataScienceCodeLensProvider implements IDataScienceCodeLensProvider {
    private activeCodeWatchers: ICodeWatcher[] = [];
    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer)
    {
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
            // Create a new watcher for this file
            // IANHU: Can the get here handle constructor parameters so we don't need the init call?
            const newCodeWatcher = this.serviceContainer.get<ICodeWatcher>(ICodeWatcher);
            newCodeWatcher.addFile(document.fileName, document.version);
            this.activeCodeWatchers.push(newCodeWatcher);
            return Promise.resolve(newCodeWatcher.getCodeLenses());
    }

    public resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken):
        vscode.CodeLens | Thenable<vscode.CodeLens> {
            // Need to hook up our command here
            return codeLens;
    }
}
