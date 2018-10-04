// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { IFileSystem } from '../common/platform/types';
import { IDisposableRegistry, ILogger } from '../common/types';
import { IServiceContainer } from '../ioc/types';
import { JupyterServer } from './jupyterServer';
import { IJupyterServer, IJupyterServerProvider } from './types';

@injectable()
export class JupyterServerProvider implements IJupyterServerProvider {

    private fileSystem: IFileSystem;
    private disposableRegistry: IDisposableRegistry;
    private logger: ILogger;

    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer) {
        this.fileSystem = this.serviceContainer.get<IFileSystem>(IFileSystem);
        this.disposableRegistry = this.serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        this.logger = this.serviceContainer.get<ILogger>(ILogger);
    }

    public async start(notebookFile? : string): Promise<IJupyterServer> {
        const server = new JupyterServer(this.fileSystem, this.logger);
        this.disposableRegistry.push(server);
        await server.start(notebookFile);
        return server;
    }
}
