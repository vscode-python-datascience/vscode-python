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
        let disposable = commandManager.registerCommand(Commands.ShowHistoryPane, this.showHistoryPane.bind(this));
        this.disposableRegistry.push(disposable);
        disposable = commandManager.registerCommand(Commands.TestHistoryPane, this.testHistoryPane.bind(this));
    }

    private showHistoryPane() : Promise<void> {
        const active = History.getOrCreateActive(this.serviceContainer);
        return active.show();
    }

    private async testHistoryPane() : Promise<void> {
        await this.showHistoryPane();

        const active = History.getOrCreateActive(this.serviceContainer);
        await active.addCell('a=1\r\na', 'foo', 2);
    }
}
