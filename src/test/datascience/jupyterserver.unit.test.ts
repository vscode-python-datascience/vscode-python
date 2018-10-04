// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import * as TypeMoq from 'typemoq';
import { Disposable } from 'vscode';
import { IFileSystem } from '../../client/common/platform/types';
import { IDisposableRegistry, ILogger } from '../../client/common/types';
import { JupyterServerProvider } from '../../client/datascience/jupyterServerProvider';
import { IJupyterServerProvider } from '../../client/datascience/types';
import { IServiceContainer } from '../../client/ioc/types';

suite('Jupyter server tests', () => {
    let fileSystem: TypeMoq.IMock<IFileSystem>;
    let logger: TypeMoq.IMock<ILogger>;
    let serviceContainer: TypeMoq.IMock<IServiceContainer>;
    const disposables: Disposable[] = [];
    let serverProvider: IJupyterServerProvider;

    setup(() => {
        serviceContainer = TypeMoq.Mock.ofType<IServiceContainer>();
        fileSystem = TypeMoq.Mock.ofType<IFileSystem>();
        logger = TypeMoq.Mock.ofType<ILogger>();
        fileSystem.setup(f => f.getFileHash(TypeMoq.It.isAny())).returns(() => Promise.resolve('42'));
        // tslint:disable-next-line:no-empty
        logger.setup(l => l.logInformation(TypeMoq.It.isAny())).returns((m) => {}); // console.log(m)); // REnable this to debug the server
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IDisposableRegistry), TypeMoq.It.isAny())).returns(() => disposables);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IFileSystem), TypeMoq.It.isAny())).returns(() => fileSystem.object);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(ILogger), TypeMoq.It.isAny())).returns(() => logger.object);
        serverProvider = new JupyterServerProvider(serviceContainer.object);
    });

    teardown(() => {
        disposables.forEach(disposable => {
            if (disposable) {
                disposable.dispose();
            }
        });
    });

    test('Creation', async () => {
        const server = await serverProvider.start();
        if (!server) {
            assert.fail('Server not created');
        }
    }).timeout(60000);

    test('Execution', async () => {
        const server = await serverProvider.start();
        if (!server) {
            assert.fail('Server not created');
        }
        let statusCount: number = 0;
        server.onStatusChanged((bool: boolean) => {
            statusCount += 1;
        });
        const cell = await server.execute('a = 1\r\na', 'foo.py', 2);
        assert.equal(cell.output, '1', 'Cell not correct');
        assert.equal(statusCount, 2, 'Status wasnt updated');
    }).timeout(60000);

});
