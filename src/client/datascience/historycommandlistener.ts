// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { IApplicationShell, ICommandManager } from '../common/application/types';
import { IDisposableRegistry } from '../common/types';
import { IDataScienceCommandListener } from './types';
import { IServiceContainer } from '../ioc/types';
import { Commands } from './constants';

@injectable()
export class HistoryCommandListener implements IDataScienceCommandListener {
    private readonly appShell: IApplicationShell;
    private readonly disposableRegistry: IDisposableRegistry;
    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer)
    {
        this.appShell = this.serviceContainer.get<IApplicationShell>(IApplicationShell);
        this.disposableRegistry = this.serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        this.showHistoryPane = this.showHistoryPane.bind(this);
    }

    public register(commandManager: ICommandManager): void {
        const disposable = commandManager.registerCommand(Commands.ShowHistoryPane, this.showHistoryPane);
        this.disposableRegistry.push(disposable);
    }

    private showHistoryPane() : void {
        
    }
}
