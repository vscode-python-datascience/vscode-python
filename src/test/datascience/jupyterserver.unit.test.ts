// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import * as TypeMoq from 'typemoq';
import { Disposable } from 'vscode';
import { PlatformService } from '../../client/common/platform/platformService';
import { IFileSystem, IPlatformService } from '../../client/common/platform/types';
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
    let platformService : IPlatformService;

    setup(() => {
        serviceContainer = TypeMoq.Mock.ofType<IServiceContainer>();
        fileSystem = TypeMoq.Mock.ofType<IFileSystem>();
        platformService = new PlatformService();
        logger = TypeMoq.Mock.ofType<ILogger>();
        fileSystem.setup(f => f.getFileHash(TypeMoq.It.isAny())).returns(() => Promise.resolve('42'));
        // tslint:disable-next-line:no-empty
        logger.setup(l => l.logInformation(TypeMoq.It.isAny())).returns((m) => {}); // console.log(m)); // REnable this to debug the server
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IDisposableRegistry), TypeMoq.It.isAny())).returns(() => disposables);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IFileSystem), TypeMoq.It.isAny())).returns(() => fileSystem.object);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(ILogger), TypeMoq.It.isAny())).returns(() => logger.object);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IPlatformService), TypeMoq.It.isAny())).returns(() => platformService);
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
        if (await serverProvider.isSupported()) {
            const server = await serverProvider.start();
            if (!server) {
                assert.fail('Server not created');
            }
        } else {
            // tslint:disable-next-line:no-console
            console.log('Creation test skipped, no Jupyter installed');
        }
    }).timeout(60000);

    test('Execution', async () => {
        if (await serverProvider.isSupported()) {
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
        } else {
            // tslint:disable-next-line:no-console
            console.log('Execution test skipped, no Jupyter installed');
        }
    }).timeout(60000);

});
