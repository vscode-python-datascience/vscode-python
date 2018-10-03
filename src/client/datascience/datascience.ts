// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { IApplicationShell, ICommandManager } from '../common/application/types';
import { IDisposableRegistry } from '../common/types';
import { IServiceContainer } from '../ioc/types';
import { IDataScience, IDataScienceCommandListener } from './types';

@injectable()
export class DataScience implements IDataScience {
    private readonly appShell: IApplicationShell;
    private readonly commandManager: ICommandManager;
    private readonly disposableRegistry: IDisposableRegistry;
    private readonly commandListeners: IDataScienceCommandListener[];
    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer)
    {
        this.appShell = this.serviceContainer.get<IApplicationShell>(IApplicationShell);
        this.commandManager = this.serviceContainer.get<ICommandManager>(ICommandManager);
        this.disposableRegistry = this.serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        this.commandListeners = this.serviceContainer.getAll<IDataScienceCommandListener>(IDataScienceCommandListener);
    }

    public async activate(): Promise<void> {
        this.registerCommands();
    }

    private registerCommands(): void {
        this.commandListeners.forEach((listener: IDataScienceCommandListener) => {
            listener.register(this.commandManager);
        })
    }
}
