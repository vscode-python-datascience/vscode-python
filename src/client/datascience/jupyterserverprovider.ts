// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { IFileSystem } from '../common/platform/types';
import { IJupyterServer, IJupyterServerProvider } from './types';
import { JupyterServer } from './jupyterServer';

@injectable()
export class JupyterServerProvider implements IJupyterServerProvider {

    @inject(IFileSystem)
    private fileSystem: IFileSystem;

    public async start(notebookFile? : string): Promise<IJupyterServer> {
        const server = new JupyterServer(this.fileSystem);
        await server.start(notebookFile);
        return server;
    }
}
