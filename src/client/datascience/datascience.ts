// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import * as vscode from 'vscode';
import { IApplicationShell, ICommandManager } from '../common/application/types';
import { PYTHON } from '../common/constants';
import { IDisposableRegistry, IExtensionContext } from '../common/types';
import { IServiceContainer } from '../ioc/types';
import { Commands } from './constants';
import { IDataScience, IDataScienceCodeLensProvider, IDataScienceCommandListener } from './types';

@injectable()
export class DataScience implements IDataScience {
    private readonly appShell: IApplicationShell;
    private readonly commandManager: ICommandManager;
    private readonly disposableRegistry: IDisposableRegistry;
    private readonly extensionContext: IExtensionContext;
    private readonly dataScienceCodeLensProvider: IDataScienceCodeLensProvider;
    private readonly commandListeners: IDataScienceCommandListener[];
    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer)
    {
        this.appShell = this.serviceContainer.get<IApplicationShell>(IApplicationShell);
        this.commandManager = this.serviceContainer.get<ICommandManager>(ICommandManager);
        this.disposableRegistry = this.serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        this.extensionContext = this.serviceContainer.get<IExtensionContext>(IExtensionContext);
        this.dataScienceCodeLensProvider = this.serviceContainer.get<IDataScienceCodeLensProvider>(IDataScienceCodeLensProvider);
        this.commandListeners = this.serviceContainer.getAll<IDataScienceCommandListener>(IDataScienceCommandListener);
    }

    public async activate(): Promise<void> {
        this.registerCommands();

        // IANHU: Check if we need a dispose here. Seems like no, per jedi registration
        this.extensionContext.subscriptions.push(
            vscode.languages.registerCodeLensProvider(
                PYTHON, this.dataScienceCodeLensProvider
            )
        );
    }

    private registerCommands(): void {
        this.commandListeners.forEach((listener: IDataScienceCommandListener) => {
            listener.register(this.commandManager);
        })
    }
}
