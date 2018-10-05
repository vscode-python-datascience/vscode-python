// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { IFileSystem, IPlatformService } from '../common/platform/types';
import { IDisposableRegistry, ILogger } from '../common/types';
import { IServiceContainer } from '../ioc/types';
import { JupyterProcess } from './jupyterProcess';
import { JupyterServer } from './jupyterServer';
import { IJupyterServer, IJupyterServerProvider } from './types';

@injectable()
export class JupyterServerProvider implements IJupyterServerProvider {

    private fileSystem: IFileSystem;
    private disposableRegistry: IDisposableRegistry;
    private logger: ILogger;
    private platformService: IPlatformService;

    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer) {
        this.fileSystem = this.serviceContainer.get<IFileSystem>(IFileSystem);
        this.disposableRegistry = this.serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        this.logger = this.serviceContainer.get<ILogger>(ILogger);
        this.platformService = this.serviceContainer.get<IPlatformService>(IPlatformService);
    }

    public async start(notebookFile? : string): Promise<IJupyterServer> {
        const server = new JupyterServer(this.fileSystem, this.logger);
        this.disposableRegistry.push(server);
        await server.start(notebookFile);
        return server;
    }

    public isSupported() : Promise<boolean> {
        return JupyterProcess.exists(this.platformService);
    }
}
