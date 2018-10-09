// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { ICommandManager } from '../common/application/types';
import { IDisposableRegistry } from '../common/types';
import { IServiceContainer } from '../ioc/types';
import { Commands } from './constants';
import { IDataScienceCommandListener, IHistoryProvider } from './types';

@injectable()
export class HistoryCommandListener implements IDataScienceCommandListener {
    private readonly disposableRegistry: IDisposableRegistry;
    private readonly historyProvider : IHistoryProvider;

    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer)
    {
        this.historyProvider = this.serviceContainer.get<IHistoryProvider>(IHistoryProvider);
        this.disposableRegistry = this.serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        this.showHistoryPane = this.showHistoryPane.bind(this);
    }

    public register(commandManager: ICommandManager): void {
        let disposable = commandManager.registerCommand(Commands.ShowHistoryPane, this.showHistoryPane.bind(this));
        this.disposableRegistry.push(disposable);
        disposable = commandManager.registerCommand(Commands.TestHistoryPane, this.testHistoryPane.bind(this));
        this.disposableRegistry.push(disposable);
    }

    private async showHistoryPane() : Promise<void> {
        const active = await this.historyProvider.getOrCreateHistory();
        return active.show();
    }

    private async testHistoryPane() : Promise<void> {
        await this.showHistoryPane();

        const active = await this.historyProvider.getOrCreateHistory();
        await active.addCode('a=1\r\na', 'foo', 2);
    }
}
