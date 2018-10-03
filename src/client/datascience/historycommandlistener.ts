// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { IApplicationShell, ICommandManager } from '../common/application/types';
import { IDisposableRegistry } from '../common/types';
import { IDataScienceCommandListener } from './types';
import { IServiceContainer } from '../ioc/types';
import { Commands } from './constants';
import { History } from './history';

@injectable()
export class HistoryCommandListener implements IDataScienceCommandListener {
    private readonly appShell: IApplicationShell;
    private readonly disposableRegistry: IDisposableRegistry;
    private readonly serviceContainer: IServiceContainer;

    constructor(@inject(IServiceContainer) private svcContainer: IServiceContainer)
    {
        this.serviceContainer = svcContainer;
        this.appShell = this.serviceContainer.get<IApplicationShell>(IApplicationShell);
        this.disposableRegistry = this.serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        this.showHistoryPane = this.showHistoryPane.bind(this);
    }

    public register(commandManager: ICommandManager): void {
        const disposable = commandManager.registerCommand(Commands.ShowHistoryPane, this.showHistoryPane.bind(this));
        this.disposableRegistry.push(disposable);
    }

    private showHistoryPane() : void {
        const active = History.getOrCreateActive(this.serviceContainer);
        active.show().ignoreErrors();
    }
}
