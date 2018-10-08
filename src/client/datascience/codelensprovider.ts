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
        vscode.CodeLens[] {
            // First check to see if we already have a watcher here
            const index = this.activeCodeWatchers.findIndex(item => item.getFileName() === document.fileName);
            if (index >= 0) {
                const item = this.activeCodeWatchers[index];
                if (item.getVersion() === document.version) {
                    return item.getCodeLenses();
                }
                // If the version is different remove it from the active list
                this.activeCodeWatchers.splice(index, 1);
            }

            // Create a new watcher for this file
            const newCodeWatcher = this.serviceContainer.get<ICodeWatcher>(ICodeWatcher);
            newCodeWatcher.addFile(document);
            this.activeCodeWatchers.push(newCodeWatcher);
            return newCodeWatcher.getCodeLenses();
    }
}
