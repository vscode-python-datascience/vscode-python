// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { IFileSystem } from '../common/platform/types';
import { IJupyterServer, IJupyterServerProvider } from './types';
import { JupyterServer } from './jupyterServer';
import { IDisposableRegistry } from '../common/types';
import { IServiceContainer } from '../ioc/types';

@injectable()
export class JupyterServerProvider implements IJupyterServerProvider {

    private fileSystem: IFileSystem;
    private disposableRegistry: IDisposableRegistry;

    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer) {
        this.fileSystem = serviceContainer.get<IFileSystem>(IFileSystem);
        this.disposableRegistry = serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
    }

    public async start(notebookFile? : string): Promise<IJupyterServer> {
        const server = new JupyterServer(this.fileSystem);
        this.disposableRegistry.push(server);
        await server.start(notebookFile);
        return server;
    }
}
